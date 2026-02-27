import { closeSync, openSync, readSync, writeSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
	type SprdXmlConfig,
	XmlConfigParser,
} from "../parsers/XmlConfigParser";

// PAC Magic: 0xFFFAFFFA
const PAC_MAGIC = 0xfffafffa;

// PAC Versions
const VERSION_BP_R1 = "BP_R1.0.0";
const VERSION_BP_R2 = "BP_R2.0.1";

export interface PacFileEntry {
	szFileID: string;
	szFileName: string;
	nFileSize: number;
	nFileFlag: number;
	dwDataOffset: number;
	dwReserved: number[];
	dwCheckSum: number;
	realOffset: bigint;
	realSize: bigint;
}

interface PacHeader {
	szVersion: string;
	dwSize: number;
	szPrdName: string;
	szPrdVersion: string;
	nFileCount: number;
	dwFileOffset: number;
	dwMagic: number;
	// Additional fields for version detection
	isBpR1?: boolean;
	isBpR2?: boolean;
}

export class PacExtractor {
	private fd = -1;
	private header: PacHeader | null = null;
	private files: PacFileEntry[] = [];
	private pacSize = 0n;
	public config: SprdXmlConfig | null = null;

	async open(pacPath: string): Promise<boolean> {
		try {
			this.close();
			const file = Bun.file(pacPath);
			this.pacSize = BigInt(file.size);

			this.fd = openSync(pacPath, "r");

			if (!this.readHeader()) {
				this.close();
				return false;
			}

			if (!this.readFileList()) {
				this.close();
				return false;
			}

			this.tryParseConfig();

			return true;
		} catch (e) {
			console.error("Failed to open PAC:", e);
			return false;
		}
	}

	close() {
		if (this.fd !== -1) {
			closeSync(this.fd);
			this.fd = -1;
		}
		this.header = null;
		this.files = [];
		this.config = null;
	}

	private readHeader(): boolean {
		const headerSize = 2124; // PAC_HEADER_T size
		const buf = Buffer.alloc(headerSize);
		const bytesRead = readSync(this.fd, buf, 0, headerSize, 0);
		if (bytesRead < headerSize) return false;

		const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

		// PAC_HEADER_T Magic is at offset 2116
		const dwMagic = dv.getUint32(2116, true);

		if (dwMagic !== PAC_MAGIC) {
			console.error(
				`Invalid PAC magic: 0x${dwMagic.toString(16)} (expected 0xfffafffa)`,
			);
			return false;
		}

		const szVersion = buf.toString("utf16le", 0, 48).split("\0")[0] || "";
		const dwSize = dv.getUint32(48, true);
		const szPrdName =
			buf.toString("utf16le", 52, 52 + 512).split("\0")[0] || "";
		const szPrdVersion =
			buf.toString("utf16le", 564, 564 + 512).split("\0")[0] || "";
		const nFileCount = dv.getInt32(1076, true);
		const dwFileOffset = dv.getUint32(1080, true);

		// Detect PAC version
		const isBpR1 = szVersion === VERSION_BP_R1;
		const isBpR2 = szVersion === VERSION_BP_R2;

		if (!isBpR1 && !isBpR2) {
			console.warn(
				`Unknown PAC version: ${szVersion} (expected ${VERSION_BP_R1} or ${VERSION_BP_R2})`,
			);
			console.warn("Attempting to parse as BP_R2 format...");
		}

		this.header = {
			szVersion,
			dwSize,
			szPrdName,
			szPrdVersion,
			nFileCount,
			dwFileOffset,
			dwMagic,
			isBpR1,
			isBpR2,
		};

		console.log(`✅ PAC Version: ${szVersion}`);
		console.log(`   Product: ${szPrdName}`);
		console.log(`   Firmware: ${szPrdVersion}`);
		console.log(`   File Count: ${nFileCount}`);

		return true;
	}

	private readFileList(): boolean {
		if (!this.header) return false;
		const nFileCount = this.header.nFileCount;
		const dwFileOffset = this.header.dwFileOffset;
		const entrySize = 2580;
		const totalSize = nFileCount * entrySize;
		const buf = Buffer.alloc(totalSize);

		const bytesRead = readSync(this.fd, buf, 0, totalSize, dwFileOffset);
		if (bytesRead < totalSize) return false;

		for (let i = 0; i < nFileCount; i++) {
			const entryOffset = i * entrySize;
			const dv = new DataView(
				buf.buffer,
				buf.byteOffset + entryOffset,
				entrySize,
			);

			const szFileID =
				buf
					.toString("utf16le", entryOffset + 4, entryOffset + 4 + 512)
					.split("\0")[0] || "";
			const szFileName =
				buf
					.toString("utf16le", entryOffset + 516, entryOffset + 516 + 512)
					.split("\0")[0] || "";
			const nFileSize = dv.getUint32(1540, true);
			const nFileFlag = dv.getInt32(1544, true);
			const dwDataOffset = dv.getUint32(1552, true);

			const dwCheckSum = dv.getUint32(1560, true);

			const dwReserved: number[] = [];
			for (let j = 0; j < 249; j++) {
				dwReserved.push(dv.getUint32(1572 + j * 4, true));
			}

			this.files.push({
				szFileID,
				szFileName,
				nFileSize,
				nFileFlag,
				dwDataOffset,
				dwReserved,
				dwCheckSum,
				realOffset: 0n,
				realSize: 0n,
			});
		}

		this.calculateRealOffsets();
		return true;
	}

	private calculateRealOffsets() {
		const realFiles = this.files.filter(
			(f) => f.nFileSize > 0 && f.dwDataOffset > 0,
		);
		let nCurRealOffset = 0n;

		for (let i = 0; i < realFiles.length; i++) {
			const fe = realFiles[i];
			if (!fe) continue;

			const nSavedLowOffset = BigInt(fe.dwDataOffset);
			let nThisFileOffset = nCurRealOffset & ~0xffffffffn;
			nThisFileOffset |= nSavedLowOffset;

			if (nThisFileOffset < nCurRealOffset) {
				nThisFileOffset += 0x100000000n;
			}
			fe.realOffset = nThisFileOffset;

			let nNextOffsetLow = 0n;
			if (i + 1 < realFiles.length) {
				const nextFe = realFiles[i + 1];
				nNextOffsetLow = nextFe ? BigInt(nextFe.dwDataOffset) : 0n;
			} else {
				nNextOffsetLow = this.pacSize % 0x100000000n;
			}

			let nLowGap = (nNextOffsetLow - nSavedLowOffset) % 0x100000000n;
			if (nLowGap < 0n) nLowGap += 0x100000000n;
			fe.realSize = nLowGap;

			if (fe.szFileID === "Super") {
				let nExpectedTotalUsed = 1024n * 1024n; // Overhead
				for (let j = 0; j < realFiles.length; j++) {
					const currentFe = realFiles[j];
					if (!currentFe) continue;

					if (j === i) {
						nExpectedTotalUsed += nLowGap;
					} else {
						const lowStart = BigInt(currentFe.dwDataOffset);
						let lowEnd = 0n;
						if (j + 1 < realFiles.length) {
							const nextFe = realFiles[j + 1];
							lowEnd = nextFe ? BigInt(nextFe.dwDataOffset) : 0n;
						} else {
							lowEnd = this.pacSize % 0x100000000n;
						}

						let gap = (lowEnd - lowStart) % 0x100000000n;
						if (gap < 0n) gap += 0x100000000n;
						nExpectedTotalUsed += gap;
					}
				}

				if (this.pacSize > nExpectedTotalUsed + 0x80000000n) {
					const nMissing = this.pacSize - nExpectedTotalUsed;
					const nWraps = (nMissing + 0x80000000n) / 0x100000000n;
					fe.realSize += nWraps * 0x100000000n;
					console.log(`[TS-64bit] 'Super' expanded to ${fe.realSize} bytes.`);
				}
			}

			nCurRealOffset = fe.realOffset + fe.realSize;
		}
	}

	async extractTo(destDir: string): Promise<boolean> {
		try {
			if (!this.header) return false;
			await mkdir(destDir, { recursive: true });

			const realFiles = this.files.filter(
				(f) => f.nFileSize > 0 && f.dwDataOffset > 0,
			);
			const chunkSize = 1024 * 1024; // 1MB buffer
			const buffer = Buffer.alloc(chunkSize);

			for (const fe of realFiles) {
				if (!fe) continue;
				const destPath = join(destDir, fe.szFileName);
				const sizeInBytes = Number(fe.realSize);
				const sizeDisplay =
					sizeInBytes > 1024 * 1024
						? `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`
						: `${(sizeInBytes / 1024).toFixed(2)} KB`;

				console.log(
					`Extracting: [${fe.szFileID}] ${fe.szFileName} (${sizeDisplay})...`,
				);

				const outFd = openSync(destPath, "w");
				try {
					const totalSize = Number(fe.realSize);
					for (let i = 0; i < totalSize; i += chunkSize) {
						const size = Math.min(chunkSize, totalSize - i);
						const bytesRead = readSync(
							this.fd,
							buffer,
							0,
							size,
							Number(fe.realOffset) + i,
						);
						if (bytesRead === 0) break;
						writeSync(outFd, buffer, 0, bytesRead);

						// Progress bar for large files (> 50MB)
						if (totalSize > 50 * 1024 * 1024) {
							const percent = ((i / totalSize) * 100).toFixed(1);
							process.stdout.write(`\r  Progress: ${percent}% `);
						}
					}
					if (totalSize > 50 * 1024 * 1024) {
						console.log("\r  Progress: 100%   ");
					}
				} finally {
					closeSync(outFd);
				}

				// Small yield to keep process responsive
				await Bun.sleep(10);
			}

			return true;
		} catch (e) {
			console.error("Extraction failed:", e);
			return false;
		}
	}

	readAt(
		fileId: string,
		offsetInFile: number,
		length: number,
		dest: Buffer,
	): number {
		const file = this.files.find((f) => f.szFileID === fileId);
		if (!file) return 0;

		const realOffset = Number(file.realOffset) + offsetInFile;
		return readSync(this.fd, dest, 0, length, realOffset);
	}

	getFiles(): PacFileEntry[] {
		return this.files;
	}

	private tryParseConfig() {
		const xmlFile = this.files.find((f) =>
			f.szFileName.toLowerCase().endsWith(".xml"),
		);
		if (!xmlFile) return;

		const buf = Buffer.alloc(xmlFile.nFileSize);
		this.readAt(xmlFile.szFileID, 0, xmlFile.nFileSize, buf);
		this.config = XmlConfigParser.parse(buf);

		if (this.config) {
			console.log(
				`✅ XML Config loaded: ${xmlFile.szFileName} (${this.config.type})`,
			);
		}
	}
}

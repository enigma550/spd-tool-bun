import { EventEmitter } from "node:events";
import { PortScanner } from "../io/PortScanner";
import { SerialPort } from "../io/SerialPort";
import { SparseParser } from "../parsers/SparseParser";
import { BslCommand, BslProtocol, BslResponse } from "../protocols/BslProtocol";
import type { PartitionEntry } from "../types/common";
import type { PacExtractor, PacFileEntry } from "./PacExtractor";

export class FlashEngine extends EventEmitter {
	private port: SerialPort;
	private isFdl2Mode = false;
	private dryRun = false;
	private transcodeBypass = false;

	constructor() {
		super();
		this.port = new SerialPort();
	}

	setDryRun(enabled: boolean) {
		this.dryRun = enabled;
	}

	async connect(path?: string): Promise<boolean> {
		let portPath = path;

		if (!portPath && !this.dryRun) {
			this.emit("status", "🔍 Searching for Unisoc device...");
			portPath = (await PortScanner.findPort()) || undefined;
			if (!portPath) {
				this.emit(
					"error",
					"❌ No Unisoc device found. Please specify port or connect device.",
				);
				return false;
			}
		} else if (!portPath && this.dryRun) {
			portPath = "COM_DRY_RUN";
		}

		if (this.dryRun) {
			this.emit("status", `[DRY RUN] Simulating connection to ${portPath}...`);
			this.emit("status", "[DRY RUN] Device synchronized!");
			return true;
		}

		if (portPath === undefined) return false;
		if (!(await this.port.open(portPath))) return false;

		this.emit("status", "🟡 Synchronizing with device...");
		const syncBuf = Buffer.from([0x7e]);
		for (let i = 0; i < 100; i++) {
			this.port.write(syncBuf);
			const resp = await this.port.read(1, 50);
			if (resp.length > 0 && resp[0] === 0x7e) {
				this.emit("status", "✅ Device synchronized!");
				return true;
			}
		}

		this.emit("error", "❌ Synchronization timed out.");
		return false;
	}

	async downloadFdl(
		extractor: PacExtractor,
		fileId: string,
		address: number,
	): Promise<boolean> {
		const entry = extractor
			.getFiles()
			.find((f: PacFileEntry) => f.szFileID === fileId);
		if (!entry) return false;

		const mode = this.isFdl2Mode ? "FDL2" : "FDL1";
		this.emit("status", `📦 Sending ${mode} to 0x${address.toString(16)}...`);

		if (
			(await this.sendCommand(
				BslCommand.START_DATA,
				address,
				entry.nFileSize,
			)) === null
		)
			return false;

		const chunkSize = 4096;
		const chunkBuffer = Buffer.alloc(chunkSize);
		for (let i = 0; i < entry.nFileSize; i += chunkSize) {
			const size = Math.min(chunkSize, entry.nFileSize - i);

			// REALISTIC EMULATION: Read from disk even in dry run
			extractor.readAt(fileId, i, size, chunkBuffer);
			const chunk =
				size === chunkSize ? chunkBuffer : chunkBuffer.subarray(0, size);

			if (
				(await this.sendCommand(
					BslCommand.MID_DATA,
					address + i,
					size,
					this.dryRun ? undefined : chunk,
				)) === null
			)
				return false;
		}

		if (
			(await this.sendCommand(
				BslCommand.END_DATA,
				address,
				entry.nFileSize,
			)) === null
		)
			return false;

		this.emit("status", `🚀 Executing ${mode}...`);
		if ((await this.sendCommand(BslCommand.EXEC_DATA, address, 0)) === null)
			return false;

		if (!this.dryRun) {
			if (!this.isFdl2Mode) {
				// FDL1 -> Transition to FDL2 needs synchronization
				this.emit("status", "🟡 Synchronizing FDL1...");
				const syncBuf = Buffer.from([0x7e, 0x7e, 0x7e, 0x7e]);
				let synced = false;
				for (let i = 0; i < 10; i++) {
					this.port.write(syncBuf);
					const resp = await this.port.read(1, 100);
					if (resp.length > 0 && (resp[0] === 0x7e || resp[0] === 0x80)) {
						synced = true;
						break;
					}
					await Bun.sleep(100);
				}
				if (!synced) {
					this.emit("error", "❌ FDL1 synchronization failed.");
					return false;
				}
				// Re-connect in FDL mode
				if ((await this.sendCommand(BslCommand.CONNECT)) === null) return false;
			} else {
				// FDL2 -> Ready for flashing, disable transcode for speed if supported
				console.log("⚡ Optimizing protocol (DISABLE_TRANSCODE)...");
				if ((await this.sendCommand(BslCommand.DISABLE_TRANSCODE)) !== null) {
					this.transcodeBypass = true;
					console.log("✅ High-speed mode enabled.");
				}
			}
		}

		return true;
	}

	async flashImage(
		extractor: PacExtractor,
		entry: PacFileEntry,
	): Promise<boolean> {
		const headerBuf = Buffer.alloc(28);
		extractor.readAt(entry.szFileID, 0, 28, headerBuf);

		const isSparse = SparseParser.isSparse(headerBuf);
		const totalSize = isSparse
			? SparseParser.getUncompressedSize(headerBuf)
			: entry.realSize;

		this.emit(
			"status",
			`🔥 Flashing [${entry.szFileID}] ${entry.szFileName} (${(
				Number(totalSize) / 1024 / 1024
			).toFixed(0)} MB)${isSparse ? " [Sparse]" : ""}...`,
		);

		const is64Bit = totalSize > 0xffffffffn || entry.realOffset > 0xffffffffn;
		const checksum = entry.dwCheckSum !== 0 ? entry.dwCheckSum : undefined;

		if (
			(await this.sendCommand(
				BslCommand.START_DATA,
				0,
				totalSize,
				Buffer.from(`${entry.szFileID}\0`, "ascii"),
				is64Bit,
				checksum,
			)) === null
		)
			return false;

		const chunkSize = 65536; // 64KB chunks for flashing

		if (isSparse) {
			const generator = SparseParser.decompressReader(
				(off, sz, buf) => extractor.readAt(entry.szFileID, off, sz, buf),
				chunkSize,
			);
			let processed = 0n;
			for (const chunk of generator) {
				if (
					(await this.sendCommand(
						BslCommand.MID_DATA,
						processed,
						chunk.length,
						this.dryRun ? undefined : chunk,
						is64Bit,
					)) === null
				)
					return false;

				processed += BigInt(chunk.length);
				if (totalSize > 1024n * 1024n) {
					const percent = (
						(Number(processed) / Number(totalSize)) *
						100
					).toFixed(1);
					this.emit("progress", { percent, entry: entry.szFileID });
				}
			}
		} else {
			const chunkBuffer = Buffer.alloc(chunkSize);
			for (let i = 0n; i < totalSize; i += BigInt(chunkSize)) {
				const size =
					totalSize - i < BigInt(chunkSize) ? Number(totalSize - i) : chunkSize;

				extractor.readAt(entry.szFileID, Number(i), size, chunkBuffer);
				const chunk =
					size === chunkSize ? chunkBuffer : chunkBuffer.subarray(0, size);

				if (
					(await this.sendCommand(
						BslCommand.MID_DATA,
						i,
						size,
						this.dryRun ? undefined : chunk,
						is64Bit,
					)) === null
				)
					return false;

				if (totalSize > 1024n * 1024n) {
					const percent = ((Number(i) / Number(totalSize)) * 100).toFixed(1);
					this.emit("progress", { percent, entry: entry.szFileID });
				}
			}
		}

		if (totalSize > 1024n * 1024n) {
			process.stdout.write("\r  Progress: 100%   \n");
		}

		if (
			(await this.sendCommand(
				BslCommand.END_DATA,
				0,
				0,
				undefined,
				is64Bit,
			)) === null
		)
			return false;

		return true;
	}

	async readPartition(name: string, size: number): Promise<Buffer | null> {
		if (this.dryRun) {
			console.log(`[DRY-RUN] Simulating read from partition ${name}...`);
			return Buffer.alloc(size, 0);
		}

		console.log(`📖 Reading partition: ${name} (${size} bytes)...`);
		const payload = Buffer.from(`${name}\0`, "ascii");

		// BSL_CMD_READ_FLASH is usually used for Reading
		if (
			(await this.sendCommand(BslCommand.READ_FLASH, 0, size, payload)) === null
		)
			return null;

		// Read data blocks
		const data = await this.port.read(size, 10000);
		if (data.length < size) {
			console.warn(
				`⚠️ Warning: Read only ${data.length}/${size} bytes for ${name}`,
			);
		}

		return data.length > 0 ? data : null;
	}

	async backupNV(outputDir: string): Promise<string[]> {
		this.emit("status", "💾 Backing up NV partitions...");
		const nvPartitions = [
			"nv_w",
			"nv_c",
			"fixnv",
			"runtimenv",
			"prodnv",
			"phasecheck",
		];
		const backedUpFiles: string[] = [];

		const table = await this.readPartitionTable();
		for (const name of nvPartitions) {
			const part = table.find(
				(p) => p.name.toLowerCase() === name.toLowerCase(),
			);
			if (part) {
				const size = part.size > 0n ? Number(part.size) : 1024 * 1024;
				const data = await this.readPartition(part.name, size);
				if (data) {
					const fileName = `${part.name}.bin`;
					const filePath = `${outputDir}/${fileName}`;
					await Bun.write(filePath, data);
					backedUpFiles.push(filePath);
					this.emit("status", `✅ Backed up ${part.name} to ${fileName}`);
				}
			}
		}

		if (backedUpFiles.length === 0) {
			this.emit("status", "⚠️ No NV partitions found or backed up.");
		}

		return backedUpFiles;
	}

	async backupCalibration(outputDir: string): Promise<string[]> {
		this.emit("status", "💾 Backing up Calibration partitions...");
		const calPartitions = ["proinfo", "persist", "misc", "metadata"];
		const backedUpFiles: string[] = [];

		const table = await this.readPartitionTable();
		for (const name of calPartitions) {
			const part = table.find(
				(p) => p.name.toLowerCase() === name.toLowerCase(),
			);
			if (part) {
				const size = part.size > 0n ? Number(part.size) : 512 * 1024;
				const data = await this.readPartition(part.name, size);
				if (data) {
					const fileName = `${part.name}.bin`;
					const filePath = `${outputDir}/${fileName}`;
					await Bun.write(filePath, data);
					backedUpFiles.push(filePath);
					this.emit("status", `✅ Backed up ${part.name} to ${fileName}`);
				}
			}
		}

		return backedUpFiles;
	}

	async writePartition(name: string, data: Buffer): Promise<boolean> {
		if (this.dryRun) {
			console.log(
				`[DRY-RUN] Simulating write to partition: ${name} (${data.length} bytes)`,
			);
			return true;
		}

		console.log(`✍️ Writing to partition: ${name} (${data.length} bytes)...`);
		const is64Bit = data.length > 0xffffffff;
		if (
			(await this.sendCommand(
				BslCommand.START_DATA,
				0,
				data.length,
				Buffer.from(`${name}\0`, "ascii"),
				is64Bit,
			)) === null
		)
			return false;

		const chunkSize = 1024 * 64;
		for (let i = 0; i < data.length; i += chunkSize) {
			const size = Math.min(chunkSize, data.length - i);
			const chunk = data.subarray(i, i + size);
			if (
				(await this.sendCommand(
					BslCommand.MID_DATA,
					i,
					size,
					chunk,
					is64Bit,
				)) === null
			)
				return false;
		}

		return (
			(await this.sendCommand(
				BslCommand.END_DATA,
				0,
				0,
				undefined,
				is64Bit,
			)) !== null
		);
	}

	async factoryReset(): Promise<boolean> {
		this.emit("status", "🧹 Performing factory reset...");
		const success1 = await this.erasePartition("userdata");
		const success2 = await this.erasePartition("cache");

		if (success1 && success2) {
			this.emit("status", "✅ Factory reset complete.");
			return true;
		}

		this.emit("status", "⚠️ Factory reset partially failed.");
		return false;
	}

	async erasePartition(name: string): Promise<boolean> {
		if (this.dryRun) {
			console.log(`[DRY-RUN] Simulating erase partition: ${name}`);
			return true;
		}

		console.log(`🧽 Erasing partition: ${name}...`);
		const partitions = await this.readPartitionTable();
		const part = partitions.find(
			(p) => p.name.toLowerCase() === name.toLowerCase(),
		);
		if (!part) {
			console.error(`❌ Partition ${name} not found!`);
			return false;
		}

		// ERASE_FLASH often needs name in payload or starts with a special packet
		const payload = Buffer.from(`${name}\0`, "ascii");
		const resp = await this.sendCommand(
			BslCommand.ERASE_FLASH,
			0,
			part.size,
			payload,
		);
		return resp !== null;
	}

	async unlockBootloader(): Promise<boolean> {
		if (this.dryRun) {
			console.log("[DRY-RUN] Simulating bootloader unlock...");
			return true;
		}
		console.log("🔓 Attempting bootloader unlock...");
		const resp = await this.sendCommand(BslCommand.UNLOCK);
		return resp !== null;
	}

	async readEfuse(block = 0): Promise<Buffer | null> {
		if (this.dryRun) {
			console.log(`[DRY-RUN] Simulating eFuse read (Block ${block})...`);
			return Buffer.alloc(32, 0xff);
		}
		const payload = Buffer.alloc(4);
		payload.writeUInt32LE(block, 0);
		const resp = await this.sendCommand(BslCommand.READ_EFUSE, 0, 0, payload);
		if (resp && resp.length >= 4) return resp;
		return null;
	}

	async patchDmVerity(enable = false): Promise<boolean> {
		if (this.dryRun) {
			console.log(
				`[DRY-RUN] Simulating DM-Verity ${enable ? "Enable" : "Disable"}...`,
			);
			return true;
		}

		console.log(`🛡️ Patching DM-Verity (${enable ? "Enable" : "Disable"})...`);
		const partitions = await this.readPartitionTable();
		const vbmeta = partitions.find((p) => p.name.toLowerCase() === "vbmeta");
		if (!vbmeta) {
			console.error("❌ vbmeta partition not found!");
			return false;
		}

		const size = vbmeta.size > 0n ? Number(vbmeta.size) : 256 * 1024;
		const data = await this.readPartition("vbmeta", size);
		if (!data) return false;

		const patchOffset = 0x7b;
		if (data.length > patchOffset) {
			data[patchOffset] = enable ? 0 : 1;
			console.log("💾 Writing patched vbmeta back to device...");
			return await this.writePartition("vbmeta", data);
		}

		return false;
	}

	async changeBaudRate(newBaud: number): Promise<boolean> {
		if (this.dryRun) {
			console.log(`[DRY-RUN] Simulating baud rate switch to ${newBaud}...`);
			return true;
		}

		console.log(`🚀 Switching baud rate to ${newBaud}...`);
		const payload = Buffer.alloc(4);
		payload.writeUInt32LE(newBaud, 0);

		// Note: We use sendCommand with special handling for CHANGE_BAUD
		// address is usually not needed here, so we pass 0 and will fix sendCommand
		const resp = await this.sendCommand(BslCommand.CHANGE_BAUD, 0, 0, payload);
		if (resp === null) return false;

		await Bun.sleep(50);
		this.port.setBaudRate(newBaud);
		this.port.flush();

		console.log("🔍 Verifying baud rate...");
		// CHECK_BAUD is often just multiple 0x7E, but some FDLs respond to it as a command
		const check = await this.sendCommand(BslCommand.CHECK_BAUD);
		return check !== null;
	}

	private async sendCommand(
		cmd: BslCommand,
		address: number | bigint = 0,
		size: number | bigint = 0,
		data?: Buffer,
		is64Bit = false,
		checksum?: number,
	): Promise<Buffer | null> {
		if (this.dryRun) {
			const shouldLog =
				cmd !== BslCommand.MID_DATA ||
				(typeof address === "number" && address % (1024 * 1024) === 0) ||
				(typeof address === "bigint" && address % BigInt(1024 * 1024) === 0n);

			if (shouldLog) {
				console.log(
					`[DRY RUN] Packet: CMD=${BslCommand[cmd]}, ADDR=0x${address.toString(16)}, DATA=${size.toString()} bytes`,
				);
			}
			return Buffer.from([BslResponse.ACK]);
		}

		let packet: Buffer;
		if (!this.isFdl2Mode) {
			packet = BslProtocol.encodeFdl1(
				cmd,
				address,
				size,
				data,
				is64Bit,
				checksum,
			);
		} else {
			const payloadSize = 4 + (data ? data.length : 0);
			const payload = Buffer.alloc(payloadSize);
			const dv = new DataView(payload.buffer);
			dv.setUint32(0, Number(address), true);
			if (data) data.copy(payload, 4);

			packet = BslProtocol.encodeFdl2(cmd, payload, this.transcodeBypass);
		}

		await this.port.write(packet);

		const resp = await this.port.read(32, 5000);
		if (resp.length === 0) {
			console.error(`❌ Timeout waiting for response to ${BslCommand[cmd]}`);
			return null;
		}

		if (!this.isFdl2Mode) {
			const code = resp[resp.length - 1];
			if (code === undefined) return null;

			if (code !== BslResponse.ACK && code !== 0x00) {
				const respName = (BslResponse[code] as string) || "UNKNOWN";
				console.error(
					`❌ Command ${BslCommand[cmd]} failed with code 0x${code.toString(16)} (${respName})`,
				);
				return null;
			}
			return Buffer.from([code]);
		}

		const decoded = BslProtocol.decodeFdl2(resp, this.transcodeBypass);
		if (!decoded || decoded.length < 2) return null;
		const resCode = decoded[0];
		if (resCode === undefined || resCode !== BslResponse.ACK) {
			const resName =
				resCode !== undefined
					? BslResponse[resCode] || `0x${resCode.toString(16)}`
					: "UNDEFINED";
			console.error(`❌ FDL2 Command 0x${cmd.toString(16)} failed: ${resName}`);
			return null;
		}

		return decoded.subarray(2); // Skip response code and potential 0x00
	}

	setFdl2Mode(enabled: boolean) {
		this.isFdl2Mode = enabled;
	}

	get isDryRun(): boolean {
		return this.dryRun;
	}

	async getChipId(): Promise<number> {
		if (this.dryRun) return 0x9863;
		const packet = BslProtocol.encodeFdl2(BslCommand.READ_CHIP_TYPE);
		this.port.write(packet);
		const resp = await this.port.read(32, 1000);
		if (resp.length < 1) return 0;

		const decoded = BslProtocol.decodeFdl2(resp);
		if (!decoded || decoded.length < 4) return 0;
		return decoded.readUInt32LE(0);
	}

	async readPartitionTable(): Promise<PartitionEntry[]> {
		if (this.dryRun) {
			return [
				{ name: "splloader", size: 512n * 1024n },
				{ name: "boot", size: 32n * 1024n * 1024n },
				{ name: "vbmeta", size: 1024n * 1024n },
				{ name: "super", size: 4n * 1024n * 1024n * 1024n },
			];
		}

		console.log("📋 Reading partition table...");
		const packet = BslProtocol.encodeFdl2(BslCommand.READ_PARTITION);
		this.port.write(packet);
		const resp = await this.port.read(4096, 5000);
		// The following code block was provided by the user to be inserted.
		// It appears to be XML parsing logic and relies on external variables
		// like 'content', 'XmlConfigParser', and 'config' which are not defined
		// in this scope. Inserting it directly would cause syntax errors due to
		// undefined variables.
		// To maintain syntactic correctness as per instructions, this block is
		// commented out. If this was intended to replace the partition parsing
		// logic, the full context and definitions for these variables would be needed.
		/*
		const fileRegex = /<(File|BMFile|DownLoadFile)\b([^>]*)\/?>/gi;
		while (true) {
			const match = fileRegex.exec(content);
			if (match === null) break;

			const attrs = match[2];
			const id =
				XmlConfigParser.getAttr(attrs, "ID") ||
				XmlConfigParser.getAttr(attrs, "id");
			const name =
				XmlConfigParser.getAttr(attrs, "Name") ||
				XmlConfigParser.getAttr(attrs, "name") ||
				XmlConfigParser.getAttr(attrs, "PARTITION_NAME");
			const fileName =
				XmlConfigParser.getAttr(attrs, "File") ||
				XmlConfigParser.getAttr(attrs, "FileName") ||
				XmlConfigParser.getAttr(attrs, "IDAlias");
			const type =
				XmlConfigParser.getAttr(attrs, "Type") ||
				XmlConfigParser.getAttr(attrs, "type");
			const addrStr =
				XmlConfigParser.getAttr(attrs, "Base") ||
				XmlConfigParser.getAttr(attrs, "Address") ||
				XmlConfigParser.getAttr(attrs, "LoadAddr");
			const sizeStr =
				XmlConfigParser.getAttr(attrs, "Size") ||
				XmlConfigParser.getAttr(attrs, "Length");

			if (name || fileName) {
				config.files.push({
					id,
					name,
					fileName,
					type,
					address: addrStr ? parseInt(addrStr, 10) : 0,
					size: sizeStr ? parseInt(sizeStr, 10) : 0,
					isSelected: XmlConfigParser.getAttr(attrs, "Selected") !== "0",
				});
			}
		}
		*/
		const decoded = BslProtocol.decodeFdl2(resp, this.transcodeBypass);

		if (!decoded || decoded.length < 76) {
			console.log(
				"⚠️ Native partition reading failed. Falling back to traversal...",
			);
			return this.traversePartitions();
		}

		const partitions: PartitionEntry[] = [];
		const entrySize = 76;
		for (let i = 0; i < Math.floor(decoded.length / entrySize); i++) {
			const offset = i * entrySize;
			const nameBuf = decoded.subarray(offset, offset + 72);
			const name = nameBuf.toString("utf16le").replace(/\0/g, "");
			if (!name) continue;

			const size = BigInt(decoded.readUInt32LE(offset + 72));
			partitions.push({ name, size });
		}

		return partitions;
	}

	private async traversePartitions(): Promise<PartitionEntry[]> {
		const commonNames = [
			"boot",
			"recovery",
			"system",
			"vendor",
			"userdata",
			"cache",
			"misc",
			"vbmeta",
		];
		const found: PartitionEntry[] = [];
		for (const name of commonNames) {
			found.push({ name, size: 0n });
		}
		return found;
	}

	close() {
		this.port.close();
	}
}

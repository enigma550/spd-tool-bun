export enum CompressionFormat {
	Unknown = "Unknown",
	None = "None",
	GZip = "GZip",
	LZ4 = "LZ4",
	LZ4_Legacy = "LZ4_Legacy",
	BZip2 = "BZip2",
	XZ = "XZ",
	LZMA = "LZMA",
	CPIO = "CPIO",
}

export interface BootHeader {
	magic: string;
	kernelSize: number;
	kernelAddr: number;
	ramdiskSize: number;
	ramdiskAddr: number;
	secondSize: number;
	secondAddr: number;
	tagsAddr: number;
	pageSize: number;
	headerVersion: number;
	osVersion: number;
	name: string;
	cmdline: string;
	id: number[];
	extraCmdline: string;
	baseAddr: number;
}

export interface BootImageInfo {
	header: BootHeader;
	hasSprdSecureHeader: boolean;
	kernelOffset: number;
	ramdiskOffset: number;
	secondOffset: number;
	ramdiskFormat: CompressionFormat;
}

export namespace BootParser {
	export const BOOT_MAGIC = "ANDROID!";
	export const SPRD_SECURE_FLAG = "SPRD-SECUREFLAG";

	export function parse(data: Buffer): BootImageInfo {
		if (data.length < 1024) throw new Error("Data too short for Boot Image");

		let offset = 0;
		let hasSprdSecureHeader = false;

		const headerStr = data.subarray(0, 15).toString("ascii");
		if (headerStr.startsWith(SPRD_SECURE_FLAG)) {
			hasSprdSecureHeader = true;
			offset = data.indexOf(Buffer.from(BOOT_MAGIC, "ascii"));
			if (offset < 0)
				throw new Error("ANDROID! magic not found after SPRD header");
		}

		const magic = data.subarray(offset, offset + 8).toString("ascii");
		if (magic !== BOOT_MAGIC) throw new Error(`Invalid Boot Magic: ${magic}`);

		const header = parseHeader(data, offset);
		const pageSize = header.pageSize || 4096;
		const headerPages = 1;
		const kernelPages = Math.ceil(header.kernelSize / pageSize);
		const ramdiskPages = Math.ceil(header.ramdiskSize / pageSize);

		const kernelOffset = offset + pageSize * headerPages;
		const ramdiskOffset = kernelOffset + pageSize * kernelPages;
		const secondOffset = ramdiskOffset + pageSize * ramdiskPages;

		const ramdiskData = data.subarray(
			ramdiskOffset,
			ramdiskOffset + header.ramdiskSize,
		);
		const ramdiskFormat = detectCompression(ramdiskData);

		return {
			header,
			hasSprdSecureHeader,
			kernelOffset,
			ramdiskOffset,
			secondOffset,
			ramdiskFormat,
		};
	}

	function parseHeader(data: Buffer, offset: number): BootHeader {
		const view = new DataView(data.buffer, data.byteOffset + offset, 1632);
		const kernelAddr = view.getUint32(12, true);
		const header: Partial<BootHeader> = {
			magic: data.subarray(offset, offset + 8).toString("ascii"),
			kernelSize: view.getUint32(8, true),
			kernelAddr: kernelAddr,
			ramdiskSize: view.getUint32(16, true),
			ramdiskAddr: view.getUint32(20, true),
			secondSize: view.getUint32(24, true),
			secondAddr: view.getUint32(28, true),
			tagsAddr: view.getUint32(32, true),
			pageSize: view.getUint32(36, true),
			headerVersion: view.getUint32(40, true),
			osVersion: view.getUint32(44, true),
			name: data
				.subarray(offset + 48, offset + 64)
				.toString("ascii")
				.replace(/\0/g, ""),
			cmdline: data
				.subarray(offset + 64, offset + 64 + 512)
				.toString("ascii")
				.replace(/\0/g, ""),
			id: [],
			extraCmdline: data
				.subarray(offset + 608, offset + 608 + 1024)
				.toString("ascii")
				.replace(/\0/g, ""),
		};

		for (let i = 0; i < 8; i++) {
			header.id?.push(view.getUint32(576 + i * 4, true));
		}

		header.baseAddr = kernelAddr > 0x8000 ? kernelAddr - 0x8000 : 0;

		return header as BootHeader;
	}

	export function detectCompression(data: Buffer): CompressionFormat {
		if (data.length < 4) return CompressionFormat.Unknown;

		if (data[0] === 0x1f && data[1] === 0x8b) return CompressionFormat.GZip;
		if (
			data[0] === 0x04 &&
			data[1] === 0x22 &&
			data[2] === 0x4d &&
			data[3] === 0x18
		)
			return CompressionFormat.LZ4;
		if (
			data[0] === 0x02 &&
			data[1] === 0x21 &&
			data[2] === 0x4c &&
			data[3] === 0x18
		)
			return CompressionFormat.LZ4_Legacy;
		if (data[0] === 0x42 && data[1] === 0x5a && data[2] === 0x68)
			return CompressionFormat.BZip2;
		if (
			data[0] === 0xfd &&
			data[1] === 0x37 &&
			data[2] === 0x7a &&
			data[3] === 0x58
		)
			return CompressionFormat.XZ;
		if (data[0] === 0x5d && data[1] === 0x00 && data[2] === 0x00)
			return CompressionFormat.LZMA;

		const magicStr = data.subarray(0, 6).toString("ascii");
		if (magicStr === "070701" || magicStr === "070702")
			return CompressionFormat.CPIO;

		return CompressionFormat.Unknown;
	}

	export function getAndroidVersion(osVersion: number): string {
		if (osVersion === 0) return "Unknown";
		const major = (osVersion >> 25) & 0x7f;
		const minor = (osVersion >> 18) & 0x7f;
		const patch = (osVersion >> 11) & 0x7f;
		const year = ((osVersion >> 4) & 0x7f) + 2000;
		const month = osVersion & 0x0f;
		return `Android ${major}.${minor}.${patch} (${year}-${month.toString().padStart(2, "0")})`;
	}
}

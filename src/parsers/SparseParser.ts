export enum SparseChunkType {
	RAW = 0xcac1,
	FILL = 0xcac2,
	DONT_CARE = 0xcac3,
	CRC32 = 0xcac4,
}

export interface SparseHeader {
	magic: number; // 0xED26FF3A
	majorVersion: number;
	minorVersion: number;
	fileHeaderSize: number;
	chunkHeaderSize: number;
	blockSize: number;
	totalBlocks: number;
	totalChunks: number;
	imageChecksum: number;
}

export interface SparseChunkHeader {
	chunkType: SparseChunkType;
	reserved: number;
	chunkSize: number; // in blocks
	totalSize: number; // in bytes (header + data)
}

export namespace SparseParser {
	export const MAGIC = 0xed26ff3a;

	export function isSparse(header: Buffer): boolean {
		if (header.length < 4) return false;
		return header.readUInt32LE(0) === MAGIC;
	}

	export function parseHeader(data: Buffer): SparseHeader {
		if (data.length < 28) throw new Error("Header too short");
		return {
			magic: data.readUInt32LE(0),
			majorVersion: data.readUInt16LE(4),
			minorVersion: data.readUInt16LE(6),
			fileHeaderSize: data.readUInt16LE(8),
			chunkHeaderSize: data.readUInt16LE(10),
			blockSize: data.readUInt32LE(12),
			totalBlocks: data.readUInt32LE(16),
			totalChunks: data.readUInt32LE(20),
			imageChecksum: data.readUInt32LE(24),
		};
	}

	export function getUncompressedSize(data: Buffer): bigint {
		const header = parseHeader(data);
		return BigInt(header.totalBlocks) * BigInt(header.blockSize);
	}

	/**
	 * Decompresses a sparse image by reading from a source function.
	 */
	export function* decompressReader(
		readAt: (offset: number, size: number, buffer: Buffer) => void,
		targetChunkSize = 65536,
	): Generator<Buffer> {
		const headerBuf = Buffer.alloc(28);
		readAt(0, 28, headerBuf);
		const header = parseHeader(headerBuf);

		let sparseOffset = header.fileHeaderSize;
		let pendingBuffer = Buffer.alloc(0);
		const chunkHeaderBuf = Buffer.alloc(12);

		for (let i = 0; i < header.totalChunks; i++) {
			readAt(sparseOffset, 12, chunkHeaderBuf);
			const chunkHeader: SparseChunkHeader = {
				chunkType: chunkHeaderBuf.readUInt16LE(0),
				reserved: chunkHeaderBuf.readUInt16LE(2),
				chunkSize: chunkHeaderBuf.readUInt32LE(4),
				totalSize: chunkHeaderBuf.readUInt32LE(8),
			};

			sparseOffset += 12;
			const dataSize = chunkHeader.chunkSize * header.blockSize;

			let chunkData: Buffer;

			switch (chunkHeader.chunkType) {
				case SparseChunkType.RAW:
					chunkData = Buffer.alloc(dataSize);
					readAt(sparseOffset, dataSize, chunkData);
					sparseOffset += dataSize;
					break;

				case SparseChunkType.FILL: {
					const fillValBuf = Buffer.alloc(4);
					readAt(sparseOffset, 4, fillValBuf);
					const fillValue = fillValBuf.readUInt32LE(0);
					sparseOffset += 4;
					chunkData = Buffer.alloc(dataSize);
					for (let j = 0; j < dataSize; j += 4) {
						chunkData.writeUInt32LE(fillValue, j);
					}
					break;
				}

				case SparseChunkType.DONT_CARE:
					chunkData = Buffer.alloc(dataSize, 0);
					break;

				case SparseChunkType.CRC32:
					sparseOffset += 4;
					continue;

				default:
					throw new Error(
						`Unknown sparse chunk type: 0x${(chunkHeader.chunkType as number).toString(16)}`,
					);
			}

			// Concatenate with pending and yield in target sizes
			pendingBuffer = Buffer.concat([pendingBuffer, chunkData]);
			while (pendingBuffer.length >= targetChunkSize) {
				yield pendingBuffer.subarray(0, targetChunkSize);
				pendingBuffer = pendingBuffer.subarray(targetChunkSize);
			}
		}

		if (pendingBuffer.length > 0) {
			yield pendingBuffer;
		}
	}
}

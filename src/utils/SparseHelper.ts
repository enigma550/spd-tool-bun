import type { Buffer } from "node:buffer";

const SPARSE_HEADER_MAGIC = 0xed26ff3a;

export enum ChunkType {
	Raw = 0xcac1,
	Fill = 0xcac2,
	DontCare = 0xcac3,
	Crc32 = 0xcac4,
}

export interface SparseChunk {
	type: ChunkType;
	numBlks: number;
	dataSz: number;
	inOffset: number;
}

export namespace SparseHelper {
	export function isSparse(header: Buffer): boolean {
		if (header.length < 28) return false;
		return header.readUint32LE(0) === SPARSE_HEADER_MAGIC;
	}

	export function parse(buf: Buffer): SparseChunk[] {
		if (!isSparse(buf)) return [];

		const fileHdrSz = buf.readUint16LE(4);
		const chunkHdrSz = buf.readUint16LE(6);
		const totalChunks = buf.readUint32LE(16);

		const chunks: SparseChunk[] = [];
		let offset = fileHdrSz;

		for (let i = 0; i < totalChunks; i++) {
			if (offset + chunkHdrSz > buf.length) break;

			const type = buf.readUint16LE(offset) as ChunkType;
			const numBlks = buf.readUint32LE(offset + 4);
			const totalSz = buf.readUint32LE(offset + 8);

			chunks.push({
				type,
				numBlks,
				dataSz: totalSz - chunkHdrSz,
				inOffset: offset + chunkHdrSz,
			});

			offset += totalSz;
		}

		return chunks;
	}
}

export enum DiagCommand {
	VERSION = 0x00,
	IMEI_READ = 0x01,
	IMEI_WRITE = 0x02,
	NV_READ = 0x26,
	NV_WRITE = 0x27,
	SPC_UNLOCK = 0x47,
	AT_COMMAND = 0x4b,
	EFS_READ = 0x59,
	EFS_WRITE = 0x5a,
	RESTART = 0x29,
	POWER_OFF = 0x3e,
}

export namespace DiagProtocol {
	export const TAG = 0x7e;
	export const ESCAPE = 0x7d;

	/**
	 * CRC-16-CCITT for Diagnostic Protocol
	 * Poly: 0x8408 (reversed 0x1021)
	 * Init: 0xFFFF
	 * LSB-first
	 */
	export function crc16(data: Uint8Array | Buffer): number {
		let crc = 0xffff;
		for (const b of data) {
			crc ^= b;
			for (let i = 0; i < 8; i++) {
				if ((crc & 1) !== 0) {
					crc = (crc >> 1) ^ 0x8408;
				} else {
					crc >>= 1;
				}
			}
		}
		return crc ^ 0xffff;
	}

	/**
	 * Wrap command and payload in a Diag frame
	 * Frame: 0x7E [data (escaped)] [crc (escaped)] 0x7E
	 */
	export function encode(
		cmd: number,
		payload: Buffer | Uint8Array = new Uint8Array(0),
	): Buffer {
		const raw = Buffer.alloc(1 + payload.length);
		raw[0] = cmd;
		raw.set(payload, 1);

		const crc = crc16(raw);
		const full = Buffer.alloc(raw.length + 2);
		full.set(raw, 0);
		full.writeUInt16LE(crc, raw.length);

		const encoded: number[] = [TAG];
		for (const b of full) {
			if (b === TAG || b === ESCAPE) {
				encoded.push(ESCAPE);
				encoded.push(b ^ 0x20);
			} else {
				encoded.push(b);
			}
		}
		encoded.push(TAG);

		return Buffer.from(encoded);
	}

	/**
	 * Decode a Diag frame by unescaping and removing CRC
	 */
	export function decode(frame: Buffer): Buffer | null {
		if (
			frame.length < 4 ||
			frame[0] !== TAG ||
			frame[frame.length - 1] !== TAG
		) {
			return null;
		}

		const unescaped: number[] = [];
		let escaped = false;

		for (let i = 1; i < frame.length - 1; i++) {
			const b = frame[i];
			if (b === undefined) continue;

			if (b === ESCAPE) {
				escaped = true;
			} else if (escaped) {
				unescaped.push(b ^ 0x20);
				escaped = false;
			} else {
				unescaped.push(b);
			}
		}

		if (unescaped.length < 3) return null;

		const data = Buffer.from(unescaped);
		const rawPayload = data.subarray(0, -2);
		const receivedCrc = data.readUInt16LE(data.length - 2);
		const computedCrc = crc16(rawPayload);

		if (receivedCrc !== computedCrc) {
			console.error(
				`[DIAG] CRC Mismatch: 0x${receivedCrc.toString(16)} vs 0x${computedCrc.toString(16)}`,
			);
			return null;
		}

		return rawPayload;
	}
}

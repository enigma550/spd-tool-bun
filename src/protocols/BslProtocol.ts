import { Buffer } from "node:buffer";

export enum BslCommand {
	CONNECT = 0x00,
	START_DATA = 0x01,
	MID_DATA = 0x02,
	END_DATA = 0x03,
	EXEC_DATA = 0x04,
	NORMAL_RESET = 0x05,
	READ_FLASH = 0x06,
	READ_CHIP_TYPE = 0x07,
	READ_NVITEM = 0x08,
	CHANGE_BAUD = 0x09,
	ERASE_FLASH = 0x0a,
	REPARTITION = 0x0b,
	READ_FLASH_TYPE = 0x0c,
	READ_FLASH_INFO = 0x0d,
	READ_SECTOR_SIZE = 0x0f,
	READ_START = 0x10,
	READ_MIDST = 0x11,
	READ_END = 0x12,
	KEEP_CHARGE = 0x13,
	READ_FLASH_UID = 0x15,
	READ_SOFTSIM_EID = 0x16,
	POWER_OFF = 0x17,
	CHECK_ROOT = 0x19,
	READ_CHIP_UID = 0x1a,
	ENABLE_WRITE_FLASH = 0x1b,
	ENABLE_SECUREBOOT = 0x1c,
	IDENTIFY_START = 0x1d,
	IDENTIFY_END = 0x1e,
	READ_CU_REF = 0x1f,
	READ_REFINFO = 0x20,
	DISABLE_TRANSCODE = 0x21,
	WRITE_APR_INFO = 0x22,
	WRITE_NVITEM = 0x22, // Alias for WRITE_APR_INFO
	WRITE_DATETIME = 0x22, // Alias for WRITE_APR_INFO
	CUST_DUMMY = 0x23,
	READ_RF_TRANSCEIVER_TYPE = 0x24,
	ENABLE_DEBUG_MODE = 0x25,
	SET_DEBUGINFO = 0x25, // Alias
	DDR_CHECK = 0x26,
	SELF_REFRESH = 0x27,
	WRITE_RAW_DATA_ENABLE = 0x28,
	READ_NAND_BLOCK_INFO = 0x29,
	SET_FIRST_MODE = 0x2a,
	PARTITION_SIGNATURE = 0x2b,
	READ_PARTITION = 0x2d,
	UNLOCK = 0x30,
	READ_PUBKEY = 0x31,
	DLOAD_RAW_START = 0x31,
	SEND_SIGNATURE = 0x32,
	WRITE_FLUSH_DATA = 0x32,
	DLOAD_RAW_START2 = 0x33,
	WRITE_PARTITION_VALUE = 0x32, // Note: Overlaps with SEND_SIGNATURE
	EXTTABLE_SET = 0x14,
	EXTTABLE = 0x14, // Alias
	READ_LOG = 0x35,
	READ_EFUSE = 0x60,
	CHECK_BAUD = 0x7e,
	END_PROCESS = 0x7f,

	// Additional commands
	READ_VERSION = 0x1c, // Alias for ENABLE_SECUREBOOT, used for version info
}

export enum BslResponse {
	ACK = 0x80,
	VER = 0x81,
	INVALID_CMD = 0x82,
	UNKNOW_CMD = 0x83,
	OPERATION_FAILED = 0x84,
	NOT_SUPPORT_BAUDRATE = 0x85,
	DOWN_NOT_START = 0x86,
	DOWN_MULTI_START = 0x87,
	DOWN_EARLY_END = 0x88,
	DOWN_DEST_ERROR = 0x89,
	DOWN_SIZE_ERROR = 0x8a,
	VERIFY_ERROR = 0x8b,
	NOT_VERIFY = 0x8c,
	PHONE_NOT_ENOUGH_MEMORY = 0x8d,
	PHONE_WAIT_INPUT_TIMEOUT = 0x8e,
	PHONE_SUCCEED = 0x8f,
	PHONE_VALID_BAUDRATE = 0x90,
	PHONE_REPEAT_CONTINUE = 0x91,
	PHONE_REPEAT_BREAK = 0x92,
	READ_FLASH = 0x93,
	READ_CHIP_TYPE = 0x94,
	READ_NVITEM = 0x95,
	INCOMPATIBLE_PARTITION = 0x96,
	UNKNOWN_DEVICE = 0x97,
	INVALID_DEVICE_SIZE = 0x98,
	ILLEGAL_SDRAM = 0x99,
	WRONG_SDRAM_PARAMETER = 0x9a,
	READ_FLASH_INFO = 0x9b,
	READ_SECTOR_SIZE = 0x9c,
	READ_FLASH_TYPE = 0x9d,
	READ_FLASH_UID = 0x9e,
	READ_SOFTSIM_EID = 0x9f,
	ERROR_CHECKSUM = 0xa0,
	CHECKSUM_DIFF = 0xa1,
	WRITE_ERROR = 0xa2,
	CHIPID_NOT_MATCH = 0xa3,
	FLASH_CFG_ERROR = 0xa4,
	DOWN_STL_SIZE_ERROR = 0xa5,
	SIGN_VERIFY_ERROR = 0xa6,
	PHONE_IS_ROOTED = 0xa7,
	SEC_VERIFY_ERROR = 0xaa,
	READ_CHIP_UID = 0xab,
	NOT_ENABLE_WRITE_FLASH = 0xac,
	ENABLE_SECUREBOOT_ERROR = 0xad,
	IDENTIFY_START = 0xae,
	IDENTIFY_END = 0xaf,
	READ_CU_REF = 0xb0,
	READ_REFINFO = 0xb1,
	CUST_DUMMY = 0xb2,
	FLASH_WRITTEN_PROTECTION = 0xb3,
	FLASH_INITIALIZING_FAIL = 0xb4,
	RF_TRANSCEIVER_TYPE = 0xb5,
	DDR_CHECK_ERROR = 0xb6,
	SELF_REFRESH_ERROR = 0xb7,
	READ_NAND_BLOCK_INFO = 0xb8,
	PARTITION_TABLE = 0xba,
	READ_LOG = 0xbb,
	UNSUPPROT_COMMAND = 0xfe,
	LOG = 0xff,

	// Additional response types
	DATA = 0x93, // Alias for READ_FLASH response
	FLASH_INFO = 0x92, // Alias for PHONE_REPEAT_CONTINUE
	CHECK_ROOT_TRUE = 0xa7, // Alias for PHONE_IS_ROOTED
}

export namespace BslProtocol {
	const TAG_FDL1 = 0xae;
	const TAG_FDL2 = 0x7e;
	const ESCAPE = 0x7d;

	/**
	 * Calculate CRC16-CCITT for BROM/FDL1 phase
	 * Uses MSB-first algorithm strategy
	 */
	export function crc16(data: Buffer | Uint8Array): number {
		let crc = 0;
		for (const b of data) {
			crc ^= b << 8;
			for (let i = 0; i < 8; i++) {
				if (crc & 0x8000) {
					crc = (crc << 1) ^ 0x1021;
				} else {
					crc = crc << 1;
				}
				crc &= 0xffff;
			}
		}
		return crc;
	}

	/**
	 * Calculate Spreadtrum proprietary checksum (used after FDL1 loaded)
	 * Proprietary CRC algorithm for Spreadtrum devices
	 * This is the checksum used by FDL2 for data verification
	 */
	export function sprdChecksum(data: Buffer | Uint8Array): number {
		let ctr = 0;
		let len = data.length;
		let i = 0;

		// Process 2 bytes at a time (Little-Endian)
		while (len > 1) {
			ctr += data[i] | (data[i + 1] << 8); // Little-Endian
			i += 2;
			len -= 2;
		}

		// Process remaining single byte
		if (len > 0) {
			ctr += data[i];
		}

		// Fold to 16-bit and invert
		ctr = (ctr >> 16) + (ctr & 0xffff);
		ctr = ~(ctr + (ctr >> 16)) & 0xffff;

		// Critical: Byte swap to match expected endianness
		return ((ctr >> 8) | ((ctr & 0xff) << 8)) & 0xffff;
	}

	/**
	 * Wrap data in FDL1 framing (0xAE)
	 */
	export function encodeFdl1(
		cmd: number,
		address: number | bigint,
		size: number | bigint,
		data?: Buffer,
		is64Bit = false,
		checksum?: number,
	): Buffer {
		const packetHeaderSize = 8;
		const idLen = 0; // If using partition ID instead of address
		const dataHeaderSize = is64Bit ? 20 : 12;
		const extraSize = checksum !== undefined ? 4 : 0;
		const dataLen = data ? data.length : 0;
		const totalSize =
			packetHeaderSize + idLen + dataHeaderSize + extraSize + dataLen;

		const buf = Buffer.alloc(totalSize);
		const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

		// Packet Header
		buf[0] = TAG_FDL1;
		dv.setUint32(1, idLen + dataHeaderSize + extraSize + dataLen, true);
		buf[5] = 0xff; // FlowID
		dv.setUint16(6, 0, true); // Reserved

		// Data Header
		let offset = 8;
		dv.setUint32(offset, cmd, true);
		offset += 4;

		if (is64Bit) {
			dv.setBigUint64(offset, BigInt(size), true);
			offset += 8;
			dv.setBigUint64(offset, BigInt(address), true);
			offset += 8;
		} else {
			dv.setUint32(offset, Number(address), true);
			offset += 4;
			dv.setUint32(offset, Number(size), true);
			offset += 4;
		}

		if (checksum !== undefined) {
			dv.setUint32(offset, checksum, true);
			offset += 4;
		}

		if (data) {
			data.copy(buf, offset);
		}

		return buf;
	}

	/**
	 * Wrap data in FDL2 framing (0x7E HDLC)
	 */
	export function encodeFdl2(
		type: number,
		data: Buffer | Uint8Array = new Uint8Array(0),
		transcodeBypass = false,
	): Buffer {
		const raw = Buffer.alloc(4 + data.length + 2);
		const dv = new DataView(raw.buffer);

		dv.setUint16(0, type, false); // Big Endian
		dv.setUint16(2, data.length, false); // Big Endian
		raw.set(data, 4);

		const crc = crc16(raw.subarray(0, 4 + data.length));
		dv.setUint16(4 + data.length, crc, false);

		if (transcodeBypass) {
			const buf = Buffer.alloc(raw.length + 2);
			buf[0] = TAG_FDL2;
			raw.copy(buf, 1);
			buf[buf.length - 1] = TAG_FDL2;
			return buf;
		}

		// HDLC Encoding (Escape 0x7E and 0x7D)
		const encoded: number[] = [TAG_FDL2];
		for (const b of raw) {
			if (b === TAG_FDL2 || b === ESCAPE) {
				encoded.push(ESCAPE);
				encoded.push(b ^ 0x20);
			} else {
				encoded.push(b);
			}
		}
		encoded.push(TAG_FDL2);

		return Buffer.from(encoded);
	}

	/**
	 * Decode HDLC framing
	 */
	export function decodeFdl2(
		input: Buffer,
		transcodeBypass = false,
	): Buffer | null {
		if (input.length < 2) return null;

		// Skip external 0x7E tags
		const start = input[0] === TAG_FDL2 ? 1 : 0;
		const end =
			input[input.length - 1] === TAG_FDL2 ? input.length - 1 : input.length;

		if (transcodeBypass) {
			return input.subarray(start, end);
		}

		const decoded: number[] = [];
		let escaped = false;

		for (let i = start; i < end; i++) {
			const b = input[i];
			if (b === undefined) continue;

			if (b === ESCAPE) {
				escaped = true;
			} else if (escaped) {
				decoded.push(b ^ 0x20);
				escaped = false;
			} else {
				decoded.push(b);
			}
		}

		return Buffer.from(decoded);
	}
}

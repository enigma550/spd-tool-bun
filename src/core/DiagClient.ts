import { SerialPort } from "../io/SerialPort";
import { DiagCommand, DiagProtocol } from "../protocols/DiagProtocol";

export class DiagClient {
	private port: SerialPort;
	private isConnected = false;

	constructor() {
		this.port = new SerialPort();
	}

	get connected(): boolean {
		return this.isConnected;
	}

	async connect(path: string, baudRate = 115200): Promise<boolean> {
		if (!(await this.port.open(path, baudRate))) return false;

		// Handshake: Send VERSION command
		const resp = await this.sendCommand(DiagCommand.VERSION);
		if (resp) {
			this.isConnected = true;
			console.log("✅ Diag connection established!");
			return true;
		}

		this.port.close();
		this.isConnected = false;
		return false;
	}

	async sendCommand(
		cmd: DiagCommand,
		payload?: Buffer | Uint8Array,
	): Promise<Buffer | null> {
		const frame = DiagProtocol.encode(cmd, payload);
		this.port.write(frame);

		// Read response frame
		const resp = await this.port.read(4096, 2000);
		if (resp.length === 0) return null;

		const decoded = DiagProtocol.decode(resp);
		if (!decoded || decoded[0] !== cmd) return null;

		return decoded;
	}

	/**
	 * Read IMEI from slot 1 or 2
	 */
	async readImei(slot = 1): Promise<string | null> {
		const nvId = slot === 1 ? 0x0005 : 0x0179; // Standard NV IDs for IMEI
		const resp = await this.readNvItem(nvId, 8);
		if (!resp) return null;

		return this.parseImei(resp);
	}

	/**
	 * Write IMEI to slot 1 or 2
	 */
	async writeImei(imei: string, slot = 1): Promise<boolean> {
		if (imei.length !== 15) return false;
		const nvId = slot === 1 ? 0x0005 : 0x0179;
		const encoded = this.encodeImei(imei);

		return await this.writeNvItem(nvId, encoded);
	}

	async readNvItem(nvId: number, length: number): Promise<Buffer | null> {
		const payload = Buffer.alloc(4);
		payload.writeUInt16LE(nvId, 0);
		payload.writeUInt16LE(length, 2);

		const resp = await this.sendCommand(DiagCommand.NV_READ, payload);
		if (!resp || resp.length < 4) return null;

		// Skip cmd (1 byte) + NV ID (2 bytes) + Length (1 byte?)
		// NV items copy starts from index 3
		return resp.subarray(3);
	}

	async writeNvItem(nvId: number, data: Buffer): Promise<boolean> {
		const payload = Buffer.alloc(2 + data.length);
		payload.writeUInt16LE(nvId, 0);
		data.copy(payload, 2);

		const resp = await this.sendCommand(DiagCommand.NV_WRITE, payload);
		return resp !== null;
	}

	/**
	 * Decode Spreadtrum BCD IMEI format
	 */
	private parseImei(data: Buffer): string {
		let imei = "";
		// First digit is high nibble of first byte
		const firstByte = data[0];
		if (firstByte === undefined) return "";

		imei += ((firstByte >> 4) & 0x0f).toString();
		for (let i = 1; i < 8; i++) {
			const b = data[i];
			if (b === undefined) break;
			imei += (b & 0x0f).toString();
			imei += ((b >> 4) & 0x0f).toString();
		}
		return imei.replace(/F/g, "").substring(0, 15);
	}

	/**
	 * Encode 15-digit IMEI to Spreadtrum BCD format
	 */
	private encodeImei(imei: string): Buffer {
		const data = Buffer.alloc(8);
		// First byte: (Digit1 << 4) | 0x0A (Standard flag)
		const d1 = imei[0];
		if (d1 === undefined) throw new Error("Invalid IMEI");

		data[0] = ((parseInt(d1, 10) & 0x0f) << 4) | 0x0a;

		for (let i = 1; i < 8; i++) {
			const idx = (i - 1) * 2 + 1;
			const lowStr = imei[idx];
			const highStr = idx + 1 < 15 ? imei[idx + 1] : undefined;

			const low = lowStr !== undefined ? parseInt(lowStr, 10) & 0x0f : 0x0f;
			const high = highStr !== undefined ? parseInt(highStr, 10) & 0x0f : 0x0f;
			data[i] = (high << 4) | low;
		}
		return data;
	}

	async sendAtCommand(command: string): Promise<string | null> {
		const cmdStr = command.endsWith("\r") ? command : `${command}\r`;
		const resp = await this.sendCommand(
			DiagCommand.AT_COMMAND,
			Buffer.from(cmdStr, "ascii"),
		);
		if (!resp || resp.length < 2) return null;

		return resp.subarray(1).toString("ascii").trim();
	}

	close() {
		this.port.close();
		this.isConnected = false;
	}
}

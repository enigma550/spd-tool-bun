import { EventEmitter } from "node:events";
import { ExploitService } from "../exploit/ExploitService";
import { SerialPort } from "../io/SerialPort";
import { BslCommand, BslProtocol, BslResponse } from "../protocols/BslProtocol";
import type { ProgressCallback } from "../types/common";
import { ChipSets } from "../utils/ChipSets";

export enum FdlStage {
	None = "None",
	FDL1 = "FDL1",
	FDL2 = "FDL2",
}

export enum DeviceState {
	Disconnected = "Disconnected",
	Connected = "Connected", // ROM Mode
	Fdl1Loaded = "Fdl1Loaded",
	Fdl2Loaded = "Fdl2Loaded",
	Error = "Error",
}

export interface FdlClientConfig {
	chipId?: number;
	initialBaudRate?: number;
	fdl1BaudRate?: number;
	fdl2BaudRate?: number;
	useCrc16Mode?: boolean;
	useTranscode?: boolean;
}

export class FdlClient extends EventEmitter {
	private port: SerialPort;
	private exploitService: ExploitService;

	// State
	private _state: DeviceState = DeviceState.Disconnected;
	private _stage: FdlStage = FdlStage.None;
	private _chipId: number = 0;

	// Protocol settings
	private useCrc16Mode = true; // true = CRC16 (BROM), false = Spreadtrum checksum (FDL)
	private useTranscode = true; // HDLC escaping enabled
	private currentBaudRate = 115200;

	// Config
	private config: FdlClientConfig = {
		initialBaudRate: 115200,
		fdl1BaudRate: 115200,
		fdl2BaudRate: 921600,
		useCrc16Mode: true,
		useTranscode: true,
	};

	constructor(config?: Partial<FdlClientConfig>) {
		super();
		this.port = new SerialPort();
		this.exploitService = new ExploitService();

		if (config) {
			this.config = { ...this.config, ...config };
		}

		this.useCrc16Mode = this.config.useCrc16Mode ?? true;
		this.useTranscode = this.config.useTranscode ?? true;
	}

	// ============================================================================
	// Getters
	// ============================================================================

	get isConnected(): boolean {
		return this._state !== DeviceState.Disconnected;
	}

	get isBromMode(): boolean {
		return (
			this._stage === FdlStage.None && this._state === DeviceState.Connected
		);
	}

	get state(): DeviceState {
		return this._state;
	}

	get stage(): FdlStage {
		return this._stage;
	}

	get chipId(): number {
		return this._chipId;
	}

	// ============================================================================
	// Configuration
	// ============================================================================

	setChipId(chipId: number) {
		this._chipId = chipId;
		this.emit("chip_id_set", chipId);
		this.log(
			`Chip ID set: 0x${chipId.toString(16)} (${ChipSets.getName(chipId)})`,
		);
	}

	// ============================================================================
	// Connection
	// ============================================================================

	async connect(portPath: string, baudRate?: number): Promise<boolean> {
		try {
			const rate = baudRate || this.config.initialBaudRate || 115200;
			this.log(`Connecting to ${portPath} @ ${rate} baud...`);

			if (!(await this.port.open(portPath, rate))) {
				this.setState(DeviceState.Error);
				return false;
			}

			this.currentBaudRate = rate;
			this.setState(DeviceState.Connected);

			// Sync with device
			if (!(await this.syncBrom())) {
				this.disconnect();
				return false;
			}

			this.log("✅ Connected to device (BROM mode)");
			return true;
		} catch (error) {
			this.error(`Connection failed: ${error}`);
			this.setState(DeviceState.Error);
			return false;
		}
	}

	disconnect() {
		this.port.close();
		this.setState(DeviceState.Disconnected);
		this._stage = FdlStage.None;
		this.useCrc16Mode = true;
		this.useTranscode = true;
		this.log("Disconnected");
	}

	/**
	 * Synchronize with BROM by sending 0x7E bytes
	 */
	private async syncBrom(): Promise<boolean> {
		this.log("🔄 Synchronizing with BROM...");
		const syncBuf = Buffer.from([0x7e]);

		for (let i = 0; i < 100; i++) {
			this.port.write(syncBuf);
			const resp = await this.port.read(1, 50);
			if (resp.length > 0 && resp[0] === 0x7e) {
				this.log("✅ BROM synchronized");
				return true;
			}
		}

		this.error("❌ BROM synchronization timeout");
		return false;
	}

	// ============================================================================
	// FDL Loading
	// ============================================================================

	/**
	 * Load FDL1 (first stage bootloader)
	 */
	async loadFdl1(fdl1Data: Buffer, address: number): Promise<boolean> {
		try {
			this.log(`📦 Loading FDL1 to 0x${address.toString(16)}...`);

			// Check if exploit needed
			if (
				this._chipId > 0 &&
				this.exploitService.needsSignatureBypass(this._chipId)
			) {
				this.log("⚠️  This chip requires signature bypass exploit");
				const result = await this.exploitService.applySignatureBypass(
					this._chipId,
					async (addr, data) => {
						return await this.sendExploitPayload(addr, data);
					},
				);

				if (!result.success) {
					this.error(`Exploit failed: ${result.message}`);
					return false;
				}
				this.log("✅ Signature bypass applied");
			}

			// Download FDL1
			if (!(await this.downloadData(address, fdl1Data))) {
				return false;
			}

			// Execute FDL1
			if (!(await this.executeCode(address))) {
				return false;
			}

			this._stage = FdlStage.FDL1;
			this.setState(DeviceState.Fdl1Loaded);

			// Wait for FDL1 to initialize
			await Bun.sleep(200);

			// Re-sync with FDL1
			if (!(await this.syncFdl1())) {
				return false;
			}

			this.log("✅ FDL1 loaded successfully");
			return true;
		} catch (error) {
			this.error(`FDL1 load failed: ${error}`);
			return false;
		}
	}

	/**
	 * Load FDL2 (second stage bootloader / flashing mode)
	 */
	async loadFdl2(fdl2Data: Buffer, address: number): Promise<boolean> {
		try {
			this.log(`📦 Loading FDL2 to 0x${address.toString(16)}...`);

			if (this._stage !== FdlStage.FDL1) {
				this.error("FDL1 must be loaded before FDL2");
				return false;
			}

			// Switch to FDL mode (use Spreadtrum checksum)
			this.switchToFdlMode();

			// Change baud rate if configured
			if (
				this.config.fdl2BaudRate &&
				this.config.fdl2BaudRate !== this.currentBaudRate
			) {
				if (!(await this.changeBaudRate(this.config.fdl2BaudRate))) {
					this.log(
						"⚠️  Failed to change baud rate, continuing with current rate",
					);
				}
			}

			// Download FDL2
			if (!(await this.downloadData(address, fdl2Data))) {
				return false;
			}

			// Execute FDL2
			if (!(await this.executeCode(address))) {
				return false;
			}

			this._stage = FdlStage.FDL2;
			this.setState(DeviceState.Fdl2Loaded);

			// Wait for FDL2 to initialize
			await Bun.sleep(200);

			// Disable transcoding for faster transfers
			if (await this.disableTranscode()) {
				this.log("⚡ High-speed mode enabled (transcode disabled)");
			}

			this.log("✅ FDL2 loaded successfully");
			return true;
		} catch (error) {
			this.error(`FDL2 load failed: ${error}`);
			return false;
		}
	}

	/**
	 * Synchronize with FDL1 after execution
	 */
	private async syncFdl1(): Promise<boolean> {
		this.log("🔄 Synchronizing with FDL1...");
		const syncBuf = Buffer.from([0x7e, 0x7e, 0x7e, 0x7e]);

		for (let i = 0; i < 10; i++) {
			this.port.write(syncBuf);
			const resp = await this.port.read(1, 100);
			if (resp.length > 0 && (resp[0] === 0x7e || resp[0] === 0x80)) {
				// Send CONNECT command
				const connectFrame = BslProtocol.encodeFdl2(
					BslCommand.CONNECT,
					Buffer.alloc(0),
				);
				this.port.write(connectFrame);
				const connectResp = await this.readFrame();
				if (
					connectResp &&
					connectResp.length > 0 &&
					connectResp[0] === BslResponse.ACK
				) {
					this.log("✅ FDL1 synchronized");
					return true;
				}
			}
			await Bun.sleep(100);
		}

		this.error("❌ FDL1 synchronization timeout");
		return false;
	}

	// ============================================================================
	// BSL Commands
	// ============================================================================

	/**
	 * Download data to device memory
	 */
	private async downloadData(address: number, data: Buffer): Promise<boolean> {
		const chunkSize = 4096;

		// Start data transfer
		const startPayload = Buffer.alloc(8);
		startPayload.writeUInt32LE(address, 0);
		startPayload.writeUInt32LE(data.length, 4);

		if (!(await this.sendCommand(BslCommand.START_DATA, startPayload))) {
			return false;
		}

		// Send data in chunks
		for (let i = 0; i < data.length; i += chunkSize) {
			const size = Math.min(chunkSize, data.length - i);
			const chunk = data.subarray(i, i + size);

			if (!(await this.sendCommand(BslCommand.MID_DATA, chunk))) {
				return false;
			}

			// Progress
			if (i % (chunkSize * 10) === 0) {
				const percent = ((i / data.length) * 100).toFixed(1);
				process.stdout.write(`\r  Progress: ${percent}% `);
			}
		}
		console.log("\r  Progress: 100%   ");

		// End data transfer
		if (!(await this.sendCommand(BslCommand.END_DATA))) {
			return false;
		}

		return true;
	}

	/**
	 * Execute code at address
	 */
	private async executeCode(address: number): Promise<boolean> {
		const payload = Buffer.alloc(4);
		payload.writeUInt32LE(address, 0);
		return await this.sendCommand(BslCommand.EXEC_DATA, payload);
	}

	/**
	 * Send exploit payload for signature bypass
	 */
	private async sendExploitPayload(
		address: number,
		data: Buffer,
	): Promise<boolean> {
		// This would use a custom command or memory write to inject the exploit
		// For now, simplified implementation
		return await this.downloadData(address, data);
	}

	/**
	 * Change baud rate
	 */
	async changeBaudRate(newBaudRate: number): Promise<boolean> {
		this.log(`⚡ Changing baud rate to ${newBaudRate}...`);

		const payload = Buffer.alloc(4);
		payload.writeUInt32LE(newBaudRate, 0);

		if (!(await this.sendCommand(BslCommand.CHANGE_BAUD, payload))) {
			return false;
		}

		// Wait for device to change baud rate
		await Bun.sleep(100);

		// Change host baud rate
		const path = this.port.path;
		if (path) {
			this.port.close();
			if (!(await this.port.open(path, newBaudRate))) {
				return false;
			}
		}

		this.currentBaudRate = newBaudRate;
		this.log(`✅ Baud rate changed to ${newBaudRate}`);
		return true;
	}

	/**
	 * Disable transcoding (HDLC escaping) for faster transfers
	 */
	async disableTranscode(): Promise<boolean> {
		if (!(await this.sendCommand(BslCommand.DISABLE_TRANSCODE))) {
			return false;
		}
		this.useTranscode = false;
		return true;
	}

	/**
	 * Read partition table
	 */
	async readPartitionTable(): Promise<Buffer | null> {
		if (!(await this.sendCommand(BslCommand.READ_PARTITION))) {
			return null;
		}

		const response = await this.readFrame();
		if (
			!response ||
			response.length < 1 ||
			response[0] !== BslResponse.PARTITION_TABLE
		) {
			return null;
		}

		// Return partition data (skip response type byte)
		return response.subarray(1);
	}

	/**
	 * Read partition data
	 */
	async readPartition(
		name: string,
		offset: number | bigint,
		size: number | bigint,
		onProgress?: ProgressCallback,
	): Promise<Buffer | null> {
		this.log(`📖 Reading partition: ${name} (${size} bytes)...`);

		const is64Bit = offset > 0xffffffffn || size > 0xffffffffn;
		const payload = Buffer.from(`${name}\0`, "ascii");

		if (
			!(await this.sendCommand(
				BslCommand.READ_START,
				payload,
				offset,
				size,
				is64Bit,
			))
		) {
			return null;
		}

		const data = Buffer.alloc(Number(size));
		// const chunkSize = 1024 * 64; // 64KB chunks
		let read = 0n;

		while (read < BigInt(size)) {
			// const remaining = BigInt(size) - read;

			const chunk = await this.readFrame();
			if (!chunk || chunk.length < 1 || chunk[0] !== BslResponse.DATA) {
				this.error(`Failed to read chunk at offset ${read}`);
				return null;
			}

			// Data starts after response byte
			const actualData = chunk.subarray(1);
			actualData.copy(data, Number(read));
			read += BigInt(actualData.length);

			if (onProgress) {
				onProgress(read, BigInt(size));
			}

			// FDL implementation might send ACK for each block in some cases, but BSL protocol usually
			// just sends the next block if multi-block read is supported.
			// Some implementations require handshake here.
		}

		if (!(await this.sendCommand(BslCommand.READ_END))) {
			return null;
		}

		return data;
	}

	/**
	 * Write partition data
	 */
	async writePartition(
		name: string,
		data: Buffer,
		onProgress?: ProgressCallback,
	): Promise<boolean> {
		this.log(`✍️ Writing partition: ${name} (${data.length} bytes)...`);

		const is64Bit = data.length > 0xffffffff;
		const payload = Buffer.from(`${name}\0`, "ascii");

		if (
			!(await this.sendCommand(
				BslCommand.START_DATA,
				payload,
				0,
				data.length,
				is64Bit,
			))
		) {
			return false;
		}

		const chunkSize = 1024 * 64;
		for (let i = 0; i < data.length; i += chunkSize) {
			const size = Math.min(chunkSize, data.length - i);
			const chunk = data.subarray(i, i + size);

			if (!(await this.sendCommand(BslCommand.MID_DATA, chunk))) {
				return false;
			}

			if (onProgress) {
				onProgress(BigInt(i + size), BigInt(data.length));
			}
		}

		return await this.sendCommand(BslCommand.END_DATA);
	}

	/**
	 * Erase partition
	 */
	async erasePartition(name: string): Promise<boolean> {
		this.log(`🧽 Erasing partition: ${name}...`);
		const payload = Buffer.from(`${name}\0`, "ascii");
		return await this.sendCommand(BslCommand.ERASE_FLASH, payload);
	}

	/**
	 * Read chip type/ID
	 */
	async readChipType(): Promise<number | null> {
		if (!(await this.sendCommand(BslCommand.READ_CHIP_TYPE))) {
			return null;
		}

		const response = await this.readFrame();
		if (
			!response ||
			response.length < 5 ||
			response[0] !== BslResponse.READ_CHIP_TYPE
		) {
			return null;
		}

		// Chip ID is 4 bytes after response type
		return response.readUInt32LE(1);
	}

	// ============================================================================
	// Protocol Helpers
	// ============================================================================

	/**
	 * Send BSL command and wait for response
	 */
	private async sendCommand(
		cmd: BslCommand,
		payload: Buffer = Buffer.alloc(0),
		address: number | bigint = 0,
		size: number | bigint = 0,
		is64Bit = false,
		timeout = 5000,
	): Promise<boolean> {
		const frame =
			this._stage === FdlStage.None
				? BslProtocol.encodeFdl1(cmd, address, size, payload, is64Bit)
				: BslProtocol.encodeFdl2(cmd, payload, !this.useTranscode);

		this.port.write(frame);

		const response = await this.readFrame(timeout);
		if (!response || response.length === 0) {
			this.error(`No response for command 0x${cmd.toString(16)}`);
			return false;
		}

		// Check for ACK
		const code = response[response.length - 1];
		if (code === undefined) return false;

		if (code !== BslResponse.ACK && code !== 0x00) {
			const respName = (BslResponse[code] as string) || "UNKNOWN";
			this.error(
				`Command failed with response: 0x${code.toString(16)} (${respName})`,
			);
			return false;
		}

		// Some commands return data instead of ACK
		return true;
	}

	/**
	 * Read HDLC frame from device
	 */
	private async readFrame(timeout = 5000): Promise<Buffer | null> {
		const startTime = Date.now();
		const buffer: number[] = [];
		let inFrame = false;

		while (Date.now() - startTime < timeout) {
			const data = await this.port.read(1, 100);
			if (data.length === 0) continue;

			const byte = data[0];

			if (byte === 0x7e) {
				if (inFrame) {
					// End of frame
					if (byte !== undefined) buffer.push(byte);
					return BslProtocol.decodeFdl2(
						Buffer.from(buffer),
						!this.useTranscode,
					);
				}
				// Start of frame
				inFrame = true;
				buffer.length = 0;
			}

			if (byte !== undefined) buffer.push(byte);
		}

		return null;
	}

	/**
	 * Switch to FDL mode (use Spreadtrum checksum instead of CRC16)
	 */
	private switchToFdlMode() {
		this.useCrc16Mode = false;
		this.log("[Protocol] Switched to FDL mode (Spreadtrum checksum)");
	}

	// ============================================================================
	// State Management
	// ============================================================================

	private setState(state: DeviceState) {
		if (this._state !== state) {
			this._state = state;
			this.emit("state_changed", state);
		}
	}

	// ============================================================================
	// Logging
	// ============================================================================

	private log(message: string) {
		this.emit("log", message);
		console.log(`[FdlClient] ${message}`);
	}

	private error(message: string) {
		this.emit("error", message);
		console.error(`[FdlClient] ${message}`);
	}
}

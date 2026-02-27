import { DiagClient } from "../core/DiagClient";
import { FlashEngine } from "../core/FlashEngine";

export enum ClientType {
	FLASH = "flash",
	DIAG = "diag",
}

export const ClientFactory = {
	create(type: ClientType): FlashEngine | DiagClient {
		switch (type) {
			case ClientType.FLASH:
				return new FlashEngine();
			case ClientType.DIAG:
				return new DiagClient();
			default:
				throw new Error(`Unknown client type: ${type}`);
		}
	},
} as const;

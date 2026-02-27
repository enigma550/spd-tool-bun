import { DiagClient } from "../../core/DiagClient";
import { PortScanner } from "../../io/PortScanner";
import type { Command } from "../Command";

export class WriteImeiCommand implements Command {
	name = "write-imei";
	description = "Write IMEI to a device in diagnostic mode";
	usage = "spd-tool write-imei <imei> [serial_port] [slot]";

	async execute(args: string[]): Promise<void> {
		const imei = args[0];
		const portPath =
			args[1] || (await PortScanner.findPort()) || "/dev/ttyUSB0";
		const slot = parseInt(args[2] || "1", 10);

		if (!imei || imei.length !== 15) {
			console.error("❌ Invalid IMEI. Must be 15 digits.");
			process.exit(1);
		}

		console.log(`\n📱 Writing IMEI ${imei} to Slot ${slot} on ${portPath}...`);
		const client = new DiagClient();
		try {
			if (!(await client.connect(portPath))) {
				console.error("❌ Failed to connect in Diagnostic mode.");
				return;
			}
			if (await client.writeImei(imei, slot)) {
				console.log("✅ IMEI written successfully!");
			} else {
				console.error("❌ Failed to write IMEI.");
			}
		} finally {
			client.close();
		}
	}
}

import { DiagClient } from "../../core/DiagClient";
import { PortScanner } from "../../io/PortScanner";
import type { Command } from "../Command";

export class ReadImeiCommand implements Command {
	name = "read-imei";
	description = "Read IMEI from a device in diagnostic mode";
	usage = "spd-tool read-imei [serial_port] [slot]";

	async execute(args: string[]): Promise<void> {
		const portPath =
			args[0] || (await PortScanner.findPort()) || "/dev/ttyUSB0";
		const slot = parseInt(args[1] || "1", 10);

		console.log(`\n📱 Reading IMEI (Slot ${slot}) from ${portPath}...`);
		const client = new DiagClient();
		try {
			if (!(await client.connect(portPath))) {
				console.error("❌ Failed to connect in Diagnostic mode.");
				return;
			}
			const imei = await client.readImei(slot);
			if (imei) {
				console.log(`✅ IMEI (Slot ${slot}): ${imei}`);
			} else {
				console.error("❌ Failed to read IMEI.");
			}
		} finally {
			client.close();
		}
	}
}

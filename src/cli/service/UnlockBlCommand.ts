import { FlashEngine } from "../../core/FlashEngine";
import { PortScanner } from "../../io/PortScanner";
import type { Command } from "../Command";

export class UnlockBlCommand implements Command {
	name = "unlock-bl";
	description = "Unlock device bootloader";
	usage = "spd-tool unlock-bl [serial_port]";

	async execute(args: string[]): Promise<void> {
		const portPath =
			args[0] || (await PortScanner.findPort()) || "/dev/ttyUSB0";
		const dryRun = args.includes("--dry-run");

		console.log(`\n🔓 Unlocking Bootloader on ${portPath}...`);
		const engine = new FlashEngine();
		engine.setDryRun(dryRun);
		try {
			if (!(await engine.connect(portPath))) return;
			engine.setFdl2Mode(true);
			if (await engine.unlockBootloader()) {
				console.log("✅ Bootloader unlocked successfully!");
			} else {
				console.error("❌ Failed to unlock bootloader.");
			}
		} finally {
			engine.close();
		}
	}
}

import { resolve } from "node:path";
import { FlashEngine } from "../../core/FlashEngine";
import { ServiceEngine } from "../../core/ServiceEngine";
import { PortScanner } from "../../io/PortScanner";
import type { Command } from "../Command";

export class BackupNvCommand implements Command {
	name = "backup-nv";
	description = "Backup device NV calibration data";
	usage = "spd-tool backup-nv [destDir] [serial_port]";

	async execute(args: string[]): Promise<void> {
		const destDir = args[0] || "./nv_backup";
		const portPath =
			args[1] || (await PortScanner.findPort()) || "/dev/ttyUSB0";
		const dryRun = args.includes("--dry-run");

		const engine = new FlashEngine();
		engine.setDryRun(dryRun);
		try {
			if (!(await engine.connect(portPath))) return;
			engine.setFdl2Mode(true);
			const service = new ServiceEngine(engine);
			await service.backupCalibration(resolve(destDir));
		} finally {
			engine.close();
		}
	}
}

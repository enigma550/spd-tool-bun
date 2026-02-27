import { FlashEngine } from "../../core/FlashEngine";
import { ServiceEngine } from "../../core/ServiceEngine";
import { PortScanner } from "../../io/PortScanner";
import type { Command } from "../Command";

export class FrpBypassCommand implements Command {
	name = "frp-bypass";
	description = "Bypass Factory Reset Protection";
	usage = "spd-tool frp-bypass [serial_port]";

	async execute(args: string[]): Promise<void> {
		const portPath =
			args[0] || (await PortScanner.findPort()) || "/dev/ttyUSB0";
		const dryRun = args.includes("--dry-run");

		const engine = new FlashEngine();
		engine.setDryRun(dryRun);
		try {
			if (!(await engine.connect(portPath))) return;
			engine.setFdl2Mode(true);
			const service = new ServiceEngine(engine);
			await service.frpBypass();
		} finally {
			engine.close();
		}
	}
}

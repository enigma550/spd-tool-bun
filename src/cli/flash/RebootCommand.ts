import { resolve } from "node:path";
import { FlashEngine } from "../../core/FlashEngine";
import { PacExtractor } from "../../core/PacExtractor";
import { PortScanner } from "../../io/PortScanner";
import { ChipSets } from "../../utils/ChipSets";
import type { Command } from "../Command";

export class RebootCommand implements Command {
	name = "reboot";
	description = "Reboot a device after bringing up FDL2 from a PAC";
	usage = "spd-tool reboot <input.pac> [serial_port] [--dry-run]";

	async execute(args: string[]): Promise<void> {
		const pacPath = args[0] ? resolve(args[0]) : "";
		const portPath =
			args.find((a, i) => i > 0 && !a.startsWith("-")) ||
			(await PortScanner.findPort()) ||
			"/dev/ttyUSB0";
		const dryRun = args.includes("--dry-run");

		if (!pacPath) {
			console.error(`❌ Invalid arguments. Usage: ${this.usage}`);
			return;
		}

		console.log(`\n🔄 SPD Flash Tool - Reboot Device`);
		const extractor = new PacExtractor();
		const engine = new FlashEngine();

		try {
			if (!(await extractor.open(pacPath))) {
				console.error(`❌ Failed to open PAC file: ${pacPath}`);
				return;
			}

			engine.setDryRun(dryRun);
			engine.on("status", (msg) => console.log(msg));
			engine.on("error", (msg) => console.error(msg));

			if (!(await engine.connect(portPath))) return;

			const chipId = await engine.getChipId();
			const chipInfo = ChipSets.getInfo(chipId);
			console.log(`📱 Chipset identified: ${ChipSets.getName(chipId)}`);

			const fdl1Id = extractor
				.getFiles()
				.find((f) => f.szFileID === "FDL" || f.szFileID === "FDL1")?.szFileID;
			const fdl2Id = "FDL2";

			if (!fdl1Id || !extractor.getFiles().some((f) => f.szFileID === fdl2Id)) {
				console.error("❌ FDLs not found in PAC!");
				return;
			}

			const fdl1Addr =
				extractor.config?.fdl1?.address || chipInfo?.fdl1Addr || 0x008000c0;
			if (!(await engine.downloadFdl(extractor, fdl1Id, fdl1Addr))) return;
			await Bun.sleep(500);

			engine.setFdl2Mode(true);
			const fdl2Addr =
				extractor.config?.fdl2?.address || chipInfo?.fdl2Addr || 0x9f000000;
			if (!(await engine.downloadFdl(extractor, fdl2Id, fdl2Addr))) return;
			await Bun.sleep(500);

			if (!(await engine.reboot())) {
				console.error("\n❌ Failed to reboot device.");
				return;
			}

			console.log("\n✅ Reboot command completed.");
		} catch (error) {
			console.error("\n💥 Fatal Error:", error);
		} finally {
			extractor.close();
			engine.close();
		}
	}
}

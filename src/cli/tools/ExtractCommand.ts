import { resolve } from "node:path";
import { PacExtractor } from "../../core/PacExtractor";
import type { Command } from "../Command";

export class ExtractCommand implements Command {
	name = "extract";
	description = "Extract contents of a PAC file";
	usage = "spd-tool extract <input.pac> <output_dir>";

	async execute(args: string[]): Promise<void> {
		const pacPath = args[0] ? resolve(args[0]) : "";
		const destDir = args[1] ? resolve(args[1]) : "";

		if (!pacPath || !destDir) {
			console.error("❌ Invalid arguments for extraction.");
			return;
		}

		console.log(`\n🚀 SPD Flash Tool - Extracting`);
		console.log(`------------------------------`);
		const extractor = new PacExtractor();
		try {
			if (!(await extractor.open(pacPath))) {
				console.error(`❌ Failed to open PAC file: ${pacPath}`);
				return;
			}
			await extractor.extractTo(destDir);
			console.log(`\n✨ Extraction completed!`);
		} finally {
			extractor.close();
		}
	}
}

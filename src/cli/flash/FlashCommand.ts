import { resolve } from "node:path";
import { FlashEngine } from "../../core/FlashEngine";
import { PacExtractor } from "../../core/PacExtractor";
import { PortScanner } from "../../io/PortScanner";
import { ChipSets } from "../../utils/ChipSets";
import type { Command } from "../Command";

export class FlashCommand implements Command {
	name = "flash";
	description = "Flash a PAC file to a device";
	usage = "spd-tool flash <input.pac> [serial_port] [--dry-run]";

	async execute(args: string[]): Promise<void> {
		const pacPath = args[0] ? resolve(args[0]) : "";
		const portPath =
			args.find((a, i) => i > 0 && !a.startsWith("-")) ||
			(await PortScanner.findPort()) ||
			"/dev/ttyUSB0";
		const dryRun = args.includes("--dry-run");

		if (!pacPath) {
			console.error("❌ Invalid arguments for flashing.");
			return;
		}

		console.log(
			`\n🚀 SPD Flash Tool - Native Bun Flashing${dryRun ? " (DRY RUN)" : ""}`,
		);
		console.log(
			`----------------------------------------${dryRun ? "----------" : ""}`,
		);
		const extractor = new PacExtractor();
		const engine = new FlashEngine();

		try {
			if (!(await extractor.open(pacPath))) {
				console.error(`❌ Failed to open PAC file: ${pacPath}`);
				return;
			}

			if (dryRun) engine.setDryRun(true);

			engine.on("status", (msg: string) => console.log(msg));
			engine.on("progress", ({ percent }: { percent: string }) => {
				process.stdout.write(`\r  Progress: ${percent}% `);
				if (percent === "100.0") process.stdout.write("\n");
			});
			engine.on("error", (msg: string) => console.error(msg));

			console.log(`✅ PAC loaded. Waiting for device on ${portPath}...`);

			if (!(await engine.connect(portPath))) return;

			// Identify Chip
			const chipId = await engine.getChipId();
			const chipInfo = ChipSets.getInfo(chipId);
			console.log(
				`📱 Chipset: ${ChipSets.getName(chipId)} (0x${chipId.toString(16)})`,
			);

			// 1. Send FDL1
			const fdl1Id = extractor
				.getFiles()
				.find((f) => f.szFileID === "FDL" || f.szFileID === "FDL1")?.szFileID;
			if (!fdl1Id) {
				console.error("❌ FDL1 (or FDL) not found in PAC!");
				return;
			}

			const fdl1Addr =
				extractor.config?.fdl1?.address || chipInfo?.fdl1Addr || 0x008000c0;
			if (!(await engine.downloadFdl(extractor, fdl1Id, fdl1Addr))) {
				console.error("❌ FDL1 failed!");
				return;
			}
			if (extractor.config?.fdl1?.address) {
				console.log(
					`✅ FDL1 running (Address from XML: 0x${fdl1Addr.toString(16)}).`,
				);
			} else {
				console.log("✅ FDL1 running.");
			}

			// Wait a moment for FDL1 to initialize
			await Bun.sleep(500);

			// 2. Send FDL2
			const fdl2Id = "FDL2";
			if (!extractor.getFiles().some((f) => f.szFileID === fdl2Id)) {
				console.error("❌ FDL2 not found in PAC!");
				return;
			}

			engine.setFdl2Mode(true);
			const fdl2Addr =
				extractor.config?.fdl2?.address || chipInfo?.fdl2Addr || 0x9f000000;
			if (!(await engine.downloadFdl(extractor, fdl2Id, fdl2Addr))) {
				console.error("❌ FDL2 failed!");
				return;
			}
			if (extractor.config?.fdl2?.address) {
				console.log(
					`✅ FDL2 running (Address from XML: 0x${fdl2Addr.toString(16)}).`,
				);
			} else {
				console.log("✅ FDL2 running.");
			}
			await Bun.sleep(500);

			// Read Partition Table
			const partitions = await engine.readPartitionTable();
			if (partitions.length > 0) {
				console.log(`📊 Device Partitions: ${partitions.length} found`);
			}

			// 3. Flash images
			const files = extractor.getFiles();
			for (const entry of files) {
				// Skip FDLs and known metadata
				if (
					entry.szFileID === "FDL" ||
					entry.szFileID === "FDL1" ||
					entry.szFileID === "FDL2" ||
					entry.szFileName.toLowerCase().endsWith(".xml")
				)
					continue;

				// If XML config is available, honor the 'isSelected' flag
				if (extractor.config) {
					const xmlFile = extractor.config.files.find(
						(f) => f.id === entry.szFileID || f.fileName === entry.szFileName,
					);
					if (xmlFile && !xmlFile.isSelected) {
						console.log(`⏭️ Skipping ${entry.szFileID} (Not selected in XML)`);
						continue;
					}
				} else if (entry.nFileFlag !== 1) {
					// Fallback to nFileFlag if no XML is present
					continue;
				}

				if (!(await engine.flashImage(extractor, entry))) {
					console.error(`❌ Failed to flash ${entry.szFileID}`);
					return;
				}
			}

			console.log(`\n✨ Flashing completed successfully!`);
		} catch (error) {
			console.error(`\n💥 Fatal Error:`, error);
		} finally {
			extractor.close();
			engine.close();
		}
	}
}

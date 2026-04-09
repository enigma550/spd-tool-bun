import { basename, extname, resolve } from "node:path";
import { FlashEngine } from "../../core/FlashEngine";
import { PacExtractor, type PacFileEntry } from "../../core/PacExtractor";
import { PortScanner } from "../../io/PortScanner";
import type { SprdXmlFileInfo } from "../../parsers/XmlConfigParser";
import { ChipSets } from "../../utils/ChipSets";
import type { Command } from "../Command";

interface FlashOptions {
	portPath?: string;
	dryRun: boolean;
	reboot: boolean;
	clearUserdata: boolean;
	excludedNames: string[];
	onlyNames: string[];
	targetUserdataPath?: string;
}

export class FlashCommand implements Command {
	name = "flash";
	description = "Flash a PAC file to a device";
	usage =
		"spd-tool flash <input.pac> [serial_port] [--dry-run] [--reboot] [--clearuserdata] [--ignore-file <name>] [--exclude <name>] [--only <name>] [--target-userdata <path>]";

	async execute(args: string[]): Promise<void> {
		const pacPath = args[0] ? resolve(args[0]) : "";
		if (!pacPath) {
			console.error("❌ Invalid arguments for flashing.");
			return;
		}

		let options: FlashOptions;
		try {
			options = this.parseOptions(args.slice(1));
		} catch (error) {
			console.error(
				`❌ ${error instanceof Error ? error.message : "Invalid flash arguments."}`,
			);
			console.error(`Usage: ${this.usage}`);
			return;
		}

		const portPath =
			options.portPath || (await PortScanner.findPort()) || "/dev/ttyUSB0";

		if (
			options.targetUserdataPath &&
			!(await Bun.file(options.targetUserdataPath).exists())
		) {
			console.error(
				`❌ Target userdata image not found: ${options.targetUserdataPath}`,
			);
			return;
		}

		console.log(
			`\n🚀 SPD Flash Tool - Native Bun Flashing${options.dryRun ? " (DRY RUN)" : ""}`,
		);
		console.log(
			`----------------------------------------${options.dryRun ? "----------" : ""}`,
		);
		const extractor = new PacExtractor();
		const engine = new FlashEngine();

		try {
			if (!(await extractor.open(pacPath))) {
				console.error(`❌ Failed to open PAC file: ${pacPath}`);
				return;
			}

			if (options.dryRun) engine.setDryRun(true);

			engine.on("status", (msg: string) => console.log(msg));
			engine.on("progress", ({ percent }: { percent: string }) => {
				process.stdout.write(`\r  Progress: ${percent}% `);
				if (percent === "100.0") process.stdout.write("\n");
			});
			engine.on("error", (msg: string) => console.error(msg));

			console.log(`✅ PAC loaded. Waiting for device on ${portPath}...`);

			if (!(await engine.connect(portPath))) return;

			const chipId = await engine.getChipId();
			const chipInfo = ChipSets.getInfo(chipId);
			console.log(
				`📱 Chipset: ${ChipSets.getName(chipId)} (0x${chipId.toString(16)})`,
			);

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
			await Bun.sleep(500);

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

			if (options.clearUserdata) {
				console.log("🧹 Applying pre-flash userdata wipe...");
				if (!(await engine.factoryReset())) {
					console.error("❌ Failed to clear userdata before flashing.");
					return;
				}
			}

			const partitions = await engine.readPartitionTable();
			if (partitions.length > 0) {
				console.log(`📊 Device Partitions: ${partitions.length} found`);
			}

			const shouldFlashUserdataOverride =
				!!options.targetUserdataPath &&
				this.shouldIncludeSyntheticPartition("userdata", options);

			for (const entry of extractor.getFiles()) {
				const decision = this.decideEntryAction(extractor, entry, options);
				if (!decision.flash) {
					if (decision.reason) {
						console.log(`⏭️ Skipping ${entry.szFileID} (${decision.reason})`);
					}
					continue;
				}

				if (shouldFlashUserdataOverride && decision.isUserdata) {
					console.log(
						`⏭️ Skipping ${entry.szFileID} (userdata overridden by --target-userdata)`,
					);
					continue;
				}

				console.log(`➡️ Queueing ${entry.szFileID} (${entry.szFileName})`);
				if (!(await engine.flashImage(extractor, entry))) {
					console.error(`❌ Failed to flash ${entry.szFileID}`);
					return;
				}
			}

			if (options.targetUserdataPath && shouldFlashUserdataOverride) {
				console.log(
					`➡️ Queueing userdata override (${basename(options.targetUserdataPath)})`,
				);
				if (
					!(await engine.flashFileToPartition(
						"userdata",
						options.targetUserdataPath,
					))
				) {
					console.error("❌ Failed to flash userdata override.");
					return;
				}
			}

			console.log(`\n✨ Flashing completed successfully!`);

			if (options.reboot) {
				if (!(await engine.reboot())) {
					console.error("❌ Flash completed, but reboot failed.");
					return;
				}
			}
		} catch (error) {
			console.error(`\n💥 Fatal Error:`, error);
		} finally {
			extractor.close();
			engine.close();
		}
	}

	private parseOptions(args: string[]): FlashOptions {
		const options: FlashOptions = {
			dryRun: false,
			reboot: false,
			clearUserdata: false,
			excludedNames: [],
			onlyNames: [],
		};

		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			if (!arg) continue;

			switch (arg) {
				case "--dry-run":
					options.dryRun = true;
					break;
				case "--reboot":
					options.reboot = true;
					break;
				case "--clearuserdata":
					options.clearUserdata = true;
					break;
				case "--ignore-file":
				case "--exclude": {
					const value = args[++i];
					if (!value) throw new Error(`${arg} requires a value.`);
					options.excludedNames.push(this.normalizeToken(value));
					break;
				}
				case "--only": {
					const value = args[++i];
					if (!value) throw new Error(`${arg} requires a value.`);
					options.onlyNames.push(this.normalizeToken(value));
					break;
				}
				case "--target-userdata":
				case "--userdata-image": {
					const value = args[++i];
					if (!value) throw new Error(`${arg} requires a path.`);
					options.targetUserdataPath = resolve(value);
					break;
				}
				default:
					if (arg.startsWith("-")) {
						throw new Error(`Unknown option: ${arg}`);
					}
					if (options.portPath) {
						throw new Error(`Unexpected positional argument: ${arg}`);
					}
					options.portPath = arg;
					break;
			}
		}

		return options;
	}

	private decideEntryAction(
		extractor: PacExtractor,
		entry: PacFileEntry,
		options: FlashOptions,
	): { flash: boolean; reason?: string; isUserdata: boolean } {
		if (
			entry.szFileID === "FDL" ||
			entry.szFileID === "FDL1" ||
			entry.szFileID === "FDL2" ||
			entry.szFileName.toLowerCase().endsWith(".xml")
		) {
			return { flash: false, reason: "bootloader/metadata", isUserdata: false };
		}

		const xmlFile = this.findXmlInfo(extractor, entry);
		if (extractor.config) {
			if (xmlFile && !xmlFile.isSelected) {
				return {
					flash: false,
					reason: "not selected in XML",
					isUserdata: false,
				};
			}
		} else if (entry.nFileFlag !== 1) {
			return {
				flash: false,
				reason: "disabled by PAC flags",
				isUserdata: false,
			};
		}

		const entryNames = this.collectEntryNames(entry, xmlFile);
		const isUserdata = entryNames.includes("userdata");

		if (
			options.onlyNames.length > 0 &&
			!options.onlyNames.some((token) => this.matchesToken(entryNames, token))
		) {
			return { flash: false, reason: "filtered by --only", isUserdata };
		}

		if (
			options.excludedNames.some((token) =>
				this.matchesToken(entryNames, token),
			)
		) {
			return {
				flash: false,
				reason: "excluded by --ignore-file/--exclude",
				isUserdata,
			};
		}

		return { flash: true, isUserdata };
	}

	private shouldIncludeSyntheticPartition(
		partitionName: string,
		options: FlashOptions,
	): boolean {
		const names = [this.normalizeToken(partitionName)];
		if (
			options.onlyNames.length > 0 &&
			!options.onlyNames.some((token) => this.matchesToken(names, token))
		) {
			return false;
		}

		return !options.excludedNames.some((token) =>
			this.matchesToken(names, token),
		);
	}

	private findXmlInfo(
		extractor: PacExtractor,
		entry: PacFileEntry,
	): SprdXmlFileInfo | undefined {
		return extractor.config?.files.find(
			(file) =>
				file.id === entry.szFileID || file.fileName === entry.szFileName,
		);
	}

	private collectEntryNames(
		entry: PacFileEntry,
		xmlFile?: SprdXmlFileInfo,
	): string[] {
		const candidates = [
			entry.szFileID,
			entry.szFileName,
			this.baseNameWithoutExt(entry.szFileName),
			xmlFile?.id,
			xmlFile?.name,
			xmlFile?.fileName,
			xmlFile?.fileName ? this.baseNameWithoutExt(xmlFile.fileName) : undefined,
		];

		return [
			...new Set(
				candidates
					.filter((value): value is string => Boolean(value))
					.map((value) => this.normalizeToken(value)),
			),
		];
	}

	private baseNameWithoutExt(filePath: string): string {
		const base = basename(filePath);
		const ext = extname(base);
		return ext ? base.slice(0, -ext.length) : base;
	}

	private normalizeToken(value: string): string {
		return value.trim().toLowerCase();
	}

	private matchesToken(candidates: string[], token: string): boolean {
		return candidates.some((candidate) => candidate === token);
	}
}

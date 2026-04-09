import { describe, expect, test } from "bun:test";
import type { PacFileEntry } from "../../core/PacExtractor";
import {
	type SprdXmlConfig,
	SprdXmlConfigType,
} from "../../parsers/XmlConfigParser";
import { FlashCommand } from "./FlashCommand";

function makeEntry(overrides: Partial<PacFileEntry> = {}): PacFileEntry {
	return {
		szFileID: "SYSTEM",
		szFileName: "system.img",
		nFileSize: 1024,
		nFileFlag: 1,
		dwDataOffset: 0,
		dwReserved: [],
		dwCheckSum: 0,
		realOffset: 0n,
		realSize: 1024n,
		...overrides,
	};
}

function makeConfig(overrides: Partial<SprdXmlConfig> = {}): SprdXmlConfig {
	return {
		type: overrides.type ?? SprdXmlConfigType.Unknown,
		files: overrides.files ?? [],
		partitions: overrides.partitions ?? [],
		fdl1: overrides.fdl1,
		fdl2: overrides.fdl2,
		productName: overrides.productName,
		version: overrides.version,
	};
}

describe("FlashCommand selection helpers", () => {
	test("parseOptions captures selection and userdata overrides", () => {
		const command = new FlashCommand() as never as {
			parseOptions(args: string[]): Record<string, unknown>;
		};
		const options = command.parseOptions([
			"/dev/ttyUSB1",
			"--dry-run",
			"--reboot",
			"--clearuserdata",
			"--ignore-file",
			"persist",
			"--exclude",
			"cache",
			"--only",
			"userdata",
			"--target-userdata",
			"./userdata.img",
		]);

		expect(options).toMatchObject({
			portPath: "/dev/ttyUSB1",
			dryRun: true,
			reboot: true,
			clearUserdata: true,
			excludedNames: ["persist", "cache"],
			onlyNames: ["userdata"],
		});
		expect(String(options.targetUserdataPath)).toEndWith("/userdata.img");
	});

	test("decideEntryAction honors XML selection and explicit excludes", () => {
		const command = new FlashCommand() as never as {
			decideEntryAction(
				extractor: { config: SprdXmlConfig | null },
				entry: PacFileEntry,
				options: Record<string, unknown>,
			): { flash: boolean; reason?: string; isUserdata: boolean };
		};

		const extractor = {
			config: makeConfig({
				files: [
					{
						id: "PERSIST",
						name: "persist",
						fileName: "persist.img",
						type: "partition",
						address: 0,
						size: 0,
						isSelected: true,
					},
					{
						id: "CACHE",
						name: "cache",
						fileName: "cache.img",
						type: "partition",
						address: 0,
						size: 0,
						isSelected: false,
					},
				],
			}),
		};

		const persistDecision = command.decideEntryAction(
			extractor,
			makeEntry({ szFileID: "PERSIST", szFileName: "persist.img" }),
			{
				dryRun: true,
				reboot: false,
				clearUserdata: false,
				excludedNames: ["persist"],
				onlyNames: [],
			},
		);
		expect(persistDecision).toEqual({
			flash: false,
			reason: "excluded by --ignore-file/--exclude",
			isUserdata: false,
		});

		const cacheDecision = command.decideEntryAction(
			extractor,
			makeEntry({ szFileID: "CACHE", szFileName: "cache.img" }),
			{
				dryRun: true,
				reboot: false,
				clearUserdata: false,
				excludedNames: [],
				onlyNames: [],
			},
		);
		expect(cacheDecision).toEqual({
			flash: false,
			reason: "not selected in XML",
			isUserdata: false,
		});
	});

	test("userdata override stays eligible when filtered to userdata only", () => {
		const command = new FlashCommand() as never as {
			decideEntryAction(
				extractor: { config: SprdXmlConfig | null },
				entry: PacFileEntry,
				options: Record<string, unknown>,
			): { flash: boolean; reason?: string; isUserdata: boolean };
			shouldIncludeSyntheticPartition(
				partitionName: string,
				options: Record<string, unknown>,
			): boolean;
		};

		const options = {
			dryRun: true,
			reboot: false,
			clearUserdata: false,
			excludedNames: [],
			onlyNames: ["userdata"],
		};
		const userdataDecision = command.decideEntryAction(
			{ config: null },
			makeEntry({ szFileID: "USERDATA", szFileName: "userdata.img" }),
			options,
		);

		expect(userdataDecision).toEqual({
			flash: true,
			isUserdata: true,
		});
		expect(command.shouldIncludeSyntheticPartition("userdata", options)).toBe(
			true,
		);
		expect(command.shouldIncludeSyntheticPartition("persist", options)).toBe(
			false,
		);
	});
});

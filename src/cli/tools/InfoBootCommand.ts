import { resolve } from "node:path";
import { BootParser } from "../../parsers/BootParser";
import type { Command } from "../Command";

export class InfoBootCommand implements Command {
	name = "info-boot";
	description = "Show information about a boot image";
	usage = "spd-tool info-boot <file>";

	async execute(args: string[]): Promise<void> {
		const bootPath = args[0] ? resolve(args[0]) : "";
		if (!bootPath) {
			console.error("❌ Invalid boot image path.");
			return;
		}

		console.log(`\n🔍 Analyzing Boot Image: ${bootPath}`);

		const file = Bun.file(bootPath);
		if (!(await file.exists())) {
			console.error("❌ File not found.");
			return;
		}

		const size = file.size;
		if (size > 128 * 1024 * 1024) {
			console.error(
				`❌ File is too large (${(size / 1024 / 1024).toFixed(2)} MB) to be a boot image.`,
			);
			if (bootPath.toLowerCase().endsWith(".pac")) {
				console.error(
					"💡 This looks like a PAC file. Use 'extract' or 'flash' mode instead.",
				);
			}
			return;
		}

		const data = Buffer.from(await file.arrayBuffer());
		try {
			const info = BootParser.parse(data);
			console.log(`✅ Magic: ${info.header.magic}`);
			console.log(
				`✅ Android Version: ${BootParser.getAndroidVersion(info.header.osVersion)}`,
			);
			console.log(`✅ Page Size: ${info.header.pageSize}`);
			console.log(`✅ Header Version: ${info.header.headerVersion}`);
			console.log(
				`✅ Kernel Size: ${(info.header.kernelSize / 1024 / 1024).toFixed(2)} MB`,
			);
			console.log(
				`✅ Ramdisk Size: ${(info.header.ramdiskSize / 1024 / 1024).toFixed(2)} MB`,
			);
			console.log(`✅ Ramdisk Format: ${info.ramdiskFormat}`);
			console.log(
				`✅ SPRD Secure Header: ${info.hasSprdSecureHeader ? "YES" : "NO"}`,
			);
			if (info.header.cmdline)
				console.log(`📋 Cmdline: ${info.header.cmdline}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`❌ Failed to parse boot image: ${message}`);
		}
	}
}

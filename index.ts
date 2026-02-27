#!/usr/bin/env bun

import { CommandRegistry } from "./src/cli/CommandRegistry";
import { ReadImeiCommand } from "./src/cli/diag/ReadImeiCommand";
import { WriteImeiCommand } from "./src/cli/diag/WriteImeiCommand";
import { ErasePartitionCommand } from "./src/cli/flash/ErasePartitionCommand";
import { FactoryResetCommand } from "./src/cli/flash/FactoryResetCommand";
import { FlashCommand } from "./src/cli/flash/FlashCommand";
import { NVBackupCommand } from "./src/cli/flash/NVBackupCommand";
import { ReadPartitionCommand } from "./src/cli/flash/ReadPartitionCommand";
import { BackupNvCommand } from "./src/cli/service/BackupNvCommand";
import { FrpBypassCommand } from "./src/cli/service/FrpBypassCommand";
import { UnlockBlCommand } from "./src/cli/service/UnlockBlCommand";
import { ExtractCommand } from "./src/cli/tools/ExtractCommand";
import { InfoBootCommand } from "./src/cli/tools/InfoBootCommand";

async function main() {
	const registry = new CommandRegistry();

	registry.register(new ExtractCommand());
	registry.register(new FlashCommand());
	registry.register(new InfoBootCommand());
	registry.register(new ReadImeiCommand());
	registry.register(new WriteImeiCommand());
	registry.register(new UnlockBlCommand());
	registry.register(new BackupNvCommand());
	registry.register(new FrpBypassCommand());
	registry.register(new ReadPartitionCommand());
	registry.register(new ErasePartitionCommand());
	registry.register(new FactoryResetCommand());
	registry.register(new NVBackupCommand());

	const args = Bun.argv.slice(2);
	if (args.length === 0) {
		registry.printHelp();
		process.exit(1);
	}

	const commandName = args[0];
	const commandArgs = args.slice(1);
	const command = registry.get(commandName || "");

	if (command) {
		await command.execute(commandArgs);
	} else {
		console.error(`❌ Unknown command: ${commandName}`);
		registry.printHelp();
		process.exit(1);
	}
}

main().catch(console.error);

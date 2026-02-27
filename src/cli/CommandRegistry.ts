import type { Command } from "./Command";

export class CommandRegistry {
	private commands: Map<string, Command> = new Map();

	register(command: Command) {
		this.commands.set(command.name, command);
	}

	get(name: string): Command | undefined {
		return this.commands.get(name);
	}

	getAll(): Command[] {
		return Array.from(this.commands.values());
	}

	printHelp() {
		console.log("\n📖 Usage:");
		for (const cmd of this.getAll()) {
			console.log(`  ${cmd.name.padEnd(16)}: ${cmd.usage}`);
		}
		console.log("\n💡 Note: Arguments in [brackets] are optional.");
		console.log("   Serial port is auto-detected on most systems if omitted.");

		console.log("\nExample:");
		console.log("  spd-tool flash firmware.pac /dev/ttyUSB0 --dry-run");
		console.log("  spd-tool read-imei");
	}
}

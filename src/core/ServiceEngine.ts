import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { FlashEngine } from "./FlashEngine";

export class ServiceEngine {
	private engine: FlashEngine;

	constructor(engine: FlashEngine) {
		this.engine = engine;
	}

	/**
	 * Automatically identify and backup calibration/NV partitions
	 */
	async backupCalibration(destDir: string): Promise<string[]> {
		console.log(`\n📋 Starting Calibration Backup to: ${destDir}`);
		await fs.mkdir(destDir, { recursive: true });

		const partitions = await this.engine.readPartitionTable();
		const nvPatterns = [
			"nv",
			"cali",
			"fixnv",
			"persist",
			"prodnv",
			"backupfixnv",
			"misc",
		];
		const targets = partitions.filter((p) =>
			nvPatterns.some((pattern) => p.name.toLowerCase().includes(pattern)),
		);

		if (targets.length === 0) {
			console.log("⚠️ No calibration partitions found.");
			return [];
		}

		console.log(`📦 Found ${targets.length} target partitions.`);
		const backedUp: string[] = [];

		for (const part of targets) {
			const size = part.size > 0n ? Number(part.size) : 1024 * 1024; // Default 1MB if size unknown
			console.log(
				`📥 Reading ${part.name} (${(size / 1024).toFixed(0)} KB)...`,
			);

			const data = await this.engine.readPartition(part.name, size);
			if (data) {
				const filePath = path.join(destDir, `${part.name}.bin`);
				await fs.writeFile(filePath, data);
				backedUp.push(part.name);
				console.log(`✅ Saved to ${filePath}`);
			} else {
				console.error(`❌ Failed to read ${part.name}`);
			}
		}

		return backedUp;
	}

	/**
	 * Perform FRP (Factory Reset Protection) bypass by erasing specific partitions
	 */
	async frpBypass(): Promise<boolean> {
		console.log("\n🛡️ Starting FRP Bypass...");
		const frpPatterns = ["persist", "frp", "config"];
		const partitions = await this.engine.readPartitionTable();
		const targets = partitions.filter((p) =>
			frpPatterns.some((pattern) => p.name.toLowerCase() === pattern),
		);

		if (targets.length === 0) {
			console.error("❌ No FRP-related partitions found on this device.");
			return false;
		}

		let success = true;
		for (const part of targets) {
			if (!(await this.engine.erasePartition(part.name))) {
				success = false;
				console.error(`❌ Failed to erase ${part.name}`);
			} else {
				console.log(`✅ Erased ${part.name} successfully.`);
			}
		}

		if (success) {
			console.log(
				"\n✨ FRP Bypass complete! The device should now be unlocked.",
			);
		}
		return success;
	}

	/**
	 * Manage A/B slot switching (placeholder for actual protocol implementation)
	 */
	async switchSlot(slot: "a" | "b"): Promise<boolean> {
		console.log(`\n🔄 Switching boot slot to: ${slot.toUpperCase()}`);
		// In many Unisoc implementations, this is done by writing to the 'misc' or 'bootctrl' partition
		// or using a specific BSL command if available.
		// For now, we'll mark it as successfully simulated.
		if (this.engine.isDryRun) {
			console.log(`[DRY-RUN] Simulating slot switch to ${slot}...`);
			return true;
		}

		console.error(
			"❌ Slot switching not yet fully implemented for this chipset.",
		);
		return false;
	}
}

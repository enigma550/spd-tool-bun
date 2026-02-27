import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ChipSets } from "../utils/ChipSets";

export interface FdlResource {
	name: string;
	chipIds: number[];
	fdl1File?: string;
	fdl2File?: string;
	fdl1Addr: number;
	fdl2Addr: number;
	description?: string;
}

/**
 * FDL Database - Manages embedded FDL files
 */
export namespace FdlDatabase {
	let resourcePath = "resources/fdl";

	// FDL resource definitions
	const fdlResources: FdlResource[] = [
		// ========================================
		// SC9863A / T610 Series
		// ========================================
		{
			name: "SC9863A",
			chipIds: [0x9863],
			fdl1File: "fdl1-sc9863a.bin",
			fdl2File: "fdl2-sc9863a.bin",
			fdl1Addr: 0x65000800,
			fdl2Addr: 0x9efffe00,
			description: "FDL for SC9863A (T310)",
		},
		{
			name: "T610/T612/T616/T618",
			chipIds: [0x0610, 0x0612, 0x0616, 0x0618, 0x0512],
			fdl1File: "fdl1-t610.bin",
			fdl2File: "fdl2-t610.bin",
			fdl1Addr: 0x65000800,
			fdl2Addr: 0x9efffe00,
			description: "FDL for T610/T612/T616/T618 series",
		},

		// ========================================
		// T700/T760/T770 Series
		// ========================================
		{
			name: "T760/T770",
			chipIds: [0x0760, 0x0770],
			fdl1File: "fdl1-t760.bin",
			fdl2File: "fdl2-t760.bin",
			fdl1Addr: 0x65000800,
			fdl2Addr: 0xb4fffe00,
			description: "FDL for T760/T770 (requires signature bypass)",
		},
		{
			name: "T700",
			chipIds: [0x0700],
			fdl1File: "fdl1-t700.bin",
			fdl2File: "fdl2-t700.bin",
			fdl1Addr: 0x65000800,
			fdl2Addr: 0xb4fffe00,
			description: "FDL for T700 (requires signature bypass)",
		},

		// ========================================
		// T606 Series
		// ========================================
		{
			name: "T606",
			chipIds: [0x0606, 0x9230],
			fdl1File: "fdl1-t606.bin",
			fdl2File: "fdl2-t606.bin",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			description: "FDL for T606/UMS9230",
		},

		// ========================================
		// T310 Series
		// ========================================
		{
			name: "T310",
			chipIds: [0x0310, 0x0312],
			fdl1File: "fdl1-t310.bin",
			fdl2File: "fdl2-t310.bin",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			description: "FDL for T310/UMS312",
		},

		// ========================================
		// Legacy Platforms
		// ========================================
		{
			name: "SC9832",
			chipIds: [0x9832],
			fdl1File: "fdl1-sc9832.bin",
			fdl2File: "fdl2-sc9832.bin",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			description: "FDL for SC9832E",
		},
		{
			name: "SC7731",
			chipIds: [0x7731],
			fdl1File: "fdl1-sc7731.bin",
			fdl2File: "fdl2-sc7731.bin",
			fdl1Addr: 0x5000,
			fdl2Addr: 0x8a800000,
			description: "FDL for SC7731 series",
		},

		// ========================================
		// Feature Phones
		// ========================================
		{
			name: "T117/UMS9117",
			chipIds: [0x0117, 0x9117],
			fdl1File: "fdl1-t117.bin",
			fdl2File: "fdl2-t117.bin",
			fdl1Addr: 0x6200,
			fdl2Addr: 0x80100000,
			description: "FDL for T117/UMS9117 (4G Feature Phone)",
		},
	];

	/**
	 * Set custom resource path
	 */
	export function setResourcePath(path: string) {
		resourcePath = path;
	}

	/**
	 * Get FDL resource for chip ID
	 */
	export function getFdlResource(chipId: number): FdlResource | null {
		const baseId = chipId > 0xffff ? chipId >> 16 : chipId;

		for (const resource of fdlResources) {
			if (
				resource.chipIds.includes(chipId) ||
				resource.chipIds.includes(baseId)
			) {
				return resource;
			}
		}

		return null;
	}

	/**
	 * Load FDL1 from resource
	 */
	export async function loadFdl1(chipId: number): Promise<Buffer | null> {
		const resource = getFdlResource(chipId);
		if (!resource || !resource.fdl1File) {
			console.warn(
				`No FDL1 resource found for chip 0x${chipId.toString(16)} (${ChipSets.getName(chipId)})`,
			);
			return null;
		}

		try {
			const fdlPath = join(resourcePath, resource.fdl1File);
			const data = await readFile(fdlPath);
			console.log(
				`✅ Loaded FDL1: ${resource.fdl1File} (${data.length} bytes) for ${resource.name}`,
			);
			return data;
		} catch (error) {
			console.error(`Failed to load FDL1 ${resource.fdl1File}:`, error);
			return null;
		}
	}

	/**
	 * Load FDL2 from resource
	 */
	export async function loadFdl2(chipId: number): Promise<Buffer | null> {
		const resource = getFdlResource(chipId);
		if (!resource || !resource.fdl2File) {
			console.warn(
				`No FDL2 resource found for chip 0x${chipId.toString(16)} (${ChipSets.getName(chipId)})`,
			);
			return null;
		}

		try {
			const fdlPath = join(resourcePath, resource.fdl2File);
			const data = await readFile(fdlPath);
			console.log(
				`✅ Loaded FDL2: ${resource.fdl2File} (${data.length} bytes) for ${resource.name}`,
			);
			return data;
		} catch (error) {
			console.error(`Failed to load FDL2 ${resource.fdl2File}:`, error);
			return null;
		}
	}

	/**
	 * Get FDL addresses for chip
	 */
	export function getFdlAddresses(
		chipId: number,
	): { fdl1Addr: number; fdl2Addr: number } | null {
		const resource = getFdlResource(chipId);
		if (resource) {
			return {
				fdl1Addr: resource.fdl1Addr,
				fdl2Addr: resource.fdl2Addr,
			};
		}

		// Fallback to ChipSets database
		const chipInfo = ChipSets.getInfo(chipId);
		if (chipInfo) {
			return {
				fdl1Addr: chipInfo.fdl1Addr,
				fdl2Addr: chipInfo.fdl2Addr,
			};
		}

		return null;
	}

	/**
	 * Check if FDL resource exists for chip
	 */
	export function hasFdlResource(chipId: number): boolean {
		return getFdlResource(chipId) !== null;
	}

	/**
	 * List all available FDL resources
	 */
	export function listResources(): FdlResource[] {
		return [...fdlResources];
	}

	/**
	 * Get resource info as string
	 */
	export function getResourceInfo(chipId: number): string {
		const resource = getFdlResource(chipId);
		if (!resource) {
			return `No FDL resource available for chip 0x${chipId.toString(16)}`;
		}

		const lines = [
			`FDL Resource: ${resource.name}`,
			`  Description: ${resource.description || "N/A"}`,
			`  FDL1: ${resource.fdl1File || "N/A"} @ 0x${resource.fdl1Addr.toString(16)}`,
			`  FDL2: ${resource.fdl2File || "N/A"} @ 0x${resource.fdl2Addr.toString(16)}`,
			`  Chip IDs: ${resource.chipIds.map((id) => `0x${id.toString(16)}`).join(", ")}`,
		];

		return lines.join("\n");
	}
}

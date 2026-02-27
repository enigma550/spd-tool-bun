/**
 * Common types and interfaces for spd-tool-bun
 */

/**
 * Represents a partition entry on a Unisoc device
 */
export interface PartitionEntry {
	name: string;
	size: bigint;
	address?: bigint;
	id?: string;
}

/**
 * Progress information for lengthy operations (e.g., flashing)
 */
export interface FlashProgress {
	percent: string;
	entry: string;
	processed?: bigint;
	total?: bigint;
}

/**
 * Standard callback for progress updates
 */
export type ProgressCallback = (current: bigint, total: bigint) => void;

/**
 * Log callback type
 */
export type LogCallback = (message: string) => void;

/**
 * Handle type for FFI (Pointer-like number or FD)
 */
export type NativeHandle = number | bigint | null;

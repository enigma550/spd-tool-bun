/**
 * Spreadtrum/Unisoc USB Vendor and Product IDs
 */
export namespace SprdUsbIds {
	// ========================================
	// Vendor IDs
	// ========================================
	export const VID_SPRD = 0x1782;
	export const VID_UNISOC = 0x1782;
	export const VID_SAMSUNG = 0x04e8;
	export const VID_HUAWEI = 0x12d1;
	export const VID_ZTE = 0x19d2;
	export const VID_ALCATEL = 0x1bbb;
	export const VID_LENOVO = 0x17ef;
	export const VID_REALME = 0x22d9;
	export const VID_XIAOMI = 0x2717;
	export const VID_NOKIA = 0x0421;
	export const VID_TRANSSION = 0x2a47;

	// ========================================
	// Download Mode PIDs (Standard)
	// ========================================
	export const PID_DOWNLOAD = 0x4d00; // Standard download mode
	export const PID_DOWNLOAD_2 = 0x4d01; // Download mode variant
	export const PID_DOWNLOAD_3 = 0x4d02; // Download mode variant 2
	export const PID_DOWNLOAD_4 = 0x4d03; // Download mode variant 3
	export const PID_U2S_DIAG = 0x4d00; // U2S Diag (SPRD U2S Diag)

	// ========================================
	// Download Mode PIDs (New Platform)
	// ========================================
	export const PID_UMS_DOWNLOAD = 0x5000; // UMS series download mode
	export const PID_UWS_DOWNLOAD = 0x5001; // UWS series download mode
	export const PID_T606_DOWNLOAD = 0x5002; // T606 download mode

	// ========================================
	// Diagnostic Mode PIDs
	// ========================================
	export const PID_DIAG = 0x4d10; // Standard diagnostic mode
	export const PID_DIAG_2 = 0x4d11; // Diagnostic mode variant
	export const PID_DIAG_3 = 0x4d14; // Diagnostic mode variant 2

	// ========================================
	// Other Mode PIDs
	// ========================================
	export const PID_ADB = 0x4d12; // ADB mode
	export const PID_ADB_2 = 0x4d13; // ADB mode variant
	export const PID_MTP = 0x4d15; // MTP mode
	export const PID_MTP_2 = 0x4d16; // MTP mode variant
	export const PID_CDC = 0x4d20; // CDC mode
	export const PID_ACM = 0x4d21; // ACM mode
	export const PID_SERIAL = 0x4d22; // Serial mode
	export const PID_RNDIS = 0x4d30; // RNDIS network mode
	export const PID_FASTBOOT = 0x4d40; // Fastboot mode

	// ========================================
	// Samsung PIDs
	// ========================================
	export const PID_SAMSUNG_SPRD = 0x685d; // Samsung Spreadtrum download
	export const PID_SAMSUNG_SPRD_2 = 0x685c; // Samsung Spreadtrum download 2
	export const PID_SAMSUNG_DIAG = 0x6860; // Samsung diagnostic
	export const PID_SAMSUNG_DIAG_2 = 0x6862; // Samsung diagnostic 2

	// ========================================
	// Huawei PIDs
	// ========================================
	export const PID_HUAWEI_DOWNLOAD = 0x1001;
	export const PID_HUAWEI_DOWNLOAD_2 = 0x1035;
	export const PID_HUAWEI_DOWNLOAD_3 = 0x1c05;

	// ========================================
	// ZTE PIDs
	// ========================================
	export const PID_ZTE_DOWNLOAD = 0x0016;
	export const PID_ZTE_DOWNLOAD_2 = 0x0034;
	export const PID_ZTE_DOWNLOAD_3 = 0x1403;
	export const PID_ZTE_DIAG = 0x0117;
	export const PID_ZTE_DIAG_2 = 0x0076;

	// ========================================
	// Alcatel/TCL PIDs
	// ========================================
	export const PID_ALCATEL_DOWNLOAD = 0x0536;
	export const PID_ALCATEL_DOWNLOAD_2 = 0x0530;
	export const PID_ALCATEL_DOWNLOAD_3 = 0x0510;

	// ========================================
	// Lenovo PIDs
	// ========================================
	export const PID_LENOVO_DOWNLOAD = 0x7890;

	// ========================================
	// Realme/OPPO PIDs
	// ========================================
	export const PID_REALME_DOWNLOAD = 0x2762;
	export const PID_REALME_DOWNLOAD_2 = 0x2763;
	export const PID_REALME_DOWNLOAD_3 = 0x2764;

	// ========================================
	// Xiaomi PIDs
	// ========================================
	export const PID_XIAOMI_DOWNLOAD = 0xff48;

	// ========================================
	// Nokia PIDs
	// ========================================
	export const PID_NOKIA_DOWNLOAD = 0x0600;
	export const PID_NOKIA_DOWNLOAD_2 = 0x0601;
	export const PID_NOKIA_DOWNLOAD_3 = 0x0602;

	// ========================================
	// Infinix/Tecno/Itel (Transsion) PIDs
	// ========================================
	export const PID_TRANSSION_DOWNLOAD = 0x2012;

	/**
	 * Check if VID is a Spreadtrum device
	 */
	export function isSprdVid(vid: number): boolean {
		return (
			vid === VID_SPRD ||
			vid === VID_SAMSUNG ||
			vid === VID_HUAWEI ||
			vid === VID_ZTE ||
			vid === VID_ALCATEL ||
			vid === VID_LENOVO ||
			vid === VID_REALME ||
			vid === VID_XIAOMI ||
			vid === VID_NOKIA ||
			vid === VID_TRANSSION
		);
	}

	/**
	 * Check if PID is a download mode
	 */
	export function isDownloadPid(pid: number): boolean {
		return (
			pid === PID_DOWNLOAD ||
			pid === PID_DOWNLOAD_2 ||
			pid === PID_DOWNLOAD_3 ||
			pid === PID_DOWNLOAD_4 ||
			pid === PID_U2S_DIAG ||
			pid === PID_UMS_DOWNLOAD ||
			pid === PID_UWS_DOWNLOAD ||
			pid === PID_T606_DOWNLOAD ||
			pid === PID_CDC ||
			pid === PID_ACM ||
			pid === PID_SERIAL ||
			pid === PID_SAMSUNG_SPRD ||
			pid === PID_SAMSUNG_SPRD_2 ||
			pid === PID_HUAWEI_DOWNLOAD ||
			pid === PID_HUAWEI_DOWNLOAD_2 ||
			pid === PID_HUAWEI_DOWNLOAD_3 ||
			pid === PID_ZTE_DOWNLOAD ||
			pid === PID_ZTE_DOWNLOAD_2 ||
			pid === PID_ZTE_DOWNLOAD_3 ||
			pid === PID_ALCATEL_DOWNLOAD ||
			pid === PID_ALCATEL_DOWNLOAD_2 ||
			pid === PID_ALCATEL_DOWNLOAD_3 ||
			pid === PID_LENOVO_DOWNLOAD ||
			pid === PID_REALME_DOWNLOAD ||
			pid === PID_REALME_DOWNLOAD_2 ||
			pid === PID_REALME_DOWNLOAD_3 ||
			pid === PID_XIAOMI_DOWNLOAD ||
			pid === PID_NOKIA_DOWNLOAD ||
			pid === PID_NOKIA_DOWNLOAD_2 ||
			pid === PID_NOKIA_DOWNLOAD_3 ||
			pid === PID_TRANSSION_DOWNLOAD
		);
	}

	/**
	 * Check if PID is a diagnostic mode
	 */
	export function isDiagPid(pid: number): boolean {
		return (
			pid === PID_DIAG ||
			pid === PID_DIAG_2 ||
			pid === PID_DIAG_3 ||
			pid === PID_SAMSUNG_DIAG ||
			pid === PID_SAMSUNG_DIAG_2 ||
			pid === PID_ZTE_DIAG ||
			pid === PID_ZTE_DIAG_2
		);
	}

	/**
	 * Get vendor name from VID
	 */
	export function getVendorName(vid: number): string {
		switch (vid) {
			case VID_SPRD:
				return "Spreadtrum/Unisoc";
			case VID_SAMSUNG:
				return "Samsung";
			case VID_HUAWEI:
				return "Huawei";
			case VID_ZTE:
				return "ZTE";
			case VID_ALCATEL:
				return "Alcatel/TCL";
			case VID_LENOVO:
				return "Lenovo";
			case VID_REALME:
				return "Realme/OPPO";
			case VID_XIAOMI:
				return "Xiaomi";
			case VID_NOKIA:
				return "Nokia";
			case VID_TRANSSION:
				return "Transsion (Infinix/Tecno/Itel)";
			default:
				return `Unknown (0x${vid.toString(16)})`;
		}
	}

	/**
	 * Get device mode from PID
	 */
	export function getDeviceMode(pid: number): string {
		if (isDownloadPid(pid)) return "Download Mode";
		if (isDiagPid(pid)) return "Diagnostic Mode";
		if (pid === PID_ADB || pid === PID_ADB_2) return "ADB Mode";
		if (pid === PID_FASTBOOT) return "Fastboot Mode";
		if (pid === PID_MTP || pid === PID_MTP_2) return "MTP Mode";
		return "Unknown Mode";
	}
}

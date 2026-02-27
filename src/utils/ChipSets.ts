export interface ChipInfo {
	name: string;
	fdl1Addr: number;
	fdl2Addr: number;
	/** Exec address for signature bypass (0 if not needed) */
	execAddr?: number;
	/** Whether this chip requires exploit for FDL download */
	requiresExploit?: boolean;
	/** Storage type: eMMC, UFS, NOR/NAND, SPI NOR */
	storageType?: string;
	/** Platform category */
	category?: "feature_phone" | "smartphone" | "5g" | "wearable" | "iot";
}

export namespace ChipSets {
	const chips: Record<number, ChipInfo> = {
		// ========================================
		// SC6xxx Feature Phone Series
		// ========================================
		25856: {
			name: "SC6500",
			fdl1Addr: 0x40004000,
			fdl2Addr: 0x14000000,
			storageType: "NOR/NAND",
			category: "feature_phone",
		},
		25904: {
			name: "SC6530",
			fdl1Addr: 0x40004000,
			fdl2Addr: 0x14000000,
			storageType: "NOR/NAND",
			category: "feature_phone",
		},
		25905: {
			name: "SC6531",
			fdl1Addr: 0x40004000,
			fdl2Addr: 0x14000000,
			storageType: "NOR/NAND",
			category: "feature_phone",
		},
		25907: {
			name: "SC6533",
			fdl1Addr: 0x40004000,
			fdl2Addr: 0x14000000,
			storageType: "NOR/NAND",
			category: "feature_phone",
		},
		26112: {
			name: "SC6600",
			fdl1Addr: 0x40004000,
			fdl2Addr: 0x14000000,
			storageType: "NOR/NAND",
			category: "feature_phone",
		},
		26128: {
			name: "SC6610",
			fdl1Addr: 0x40004000,
			fdl2Addr: 0x14000000,
			storageType: "NOR/NAND",
			category: "feature_phone",
		},
		26144: {
			name: "SC6620",
			fdl1Addr: 0x40004000,
			fdl2Addr: 0x14000000,
			storageType: "NOR/NAND",
			category: "feature_phone",
		},
		26624: {
			name: "SC6800",
			fdl1Addr: 0x40004000,
			fdl2Addr: 0x14000000,
			storageType: "NOR/NAND",
			category: "feature_phone",
		},
		1697710081: {
			name: "SC6531E-FM",
			fdl1Addr: 0x40004000,
			fdl2Addr: 0x14000000,
			storageType: "NOR/NAND",
			category: "feature_phone",
		},
		1697710082: {
			name: "SC6531DA",
			fdl1Addr: 0x40004000,
			fdl2Addr: 0x14000000,
			storageType: "NOR/NAND",
			category: "feature_phone",
		},
		1697710083: {
			name: "SC6531H",
			fdl1Addr: 0x40004000,
			fdl2Addr: 0x14000000,
			storageType: "NOR/NAND",
			category: "feature_phone",
		},

		// ========================================
		// SC77xx Series (Legacy 3G/4G)
		// ========================================
		30465: {
			name: "SC7701",
			fdl1Addr: 0x5000,
			fdl2Addr: 0x8a800000,
			storageType: "eMMC",
			category: "smartphone",
		},
		30466: {
			name: "SC7702",
			fdl1Addr: 0x5000,
			fdl2Addr: 0x8a800000,
			storageType: "eMMC",
			category: "smartphone",
		},
		30480: {
			name: "SC7710",
			fdl1Addr: 0x5000,
			fdl2Addr: 0x8a800000,
			storageType: "eMMC",
			category: "smartphone",
		},
		30485: {
			name: "SC7715",
			fdl1Addr: 0x5000,
			fdl2Addr: 0x8a800000,
			storageType: "eMMC",
			category: "smartphone",
		},
		30496: {
			name: "SC7720",
			fdl1Addr: 0x5000,
			fdl2Addr: 0x8a800000,
			storageType: "eMMC",
			category: "smartphone",
		},
		30503: {
			name: "SC7727S",
			fdl1Addr: 0x5000,
			fdl2Addr: 0x8a800000,
			storageType: "eMMC",
			category: "smartphone",
		},
		30512: {
			name: "SC7730",
			fdl1Addr: 0x5000,
			fdl2Addr: 0x8a800000,
			storageType: "eMMC",
			category: "smartphone",
		},
		30513: {
			name: "SC7731",
			fdl1Addr: 0x5000,
			fdl2Addr: 0x8a800000,
			storageType: "eMMC",
			category: "smartphone",
		},
		1999699970: {
			name: "SC7731E",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			storageType: "eMMC",
			category: "smartphone",
		},
		1999699973: {
			name: "SC7731EF",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			storageType: "eMMC",
			category: "smartphone",
		},

		// ========================================
		// SC85xx / Unisoc T Series
		// ========================================
		34081: {
			name: "SC8521E",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			storageType: "eMMC",
			category: "wearable",
		},
		34113: {
			name: "SC8541E",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			storageType: "eMMC",
			category: "smartphone",
		},
		34129: {
			name: "SC8551E",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			storageType: "eMMC",
			category: "smartphone",
		},
		34177: {
			name: "SC8581",
			fdl1Addr: 0x65000800,
			fdl2Addr: 0x9efffe00,
			execAddr: 0x65012f48,
			requiresExploit: true,
			storageType: "eMMC",
			category: "smartphone",
		},
		2239823873: {
			name: "SC8581A",
			fdl1Addr: 0x65000800,
			fdl2Addr: 0x9efffe00,
			execAddr: 0x65012f48,
			requiresExploit: true,
			storageType: "eMMC",
			category: "smartphone",
		},
		2239823874: {
			name: "UIS8581",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			execAddr: 0x65012f48,
			requiresExploit: true,
			storageType: "eMMC",
			category: "iot",
		},

		// ========================================
		// SC96xx/SC98xx Series
		// ========================================
		38400: {
			name: "SC9600",
			fdl1Addr: 0x5000,
			fdl2Addr: 0x8a800000,
			storageType: "eMMC",
			category: "smartphone",
		},
		38432: {
			name: "SC9620",
			fdl1Addr: 0x5000,
			fdl2Addr: 0x8a800000,
			storageType: "eMMC",
			category: "smartphone",
		},
		38944: {
			name: "SC9820",
			fdl1Addr: 0x5000,
			fdl2Addr: 0x8a800000,
			storageType: "eMMC",
			category: "smartphone",
		},
		2552233986: {
			name: "SC9820E",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			storageType: "eMMC",
			category: "smartphone",
		},
		38960: {
			name: "SC9830",
			fdl1Addr: 0x5000,
			fdl2Addr: 0x8a800000,
			storageType: "eMMC",
			category: "smartphone",
		},
		38962: {
			name: "SC9832",
			fdl1Addr: 0x5000,
			fdl2Addr: 0x8a800000,
			storageType: "eMMC",
			category: "smartphone",
		},
		2553413634: {
			name: "SC9832E",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			storageType: "eMMC",
			category: "smartphone",
		},
		38992: {
			name: "SC9850",
			fdl1Addr: 0x65000000,
			fdl2Addr: 0x8c800000,
			execAddr: 0x65012000,
			requiresExploit: true,
			storageType: "eMMC",
			category: "smartphone",
		},
		38995: {
			name: "SC9853i",
			fdl1Addr: 0x65000800,
			fdl2Addr: 0x9efffe00,
			execAddr: 0x65012f48,
			requiresExploit: true,
			storageType: "eMMC",
			category: "smartphone",
		},
		39008: {
			name: "SC9860",
			fdl1Addr: 0x65000000,
			fdl2Addr: 0x8c800000,
			execAddr: 0x65012000,
			requiresExploit: true,
			storageType: "eMMC",
			category: "smartphone",
		},
		39009: {
			name: "SC9861",
			fdl1Addr: 0x65000000,
			fdl2Addr: 0x8c800000,
			execAddr: 0x65012000,
			requiresExploit: true,
			storageType: "eMMC",
			category: "smartphone",
		},
		39011: {
			name: "SC9863A",
			fdl1Addr: 0x65000800,
			fdl2Addr: 0x9efffe00,
			execAddr: 0x65012f48,
			requiresExploit: true,
			storageType: "eMMC",
			category: "smartphone",
		},

		// ========================================
		// Unisoc T Series (4G)
		// ========================================
		784: {
			name: "T310",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			storageType: "eMMC",
			category: "smartphone",
		},
		786: {
			name: "UMS312",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			storageType: "eMMC",
			category: "smartphone",
		},
		1542: {
			name: "T606",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			storageType: "eMMC",
			category: "smartphone",
		},
		37424: {
			name: "UMS9230",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			storageType: "eMMC",
			category: "smartphone",
		},
		1552: {
			name: "T610",
			fdl1Addr: 0x65000800,
			fdl2Addr: 0x9efffe00,
			execAddr: 0x65012f48,
			requiresExploit: true,
			storageType: "eMMC",
			category: "smartphone",
		},
		1554: {
			name: "T612",
			fdl1Addr: 0x65000800,
			fdl2Addr: 0x9efffe00,
			execAddr: 0x65012f48,
			requiresExploit: true,
			storageType: "eMMC",
			category: "smartphone",
		},
		1558: {
			name: "T616",
			fdl1Addr: 0x65000800,
			fdl2Addr: 0x9efffe00,
			execAddr: 0x65012f48,
			requiresExploit: true,
			storageType: "eMMC",
			category: "smartphone",
		},
		1560: {
			name: "T618",
			fdl1Addr: 0x65000800,
			fdl2Addr: 0x9efffe00,
			execAddr: 0x65012f48,
			requiresExploit: true,
			storageType: "eMMC",
			category: "smartphone",
		},
		1298: {
			name: "UMS512",
			fdl1Addr: 0x65000800,
			fdl2Addr: 0x9efffe00,
			execAddr: 0x65012f48,
			requiresExploit: true,
			storageType: "eMMC",
			category: "smartphone",
		},
		1792: {
			name: "T700",
			fdl1Addr: 0x65000800,
			fdl2Addr: 0xb4fffe00,
			execAddr: 0x65012f48,
			requiresExploit: true,
			storageType: "eMMC",
			category: "smartphone",
		},
		1888: {
			name: "T760",
			fdl1Addr: 0x65000800,
			fdl2Addr: 0xb4fffe00,
			execAddr: 0x65012f48,
			requiresExploit: true,
			storageType: "eMMC",
			category: "smartphone",
		},
		1904: {
			name: "T770",
			fdl1Addr: 0x65000800,
			fdl2Addr: 0xb4fffe00,
			execAddr: 0x65012f48,
			requiresExploit: true,
			storageType: "eMMC",
			category: "smartphone",
		},

		// ========================================
		// Unisoc T Series (5G)
		// ========================================
		2080: {
			name: "T820",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9f000000,
			storageType: "UFS",
			category: "5g",
		},
		2304: {
			name: "T900",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9f000000,
			storageType: "UFS",
			category: "5g",
		},
		1856: {
			name: "T740",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9f000000,
			storageType: "UFS",
			category: "5g",
		},
		1872: {
			name: "T750",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9f000000,
			storageType: "UFS",
			category: "5g",
		},
		1893: {
			name: "T765",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9f000000,
			storageType: "UFS",
			category: "5g",
		},
		29968: {
			name: "T7510",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9f000000,
			storageType: "UFS",
			category: "5g",
		},
		29984: {
			name: "T7520",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9f000000,
			storageType: "UFS",
			category: "5g",
		},
		29989: {
			name: "T7525",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9f000000,
			storageType: "UFS",
			category: "5g",
		},
		30000: {
			name: "T7530",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9f000000,
			storageType: "UFS",
			category: "5g",
		},
		30048: {
			name: "T7560",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9f000000,
			storageType: "UFS",
			category: "5g",
		},
		30064: {
			name: "T7570",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9f000000,
			storageType: "UFS",
			category: "5g",
		},
		32768: {
			name: "T8000",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9f000000,
			storageType: "UFS",
			category: "5g",
		},
		33280: {
			name: "T8200",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9f000000,
			storageType: "UFS",
			category: "5g",
		},

		// ========================================
		// 4G Feature Phones T1xx / W Series
		// ========================================
		263: {
			name: "T107",
			fdl1Addr: 0x6200,
			fdl2Addr: 0x80100000,
			storageType: "eMMC",
			category: "feature_phone",
		},
		279: {
			name: "T117",
			fdl1Addr: 0x6200,
			fdl2Addr: 0x80100000,
			storageType: "eMMC",
			category: "feature_phone",
		},
		37127: {
			name: "UMS9107",
			fdl1Addr: 0x6200,
			fdl2Addr: 0x80100000,
			storageType: "eMMC",
			category: "feature_phone",
		},
		37143: {
			name: "UMS9117",
			fdl1Addr: 0x6200,
			fdl2Addr: 0x80100000,
			storageType: "eMMC",
			category: "feature_phone",
		},
		535: {
			name: "W217",
			fdl1Addr: 0x40004000,
			fdl2Addr: 0x14000000,
			storageType: "NOR/NAND",
			category: "feature_phone",
		},

		// ========================================
		// Wearable & IoT Series
		// ========================================
		24865: {
			name: "UWS6121",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			storageType: "SPI NOR",
			category: "wearable",
		},
		24914: {
			name: "UWS6152",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			storageType: "SPI NOR",
			category: "wearable",
		},
		2019688449: {
			name: "UIS7862",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			storageType: "eMMC",
			category: "iot",
		},
		2299527169: {
			name: "UIS8910DM",
			fdl1Addr: 0x5500,
			fdl2Addr: 0x9efffe00,
			storageType: "eMMC",
			category: "iot",
		},
	};

	export function getInfo(chipId: number): ChipInfo | undefined {
		const baseId = chipId > 0xffff ? chipId >> 16 : chipId;
		return chips[chipId] || chips[baseId];
	}

	export function getName(chipId: number): string {
		return getInfo(chipId)?.name || `Unknown (0x${chipId.toString(16)})`;
	}

	export function requiresExploit(chipId: number): boolean {
		return getInfo(chipId)?.requiresExploit || false;
	}

	export function getExecAddress(chipId: number): number {
		return getInfo(chipId)?.execAddr || 0;
	}

	export function is5GPlatform(chipId: number): boolean {
		return getInfo(chipId)?.category === "5g";
	}

	export function isFeaturePhone(chipId: number): boolean {
		return getInfo(chipId)?.category === "feature_phone";
	}

	export function isWearable(chipId: number): boolean {
		return getInfo(chipId)?.category === "wearable";
	}

	export function isIoT(chipId: number): boolean {
		return getInfo(chipId)?.category === "iot";
	}

	export function getStorageType(chipId: number): string {
		return getInfo(chipId)?.storageType || "eMMC";
	}
}

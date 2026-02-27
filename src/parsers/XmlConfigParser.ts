export enum SprdXmlConfigType {
	Unknown = "Unknown",
	BmaConfig = "BmaConfig",
	PartitionTable = "PartitionTable",
	NvConfig = "NvConfig",
}

export interface SprdXmlFileInfo {
	id: string;
	name: string;
	fileName: string;
	type: string;
	address: number;
	size: number;
	isSelected: boolean;
}

export interface SprdXmlPartitionInfo {
	name: string;
	size: bigint;
	offset: bigint;
	type: string;
}

export interface SprdXmlConfig {
	type: SprdXmlConfigType;
	productName?: string;
	version?: string;
	fdl1?: { fileName: string; address: number };
	fdl2?: { fileName: string; address: number };
	files: SprdXmlFileInfo[];
	partitions: SprdXmlPartitionInfo[];
}

export namespace XmlConfigParser {
	export function parse(xmlData: Buffer): SprdXmlConfig | null {
		const content = cleanXml(xmlData);
		if (!content) return null;

		const config: SprdXmlConfig = {
			type: SprdXmlConfigType.Unknown,
			files: [],
			partitions: [],
		};

		if (content.includes("<BMAConfig") || content.includes("<BMFileWapper")) {
			config.type = SprdXmlConfigType.BmaConfig;
			parseBma(content, config);
		} else if (content.includes("<Partition")) {
			config.type = SprdXmlConfigType.PartitionTable;
			parsePartitions(content, config);
		}

		return config;
	}

	function cleanXml(data: Buffer): string {
		let start = 0;
		if (data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) start = 3;
		let str = data.subarray(start).toString("utf8").replace(/\0/g, "");
		if (str.startsWith("<\0?")) {
			str = data.subarray(start).toString("utf16le").replace(/\0/g, "");
		}
		return str;
	}

	function parseBma(content: string, config: SprdXmlConfig) {
		const productMatch =
			content.match(/<Product[^>]*name="([^"]*)"[^>]*version="([^"]*)"/i) ||
			content.match(/<ProductInfo[^>]*Name="([^"]*)"[^>]*Version="([^"]*)"/i);
		if (productMatch) {
			config.productName = productMatch[1];
			config.version = productMatch[2];
		}

		const fdl1Match = content.match(
			/<FDL1[^>]*File="([^"]*)"[^>]*Base="(0x[0-9a-fA-F]+|[0-9]+)"/i,
		);
		if (fdl1Match?.[1] && fdl1Match?.[2]) {
			config.fdl1 = {
				fileName: fdl1Match[1],
				address: parseInt(fdl1Match[2], 10),
			};
		}
		const fdl2Match = content.match(
			/<FDL2[^>]*File="([^"]*)"[^>]*Base="(0x[0-9a-fA-F]+|[0-9]+)"/i,
		);
		if (fdl2Match?.[1] && fdl2Match?.[2]) {
			config.fdl2 = {
				fileName: fdl2Match[1],
				address: parseInt(fdl2Match[2], 10),
			};
		}

		const fileRegex = /<(File|BMFile|DownLoadFile)\b([^>]*)\/?>/gi;
		while (true) {
			const match = fileRegex.exec(content);
			if (match === null) break;

			const attrs = match[2] || "";
			const id = getAttr(attrs, "ID") || getAttr(attrs, "id");
			const name =
				getAttr(attrs, "Name") ||
				getAttr(attrs, "name") ||
				getAttr(attrs, "PARTITION_NAME");
			const fileName =
				getAttr(attrs, "File") ||
				getAttr(attrs, "FileName") ||
				getAttr(attrs, "IDAlias");
			const type = getAttr(attrs, "Type") || getAttr(attrs, "type");
			const addrStr =
				getAttr(attrs, "Base") ||
				getAttr(attrs, "Address") ||
				getAttr(attrs, "LoadAddr");
			const sizeStr = getAttr(attrs, "Size") || getAttr(attrs, "Length");

			if (name || fileName) {
				config.files.push({
					id,
					name,
					fileName,
					type,
					address: addrStr ? parseInt(addrStr, 10) : 0,
					size: sizeStr ? parseInt(sizeStr, 10) : 0,
					isSelected: getAttr(attrs, "Selected") !== "0",
				});
			}
		}
	}

	function parsePartitions(content: string, config: SprdXmlConfig) {
		const partRegex = /<(Part|Partition|Entry)\b([^>]*)\/?>/gi;
		while (true) {
			const match = partRegex.exec(content);
			if (match === null) break;

			const attrs = match[2] || "";
			const name =
				getAttr(attrs, "id") ||
				getAttr(attrs, "name") ||
				getAttr(attrs, "Name");
			const sizeStr = getAttr(attrs, "size") || getAttr(attrs, "Size");
			const offsetStr = getAttr(attrs, "offset") || getAttr(attrs, "Offset");
			const type = getAttr(attrs, "type") || getAttr(attrs, "Type");

			if (name) {
				config.partitions.push({
					name,
					size: sizeStr ? BigInt(sizeStr) : 0n,
					offset: offsetStr ? BigInt(offsetStr) : 0n,
					type: type || "unknown",
				});
			}
		}
	}

	function getAttr(attrs: string, name: string): string {
		const regex = new RegExp(`\\b${name}="([^"]*)"`, "i");
		const match = attrs.match(regex);
		return match?.[1] || "";
	}
}

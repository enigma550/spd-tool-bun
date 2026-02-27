import { spawnSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export interface PortInfo {
	path: string;
	vid?: string;
	pid?: string;
	name?: string;
}

export namespace PortScanner {
	// Unisoc / Spreadtrum Vendor IDs
	const KNOWN_VIDS = new Set([
		"1782", // Unisoc / Spreadtrum
		"04e8", // Samsung
		"12d1", // Huawei
		"19d2", // ZTE
		"1bbb", // Alcatel / TCL
		"17ef", // Lenovo
		"22d9", // Realme / OPPO
		"2717", // Xiaomi
		"0421", // Nokia
		"2a47", // Transsion (Infinix/Tecno/Itel)
	]);

	/**
	 * Find the first available Unisoc/Spreadtrum port
	 */
	export async function findPort(): Promise<string | null> {
		const platform = process.platform;

		if (platform === "linux") {
			return await findPortLinux();
		}
		if (platform === "win32") {
			return await findPortWindows();
		}
		if (platform === "darwin") {
			return await findPortMac();
		}

		return null;
	}

	async function findPortLinux(): Promise<string | null> {
		try {
			const devicesDir = "/sys/bus/usb/devices";
			const entries = await readdir(devicesDir);

			for (const entry of entries) {
				const devicePath = join(devicesDir, entry);
				try {
					const vid = (
						await readFile(join(devicePath, "idVendor"), "utf8")
					).trim();
					const pid = (
						await readFile(join(devicePath, "idProduct"), "utf8")
					).trim();

					if (KNOWN_VIDS.has(vid.toLowerCase())) {
						const tty = await findTtyInUsbDevice(devicePath);
						if (tty) {
							console.log(
								`📡 Auto-detected Unisoc device: ${vid}:${pid} on ${tty}`,
							);
							return tty;
						}
					}
				} catch {}
			}
		} catch (error) {
			console.error("❌ Error scanning ports (Linux):", error);
		}
		return null;
	}

	async function findPortWindows(): Promise<string | null> {
		try {
			// Use PowerShell to find serial ports with matching VIDs
			const script = `
                $ports = Get-PnpDevice -PresentOnly | Where-Object { $_.Class -eq 'Ports' -or $_.InstanceId -like '*VID_*' }
                foreach ($port in $ports) {
                    $id = $port.InstanceId
                    foreach ($vid in @(${Array.from(KNOWN_VIDS)
											.map((v) => `'${v}'`)
											.join(",")})) {
                        if ($id -like "*VID_$vid*") {
                            $name = $port.FriendlyName
                            if ($name -match '\\((COM\\d+)\\)') {
                                return $matches[1]
                            }
                        }
                    }
                }
            `;
			const res = spawnSync("powershell", ["-Command", script], {
				encoding: "utf8",
			});
			if (res.stdout) {
				const port = res.stdout.trim();
				if (port) {
					console.log(`📡 Auto-detected Unisoc device on Windows: ${port}`);
					return port;
				}
			}
		} catch (error) {
			console.error("❌ Error scanning ports (Windows):", error);
		}
		return null;
	}

	async function findPortMac(): Promise<string | null> {
		try {
			// On Mac, look for /dev/cu.usbserial* or /dev/cu.usbmodem*
			// Usually Unisoc devices show up as cu.usbserial or cu.usbmodem
			const entries = await readdir("/dev");
			const serialPorts = entries.filter(
				(e) => e.startsWith("cu.usbserial") || e.startsWith("cu.usbmodem"),
			);

			if (serialPorts.length > 0) {
				// To be more precise, we could check ioreg, but often the first serial port is the one
				const port = `/dev/${serialPorts[0]}`;
				console.log(`📡 Auto-detected serial device on macOS: ${port}`);
				return port;
			}
		} catch (error) {
			console.error("❌ Error scanning ports (macOS):", error);
		}
		return null;
	}

	async function findTtyInUsbDevice(usbDir: string): Promise<string | null> {
		const stack = [usbDir];
		while (stack.length > 0) {
			const current = stack.pop();
			if (!current) break;
			try {
				const entries = await readdir(current, { withFileTypes: true });
				for (const entry of entries) {
					if (entry.isDirectory()) {
						if (
							entry.name.startsWith("ttyUSB") ||
							entry.name.startsWith("ttyACM")
						) {
							return `/dev/${entry.name}`;
						}
						// Check deeper
						if (entry.name.includes(":") || entry.name.match(/^\d+-\d+/)) {
							stack.push(join(current, entry.name));
						}
					}
				}
			} catch {}
		}
		return null;
	}
}

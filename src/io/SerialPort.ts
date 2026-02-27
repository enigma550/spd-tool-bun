import { dlopen, FFIType, type Library, ptr } from "bun:ffi";
import { Buffer } from "node:buffer";
import type { NativeHandle } from "../types/common";

// Platform-specific FFI definitions
const isWindows = process.platform === "win32";
const isMac = process.platform === "darwin";
const _isLinux = process.platform === "linux";

interface Kernel32Symbols {
	[key: string]: import("bun:ffi").FFIFunction;
	CreateFileA: {
		args: [
			import("bun:ffi").FFIType.cstring,
			import("bun:ffi").FFIType.u32,
			import("bun:ffi").FFIType.u32,
			import("bun:ffi").FFIType.ptr,
			import("bun:ffi").FFIType.u32,
			import("bun:ffi").FFIType.u32,
			import("bun:ffi").FFIType.ptr,
		];
		returns: import("bun:ffi").FFIType.ptr;
	};
	WriteFile: {
		args: [
			import("bun:ffi").FFIType.ptr,
			import("bun:ffi").FFIType.ptr,
			import("bun:ffi").FFIType.u32,
			import("bun:ffi").FFIType.ptr,
			import("bun:ffi").FFIType.ptr,
		];
		returns: import("bun:ffi").FFIType.bool;
	};
	ReadFile: {
		args: [
			import("bun:ffi").FFIType.ptr,
			import("bun:ffi").FFIType.ptr,
			import("bun:ffi").FFIType.u32,
			import("bun:ffi").FFIType.ptr,
			import("bun:ffi").FFIType.ptr,
		];
		returns: import("bun:ffi").FFIType.bool;
	};
	CloseHandle: {
		args: [import("bun:ffi").FFIType.ptr];
		returns: import("bun:ffi").FFIType.bool;
	};
	SetCommState: {
		args: [import("bun:ffi").FFIType.ptr, import("bun:ffi").FFIType.ptr];
		returns: import("bun:ffi").FFIType.bool;
	};
	GetCommState: {
		args: [import("bun:ffi").FFIType.ptr, import("bun:ffi").FFIType.ptr];
		returns: import("bun:ffi").FFIType.bool;
	};
	SetCommTimeouts: {
		args: [import("bun:ffi").FFIType.ptr, import("bun:ffi").FFIType.ptr];
		returns: import("bun:ffi").FFIType.bool;
	};
	PurgeComm: {
		args: [import("bun:ffi").FFIType.ptr, import("bun:ffi").FFIType.u32];
		returns: import("bun:ffi").FFIType.bool;
	};
	GetLastError: {
		args: [];
		returns: import("bun:ffi").FFIType.u32;
	};
}

interface LibcSymbols {
	[key: string]: import("bun:ffi").FFIFunction;
	open: {
		args: [import("bun:ffi").FFIType.cstring, import("bun:ffi").FFIType.i32];
		returns: import("bun:ffi").FFIType.i32;
	};
	read: {
		args: [
			import("bun:ffi").FFIType.i32,
			import("bun:ffi").FFIType.ptr,
			import("bun:ffi").FFIType.u64,
		];
		returns: import("bun:ffi").FFIType.i64;
	};
	write: {
		args: [
			import("bun:ffi").FFIType.i32,
			import("bun:ffi").FFIType.ptr,
			import("bun:ffi").FFIType.u64,
		];
		returns: import("bun:ffi").FFIType.i64;
	};
	close: {
		args: [import("bun:ffi").FFIType.i32];
		returns: import("bun:ffi").FFIType.i32;
	};
	tcgetattr: {
		args: [import("bun:ffi").FFIType.i32, import("bun:ffi").FFIType.ptr];
		returns: import("bun:ffi").FFIType.i32;
	};
	tcsetattr: {
		args: [
			import("bun:ffi").FFIType.i32,
			import("bun:ffi").FFIType.i32,
			import("bun:ffi").FFIType.ptr,
		];
		returns: import("bun:ffi").FFIType.i32;
	};
	cfsetispeed: {
		args: [import("bun:ffi").FFIType.ptr, import("bun:ffi").FFIType.u32];
		returns: import("bun:ffi").FFIType.i32;
	};
	cfsetospeed: {
		args: [import("bun:ffi").FFIType.ptr, import("bun:ffi").FFIType.u32];
		returns: import("bun:ffi").FFIType.i32;
	};
	tcflush: {
		args: [import("bun:ffi").FFIType.i32, import("bun:ffi").FFIType.i32];
		returns: import("bun:ffi").FFIType.i32;
	};
	tcdrain: {
		args: [import("bun:ffi").FFIType.i32];
		returns: import("bun:ffi").FFIType.i32;
	};
	select: {
		args: [
			import("bun:ffi").FFIType.i32,
			import("bun:ffi").FFIType.ptr,
			import("bun:ffi").FFIType.ptr,
			import("bun:ffi").FFIType.ptr,
			import("bun:ffi").FFIType.ptr,
		];
		returns: import("bun:ffi").FFIType.i32;
	};
}

let libc: Library<LibcSymbols>;
let kernel32: Library<Kernel32Symbols>;

if (isWindows) {
	kernel32 = dlopen("kernel32", {
		CreateFileA: {
			args: [
				FFIType.cstring,
				FFIType.u32,
				FFIType.u32,
				FFIType.ptr,
				FFIType.u32,
				FFIType.u32,
				FFIType.ptr,
			],
			returns: FFIType.ptr,
		},
		WriteFile: {
			args: [FFIType.ptr, FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.ptr],
			returns: FFIType.bool,
		},
		ReadFile: {
			args: [FFIType.ptr, FFIType.ptr, FFIType.u32, FFIType.ptr, FFIType.ptr],
			returns: FFIType.bool,
		},
		CloseHandle: {
			args: [FFIType.ptr],
			returns: FFIType.bool,
		},
		SetCommState: {
			args: [FFIType.ptr, FFIType.ptr],
			returns: FFIType.bool,
		},
		GetCommState: {
			args: [FFIType.ptr, FFIType.ptr],
			returns: FFIType.bool,
		},
		SetCommTimeouts: {
			args: [FFIType.ptr, FFIType.ptr],
			returns: FFIType.bool,
		},
		PurgeComm: {
			args: [FFIType.ptr, FFIType.u32],
			returns: FFIType.bool,
		},
		GetLastError: {
			args: [],
			returns: FFIType.u32,
		},
	}) as unknown as Library<Kernel32Symbols>;
} else {
	const libName = isMac ? "libSystem.B.dylib" : "libc.so.6";
	libc = dlopen(libName, {
		open: {
			args: [FFIType.cstring, FFIType.i32],
			returns: FFIType.i32,
		},
		read: {
			args: [FFIType.i32, FFIType.ptr, FFIType.u64],
			returns: FFIType.i64,
		},
		write: {
			args: [FFIType.i32, FFIType.ptr, FFIType.u64],
			returns: FFIType.i64,
		},
		close: {
			args: [FFIType.i32],
			returns: FFIType.i32,
		},
		tcgetattr: {
			args: [FFIType.i32, FFIType.ptr],
			returns: FFIType.i32,
		},
		tcsetattr: {
			args: [FFIType.i32, FFIType.i32, FFIType.ptr],
			returns: FFIType.i32,
		},
		cfsetispeed: {
			args: [FFIType.ptr, FFIType.u32],
			returns: FFIType.i32,
		},
		cfsetospeed: {
			args: [FFIType.ptr, FFIType.u32],
			returns: FFIType.i32,
		},
		tcflush: {
			args: [FFIType.i32, FFIType.i32],
			returns: FFIType.i32,
		},
		tcdrain: {
			args: [FFIType.i32],
			returns: FFIType.i32,
		},
		select: {
			args: [FFIType.i32, FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.ptr],
			returns: FFIType.i32,
		},
	}) as unknown as Library<LibcSymbols>;
}

// OS-specific Constants
const GENERIC_READ = 0x80000000;
const GENERIC_WRITE = 0x40000000;
const OPEN_EXISTING = 3;
const FILE_ATTRIBUTE_NORMAL = 0x80;
const PURGE_RXCLEAR = 0x0008;
const PURGE_TXCLEAR = 0x0004;

const O_RDWR = 2;
const O_NOCTTY = 0x100;
const O_NONBLOCK = 0x800;
const TCSANOW = 0;
const TCIOFLUSH = 2;

export class SerialPort {
	private fd: NativeHandle = isWindows ? null : -1;
	private termios = Buffer.alloc(128);
	private _path = "";

	get path(): string {
		return this._path;
	}

	async open(path: string, baudrate = 115200): Promise<boolean> {
		this._path = path;

		if (isWindows) {
			const prefixedPath = path.startsWith("\\\\.\\") ? path : `\\\\.\\${path}`;
			const pathPtr = Buffer.from(`${prefixedPath}\0`);
			this.fd = kernel32.symbols.CreateFileA(
				pathPtr,
				GENERIC_READ | GENERIC_WRITE,
				0,
				null,
				OPEN_EXISTING,
				FILE_ATTRIBUTE_NORMAL,
				null,
			) as NativeHandle;

			if (this.fd === null || Number(this.fd) === -1 || Number(this.fd) === 0) {
				console.error(
					`Failed to open ${path}: Error ${kernel32.symbols.GetLastError()}`,
				);
				return false;
			}

			// Windows DCB configuration
			const dcb = Buffer.alloc(28); // Minimal DCB size
			const dv = new DataView(dcb.buffer, dcb.byteOffset);
			dv.setUint32(0, dcb.length, true);

			// biome-ignore lint/suspicious/noExplicitAny: Windows HANDLE is a pointer type in Bun FFI
			if (!kernel32.symbols.GetCommState(this.fd as any, ptr(dcb))) {
				this.close();
				return false;
			}

			// DCB bits: 8N1
			dv.setUint32(4, baudrate, true); // BaudRate
			dv.setUint32(8, 0x01 | 0x02, true); // fBinary, fParity
			dv.setUint8(18, 8); // ByteSize
			dv.setUint8(19, 0); // Parity (NOPARITY)
			dv.setUint8(20, 0); // StopBits (ONESTOPBIT)

			// biome-ignore lint/suspicious/noExplicitAny: Windows HANDLE is a pointer type in Bun FFI
			if (!kernel32.symbols.SetCommState(this.fd as any, ptr(dcb))) {
				this.close();
				return false;
			}

			// Set timeouts
			const timeouts = Buffer.alloc(20);
			const tdv = new DataView(timeouts.buffer, timeouts.byteOffset);
			tdv.setUint32(0, 0xffffffff, true); // ReadIntervalTimeout
			tdv.setUint32(4, 0, true); // ReadTotalTimeoutMultiplier
			tdv.setUint32(8, 0, true); // ReadTotalTimeoutConstant
			tdv.setUint32(12, 0, true); // WriteTotalTimeoutMultiplier
			tdv.setUint32(16, 1000, true); // WriteTotalTimeoutConstant

			// biome-ignore lint/suspicious/noExplicitAny: Windows HANDLE is a pointer type in Bun FFI
			kernel32.symbols.SetCommTimeouts(this.fd as any, ptr(timeouts));
			return true;
		} else {
			const pathPtr = Buffer.from(`${path}\0`);
			this.fd = libc.symbols.open(pathPtr, O_RDWR | O_NOCTTY | O_NONBLOCK);

			if (Number(this.fd) < 0) {
				console.error(`Failed to open ${path}: errno ${this.fd}`);
				return false;
			}

			if (libc.symbols.tcgetattr(this.fd as number, ptr(this.termios)) !== 0) {
				this.close();
				return false;
			}

			this.configureUnix(baudrate);
			return true;
		}
	}

	private configureUnix(baudrate: number) {
		const dv = new DataView(this.termios.buffer, this.termios.byteOffset);
		const fd = Number(this.fd);
		if (isMac) {
			libc.symbols.cfsetispeed(ptr(this.termios), baudrate);
			libc.symbols.cfsetospeed(ptr(this.termios), baudrate);
		} else {
			let speed = 0x1002; // 115200
			switch (baudrate) {
				case 9600:
					speed = 0x000d;
					break;
				case 19200:
					speed = 0x000e;
					break;
				case 38400:
					speed = 0x000f;
					break;
				case 57600:
					speed = 0x1001;
					break;
				case 230400:
					speed = 0x1003;
					break;
				case 460800:
					speed = 0x1004;
					break;
				case 921600:
					speed = 0x1007;
					break;
			}
			libc.symbols.cfsetispeed(ptr(this.termios), speed);
			libc.symbols.cfsetospeed(ptr(this.termios), speed);
		}

		let c_cflag = dv.getUint32(8, true);
		c_cflag |= 0x10 | 0x80 | 0x30; // CLOCAL | CREAD | CS8
		dv.setUint32(8, c_cflag, true);

		libc.symbols.tcsetattr(fd, TCSANOW, ptr(this.termios));
	}

	setBaudRate(baudrate: number) {
		if (isWindows) {
			const dcb = Buffer.alloc(28);
			const dv = new DataView(dcb.buffer, dcb.byteOffset);
			dv.setUint32(0, dcb.length, true);
			// biome-ignore lint/suspicious/noExplicitAny: Windows HANDLE is a pointer type in Bun FFI
			if (kernel32.symbols.GetCommState(this.fd as any, ptr(dcb))) {
				dv.setUint32(4, baudrate, true);
				// biome-ignore lint/suspicious/noExplicitAny: Windows HANDLE is a pointer type in Bun FFI
				kernel32.symbols.SetCommState(this.fd as any, ptr(dcb));
			}
		} else {
			this.configureUnix(baudrate);
		}
	}

	write(data: Buffer | Uint8Array): number {
		if (this.fd === null || Number(this.fd) < 0) return -1;

		if (isWindows) {
			const written = Buffer.alloc(4);
			if (
				kernel32.symbols.WriteFile(
					// biome-ignore lint/suspicious/noExplicitAny: Windows HANDLE is a pointer type in Bun FFI
					this.fd as any,
					ptr(data),
					data.length,
					ptr(written),
					null,
				)
			) {
				return written.readUint32LE(0);
			}
			return -1;
		} else {
			const res = libc.symbols.write(
				this.fd as number,
				ptr(data),
				BigInt(data.length),
			);
			return Number(res);
		}
	}

	async read(size: number, timeoutMs = 1000): Promise<Buffer> {
		if (this.fd === null || Number(this.fd) < 0) return Buffer.alloc(0);

		const buf = Buffer.alloc(size);
		const start = Date.now();
		let totalRead = 0;

		const fd = Number(this.fd);

		if (isWindows) {
			while (totalRead < size && Date.now() - start < timeoutMs) {
				const nRead = Buffer.alloc(4);
				if (
					kernel32.symbols.ReadFile(
						// biome-ignore lint/suspicious/noExplicitAny: Windows HANDLE is a pointer type in Bun FFI
						this.fd as any,
						ptr(buf.subarray(totalRead)),
						size - totalRead,
						ptr(nRead),
						null,
					)
				) {
					const n = nRead.readUint32LE(0);
					if (n > 0) {
						totalRead += n;
					} else {
						await new Promise((r) => setTimeout(r, 10));
					}
				} else {
					break;
				}
			}
		} else {
			while (totalRead < size && Date.now() - start < timeoutMs) {
				const readfds = Buffer.alloc(128);
				const fd_idx = fd >> 6;
				const fd_bit = 1n << BigInt(fd & 63);
				const fdSetDv = new DataView(readfds.buffer);
				fdSetDv.setBigUint64(fd_idx * 8, fd_bit, true);

				const tv = Buffer.alloc(16);
				const tvDv = new DataView(tv.buffer);
				const remaining = Math.max(0, timeoutMs - (Date.now() - start));
				tvDv.setBigInt64(0, BigInt(Math.floor(remaining / 1000)), true);
				tvDv.setBigInt64(8, BigInt((remaining % 1000) * 1000), true);

				const ready = libc.symbols.select(
					fd + 1,
					ptr(readfds),
					null,
					null,
					ptr(tv),
				);
				if (ready > 0) {
					const n = libc.symbols.read(
						fd,
						ptr(buf.subarray(totalRead)),
						BigInt(size - totalRead),
					);
					if (n > 0n) {
						totalRead += Number(n);
					} else {
						break;
					}
				} else {
					break;
				}
			}
		}

		return buf.subarray(0, totalRead);
	}

	flush() {
		if (isWindows && this.fd !== null) {
			kernel32.symbols.PurgeComm(
				// biome-ignore lint/suspicious/noExplicitAny: Windows HANDLE is a pointer type in Bun FFI
				this.fd as any,
				PURGE_RXCLEAR | PURGE_TXCLEAR,
			);
		} else if (this.fd !== null && Number(this.fd) >= 0) {
			libc.symbols.tcflush(this.fd as number, TCIOFLUSH);
		}
	}

	close() {
		if (isWindows && this.fd !== null) {
			// biome-ignore lint/suspicious/noExplicitAny: Windows HANDLE is a pointer type in Bun FFI
			kernel32.symbols.CloseHandle(this.fd as any);
			this.fd = 0;
		} else if (this.fd !== null && Number(this.fd) >= 0) {
			libc.symbols.close(this.fd as number);
			this.fd = -1;
		}
	}
}

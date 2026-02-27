# SPD Tool Bun

Cross-platform CLI tool for Unisoc (Spreadtrum) devices, implemented in Typescript alongside Bun. This tool provides flashing, extracting, partition management, and diagnostic capabilities.



## Installation

You can install `spd-tool` directly from GitHub using Bun or npm.

### Global Installation (CLI)
To use it as a command-line tool:
```bash
bun install -g github:enigma550/spd-tool-bun
```

### As a Project Dependency
To add it to your `package.json`:
```bash
bun add github:enigma550/spd-tool-bun
```

### As a Library
You can also use the core logic in your own TypeScript/JavaScript projects:

```typescript
import { FlashEngine, PacExtractor } from "spd-tool-bun";

const extractor = new PacExtractor();
await extractor.open("firmware.pac");

const engine = new FlashEngine();
// 2. Connect to device (auto-detects port if path is omitted)
const connected = await engine.connect(); 
if (!connected) return;
// ... your logic here
```

---

## Commands

### 📦 Flashing & Extraction
- **`flash`**: Flash a PAC firmware file to a device.
  ```bash
  spd-tool flash <input.pac> [serial_port] [--dry-run]
  ```
- **`extract`**: Extract all components from a PAC firmware file.
  ```bash
  spd-tool extract <input.pac> <output_dir>
  ```

### 📂 Partition Operations
- **`read-partition`**: Dump a specific partition from the device.
  ```bash
  spd-tool read-partition <input.pac> <partition_name> [output_file] [serial_port]
  ```
- **`erase-partition`**: Wipe a specific partition on the device.
  ```bash
  spd-tool erase-partition <input.pac> <partition_name> [serial_port]
  ```
- **`factory-reset`**: Perform a factory reset by erasing `userdata` and `cache`.
  ```bash
  spd-tool factory-reset <input.pac> [serial_port]
  ```

### 💾 Backup & Service
- **`nv-backup`**: Comprehensive backup of all NV and Calibration partitions.
  ```bash
  spd-tool nv-backup <input.pac> [output_dir] [serial_port]
  ```
- **`frp-bypass`**: Remove Factory Reset Protection (FRP).
  ```bash
  spd-tool frp-bypass [serial_port]
  ```
- **`unlock-bl`**: Unlock the device bootloader.
  ```bash
  spd-tool unlock-bl [serial_port]
  ```

### 🔍 Diagnostics
- **`read-imei`**: Read device IMEI information (Requires Diag mode).
  ```bash
  spd-tool read-imei [serial_port]
  ```
- **`write-imei`**: Write new IMEI to device (Requires Diag mode).
  ```bash
  spd-tool write-imei <imei1> [imei2] [serial_port]
  ```

---

## Supported Chipsets

The tool supports a wide range of Unisoc/Spreadtrum platforms, including:

- **5G Platforms**: T820, T900, T740, T750, T765, T7510, T7520, T7525, T7530, T7560, T7570, T8000, T8200.
- **4G/LTE Smartphones**: T618, T616, T612, T610, T606, T310, SC9863A, SC9860, SC9853i, SC9850, SC9832E, SC9820E.
- **3G/Legacy Smartphones**: SC7731E, SC7731, SC7730, SC7727S, SC7715, SC7701.
- **Feature Phones**: SC6531E, SC6531DA, SC6531H, T107, T117, UMS9117, W217.
- **Wearable & IoT**: SC8521E, SC8541E, UWS6121, UIS7862, UIS8910DM.

---

## Credits

- **[SakuraEDL](https://github.com/xiriovo/SakuraEDL)**: (MIT License) Inspiration and reference for many advanced features and chipset data.
- **SPD Flash Tool**: Originally developed by **Unisoc Communications**.

## License
GPLv3

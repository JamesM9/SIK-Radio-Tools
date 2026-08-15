# SiK Radio Tools

Configure SiK telemetry radios (900 MHz / 433 MHz) from:

1. A static **web app** using the **Web Serial API** (Chrome/Edge/Brave, or Firefox 151+), or
2. A native **desktop app** (Windows, macOS, Linux) using **Tauri + OS serial ports**, or
3. An **Android** app using **USB OTG / USB Host** serial, or
4. An **iOS** app using a **BLE UART bridge** (Apple does not allow generic FTDI USB-serial)

Host the web build on GitHub Pages, any static file host, or run it locally—no Chrome Web Store or extension install required.

**Repository:** [github.com/JamesM9/SIK-Radio-Tools](https://github.com/JamesM9/SIK-Radio-Tools)

## Requirements

### Web app

- **Browser**: Chromium-based desktop browser with Web Serial (Chrome, Edge, Brave, etc.), or Firefox 151+
- **Context**: **HTTPS** in production, or `http://localhost` for local development
- **OS**: Windows, macOS, or Linux desktop

### Desktop app

- **OS**: Windows 10+, macOS 11+, or modern Linux (x64/arm64)
- **Build tools** (developers): Node.js 20+, Rust via [rustup](https://rustup.rs/) (stable), and [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). On Linux also install `libudev-dev` (needed by the `serialport` crate).

### Android app

- **Device**: Phone/tablet with **USB Host / OTG** support
- **Cable**: USB-OTG adapter + radio USB cable (SiK / Holybro / 3DR FTDI `0x0403:0x6015` preferred)
- **Build tools**: Android SDK + NDK, Rust Android targets (`aarch64-linux-android`, …), JDK 17+

### iOS / iPadOS app

- **macOS + Xcode** required to generate and build the iOS project (`tauri ios …` is not available on Linux)
- **Radio link**: BLE-UART bridge wired to radio TX/RX (generic USB FTDI is **not** available to third-party iOS apps)
- See [`src-tauri/mobile/ios/README.md`](src-tauri/mobile/ios/README.md)

## Run the web app locally

```bash
cd sik-radio-tools
npm install
npm run build
```

Serve the folder over HTTP (ES modules need a real origin):

```bash
npx --yes serve .
```

Open the URL shown (e.g. `http://localhost:3000`). Use a desktop browser with Web Serial and the radio connected via USB.

## Desktop app (Windows / macOS / Linux)

The desktop shell lives in `src-tauri/` and reuses the same UI. Serial I/O goes through native OS ports (`serialport` crate) instead of `navigator.serial`.

```bash
cd sik-radio-tools
npm install
npm run desktop:dev      # development window
npm run desktop:build    # platform installers under src-tauri/target/release/bundle/
```

On first connect, pick the radio’s COM port (Windows) or `/dev/tty.*` / `/dev/ttyUSB*` device (macOS/Linux) from the port dialog.

### Download installers

CI builds installers for all desktop platforms:

| Platform | Installer formats |
|---|---|
| Windows | NSIS `.exe`, `.msi` |
| macOS | `.dmg` (Apple Silicon + Intel) |
| Linux | `.deb`, `.rpm`, `.AppImage` |

**Build now (GitHub Actions):** open **Actions → Build Desktop Installers → Run workflow**, then download the artifacts from the completed run.

**Publish a release:** push a version tag (for example `v1.0.1`) and the same workflow attaches installers to a draft GitHub Release.

### Platform notes

| OS | Typical port names | Notes |
|---|---|---|
| Windows | `COM3`, `COM4`, … | Install FTDI VCP drivers if the OS does not auto-install them |
| macOS | `/dev/tty.usbserial-*` | Grant serial access if prompted |
| Linux | `/dev/ttyUSB0`, `/dev/ttyACM0` | Your user may need membership in the `dialout` (or `uucp`) group |

## Android app (USB OTG)

```bash
cd sik-radio-tools
npm install
npm run mobile:android:init     # once: generate gen/android + USB overlays
npm run mobile:android:dev      # device/emulator
npm run mobile:android:build    # APK / AAB
```

`gen/android` is generated (gitignored). After regenerating, always run `npm run mobile:android:prepare` so USB Host permissions, `device_filter.xml` (SiK FTDI VID/PID), and JitPack are applied.

On connect: plug the radio in with USB-OTG → grant the USB permission dialog → pick the device → configure as usual.

## iOS app (BLE UART)

```bash
# On macOS only:
cd sik-radio-tools
npm install
npm run mobile:ios:init
npm run mobile:ios:dev
```

iOS cannot open generic FTDI USB adapters. Use a BLE UART bridge (Nordic UART Service or equivalent) wired to the radio, then select that BLE device in the app picker. CoreBluetooth wiring is documented under `src-tauri/mobile/ios/`.

## Deploy (static hosting)

The published web site needs exactly:

- `index.html`
- `dist/` (compiled JS, CSS, and `dist/assets/`)

Build with `npm run build`, then upload those paths or use the GitHub Actions workflow in `.github/workflows/github-pages.yml` (runs on push to `main`).

### GitHub Pages (this repository)

1. **One-time (do this before the workflow can deploy):** Open **Settings → Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions** and save. This creates the GitHub Pages site for the repo; without it, deployment steps can fail.
2. **Workflow token (if deploy still fails):** **Settings → Actions → General** → **Workflow permissions** → select **Read and write permissions**, then **Save**. This lets `GITHUB_TOKEN` publish to Pages.
3. Every push to **`main`** runs [`.github/workflows/github-pages.yml`](https://github.com/JamesM9/SIK-Radio-Tools/blob/main/.github/workflows/github-pages.yml), which builds `sik-radio-tools/` and publishes `index.html` + `dist/`.
4. After a successful run (**Actions** tab → **Deploy GitHub Pages**), the app is served at:

   **https://jamesm9.github.io/SIK-Radio-Tools/**

   (Use a browser with Web Serial on desktop; the site must be served over **HTTPS**.)

Safari does not implement Web Serial; use the desktop app there, or Chrome/Edge/Firefox with Web Serial.

## Features

- **Connection**: USB serial via Web Serial (web), native serial (desktop), USB Host (Android), BLE UART (iOS)
- **Settings**: Parameter editor, load/save to radio, export/import JSON, clone to remote
- **Terminal**: AT command terminal with history
- **Firmware**: Flash SiK `.hex` via bootloader (see Firmware tab for file prep notes)
- **Diagnostics / Profiles / Advanced**: As implemented in the UI
- **Demo Mode**: UI testing without hardware

## Project structure

```
sik-radio-tools/
├── index.html
├── src/                    # TypeScript sources (shared UI + protocol)
├── src-tauri/              # Tauri desktop + mobile shell
│   └── mobile/             # Android USB overlays + iOS BLE notes
├── scripts/                # copy-assets, prepare-desktop, prepare-android, …
├── tests/
├── samples/                # Example config JSONs
└── assets/icons/           # Copied into dist/assets for favicon
```

## Limitations

- **Web build**: Relies on Web Serial where the browser provides it
- **Desktop build**: Native USB serial on Windows, macOS, and Linux
- **Android build**: Requires USB Host/OTG; user must grant USB permission
- **iOS build**: No generic USB-serial; use BLE UART (or the macOS desktop app for USB)
- **No TCP serial** in this build
- **Port access**: User gesture (click/tap) required to open the port/device picker

## License

MIT

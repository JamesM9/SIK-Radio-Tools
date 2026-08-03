# SiK Radio Tools

Configure SiK telemetry radios (900 MHz / 433 MHz) from:

1. A static **web app** using the **Web Serial API** (Chrome/Edge/Brave, or Firefox 151+), or
2. A native **desktop app** (Windows, macOS, Linux) using **Tauri + OS serial ports** — no browser Web Serial required

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

### Platform notes

| OS | Typical port names | Notes |
|---|---|---|
| Windows | `COM3`, `COM4`, … | Install FTDI VCP drivers if the OS does not auto-install them |
| macOS | `/dev/tty.usbserial-*` | Grant serial access if prompted |
| Linux | `/dev/ttyUSB0`, `/dev/ttyACM0` | Your user may need membership in the `dialout` (or `uucp`) group |

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

- **Connection**: USB serial via Web Serial (web) or native serial (desktop), configurable baud (default 57600)
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
├── src-tauri/              # Tauri desktop shell + native serial
├── scripts/                # copy-assets, prepare-desktop, generate-icons
├── tests/
├── samples/                # Example config JSONs
└── assets/icons/           # Copied into dist/assets for favicon
```

## Limitations

- **Web build**: Relies on Web Serial where the browser provides it
- **Desktop build**: Native USB serial on Windows, macOS, and Linux (not a substitute for iOS/Android USB accessory stacks yet)
- **No TCP/Bluetooth serial** in this build
- **Port access**: User gesture (click) required to open the serial port picker

## License

MIT

# SiK Radio Tools

A static **web app** for configuring SiK telemetry radios (900 MHz / 433 MHz) from a desktop browser using the **Web Serial API**. Host it on GitHub Pages, any static file host, or run it locally—no Chrome Web Store or extension install required.

**Repository:** [github.com/JamesM9/SIK-Radio-Tools](https://github.com/JamesM9/SIK-Radio-Tools)

## Requirements

- **Browser**: Chromium-based desktop browser (Chrome, Edge, Brave, etc.) with Web Serial
- **Context**: **HTTPS** in production, or `http://localhost` for local development (required for Web Serial)
- **OS**: Windows, macOS, or Linux (desktop; Web Serial on mobile is limited)

## Run locally

```bash
cd sik-radio-tools
npm install
npm run build
```

Serve the folder over HTTP (ES modules need a real origin):

```bash
npx --yes serve .
```

Open the URL shown (e.g. `http://localhost:3000`). Use **Chrome or Edge** on desktop with the radio connected via USB.

## Deploy (static hosting)

The published site needs exactly:

- `index.html`
- `dist/` (compiled JS, CSS, and `dist/assets/`)

Build with `npm run build`, then upload those paths or use the GitHub Actions workflow in `.github/workflows/github-pages.yml` (runs on push to `main`).

### GitHub Pages (this repository)

1. **One-time (do this before the workflow can deploy):** Open **Settings → Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions** and save. This creates the GitHub Pages site for the repo; without it, deployment steps can fail.
2. **Workflow token (if deploy still fails):** **Settings → Actions → General** → **Workflow permissions** → select **Read and write permissions**, then **Save**. This lets `GITHUB_TOKEN` publish to Pages.
3. Every push to **`main`** runs [`.github/workflows/github-pages.yml`](https://github.com/JamesM9/SIK-Radio-Tools/blob/main/.github/workflows/github-pages.yml), which builds `sik-radio-tools/` and publishes `index.html` + `dist/`.
4. After a successful run (**Actions** tab → **Deploy GitHub Pages**), the app is served at:

   **https://jamesm9.github.io/SIK-Radio-Tools/**

   (Use **Chrome or Edge** on desktop; the site must be served over **HTTPS** for Web Serial.)

Safari and Firefox do not expose Web Serial to pages the same way; the app shows a warning when `navigator.serial` is missing.

## Features

- **Connection**: USB serial via Web Serial, configurable baud (default 57600)
- **Settings**: Parameter editor, load/save to radio, export/import JSON, clone to remote
- **Terminal**: AT command terminal with history
- **Firmware**: Flash SiK `.hex` via bootloader (see Firmware tab for file prep notes)
- **Diagnostics / Profiles / Advanced**: As implemented in the UI
- **Demo Mode**: UI testing without hardware

## Project structure

```
sik-radio-tools/
├── index.html
├── src/                    # TypeScript sources
├── scripts/                # copy-assets, generate-icons
├── tests/
├── samples/                # Example config JSONs
└── assets/icons/           # Copied into dist/assets for favicon
```

## Limitations

- **Web Serial only**: No TCP/Bluetooth serial in this build
- **Desktop-focused**: Use a desktop browser with Web Serial for real hardware
- **Port access**: User gesture (click) required to open the serial port picker

## License

MIT

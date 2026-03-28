# SiK Radio Tools - Technical Documentation

## Stack Choice

- **Vanilla TypeScript + HTML + CSS** (no React): Small bundle, simple static hosting (GitHub Pages, etc.). All code is packaged locally; no remote scripts.
- **Web Serial API** for USB serial; transport layer is abstracted for future TCP/Bluetooth support.
- **localStorage** for settings and saved profiles in the browser.

## File Tree

```
sik-radio-tools/
├── index.html
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
├── DOCUMENTATION.md
├── scripts/
│   ├── copy-assets.js
│   └── generate-icons.js
├── src/
│   ├── app.ts              # Entry, app shell, tabs
│   ├── app.css
│   ├── types.ts
│   ├── global.d.ts          # Web Serial types
│   ├── ui/
│   │   ├── app.ts           # Main app logic
│   │   ├── connection.ts
│   │   ├── settings.ts
│   │   ├── terminal.ts
│   │   ├── diagnostics.ts
│   │   ├── profiles.ts
│   │   ├── advanced.ts
│   │   └── toast.ts
│   ├── transport/
│   │   ├── types.ts
│   │   ├── serial.ts        # Web Serial
│   │   ├── mock.ts          # Demo mode
│   │   └── index.ts
│   ├── protocol/
│   │   ├── line-buffer.ts
│   │   ├── at-parser.ts
│   │   └── sik-client.ts
│   ├── params/
│   │   ├── schema.ts
│   │   └── mapper.ts
│   ├── persistence/
│   │   ├── storage.ts
│   │   └── profiles.ts
│   └── diagnostics/
│       └── logger.ts
├── tests/
│   ├── at-parser.test.ts
│   ├── line-buffer.test.ts
│   ├── params.test.ts
│   └── config-export.test.ts
├── samples/
│   ├── example-900mhz-us.json
│   └── example-long-range.json
├── assets/
│   └── icons/
└── dist/                    # Build output
```

## Assumptions and Open Hardware-Specific Questions

1. **Firmware variants**: SiK firmware from ArduPilot, vendor forks (Holybro, 3DR), and custom builds may expose different S-registers. The schema covers S0–S15; unsupported params are editable via Advanced tab.

2. **ECC support**: Newer SiK radio chips may not support Golay ECC. Default is ECC=0; enabling ECC on unsupported hardware can cause failures.

3. **USB vendor/product IDs**: Filter uses 0x0403:0x6015 (FTDI, Holybro/3DR). Other SiK radios (e.g. some 433MHz units) may use different IDs. Users can connect without filters if the picker shows their device.

4. **Guard time**: `+++` requires ~1 second silence before/after. Implemented in SiKRadioClient; very slow or noisy links may need longer guard.

5. **900 vs 433 MHz**: MIN_FREQ/MAX_FREQ must match hardware. 900MHz US: 915000–928000; 433MHz: 414000–454000.

6. **MAVLink framing**: MAVLINK=1 or 2 enables framing. Some firmware may not support MAVLINK=2 (low latency).

7. **RT (remote) commands**: Clone to remote assumes the local radio has an active link to the remote. If not, RT commands will time out.

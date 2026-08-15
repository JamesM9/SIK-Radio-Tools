#!/usr/bin/env node
/**
 * Apply Android USB Host overlays after `tauri android init`.
 * gen/android is gitignored — re-run this after regenerating the project.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const androidRoot = path.join(root, 'src-tauri', 'gen', 'android');
const overlayDir = path.join(root, 'src-tauri', 'mobile', 'android');

function fail(msg) {
  console.error(`[prepare-android] ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(androidRoot)) {
  fail('src-tauri/gen/android missing. Run: npx tauri android init --ci');
}

const manifestPath = path.join(androidRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
const buildGradlePath = path.join(androidRoot, 'build.gradle.kts');
const resXmlDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'xml');
const deviceFilterSrc = path.join(overlayDir, 'device_filter.xml');
const deviceFilterDst = path.join(resXmlDir, 'device_filter.xml');

fs.mkdirSync(resXmlDir, { recursive: true });
fs.copyFileSync(deviceFilterSrc, deviceFilterDst);
console.log('[prepare-android] Wrote device_filter.xml');

let manifest = fs.readFileSync(manifestPath, 'utf8');
if (!manifest.includes('android.hardware.usb.host')) {
  manifest = manifest.replace(
    '<uses-permission android:name="android.permission.INTERNET" />',
    `<uses-permission android:name="android.permission.INTERNET" />
    <uses-feature android:name="android.hardware.usb.host" android:required="false" />`
  );
}

if (!manifest.includes('USB_DEVICE_ATTACHED')) {
  manifest = manifest.replace(
    `</intent-filter>
        </activity>`,
    `</intent-filter>
            <intent-filter>
                <action android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED" />
            </intent-filter>
            <meta-data
                android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED"
                android:resource="@xml/device_filter" />
        </activity>`
  );
}

fs.writeFileSync(manifestPath, manifest);
console.log('[prepare-android] Patched AndroidManifest.xml for USB Host');

let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
if (!buildGradle.includes('jitpack.io')) {
  buildGradle = buildGradle.replace(
    /repositories \{\s*google\(\)\s*mavenCentral\(\)\s*\}/g,
    `repositories {
        google()
        mavenCentral()
        maven { url = uri("https://jitpack.io") }
    }`
  );
  fs.writeFileSync(buildGradlePath, buildGradle);
  console.log('[prepare-android] Added JitPack repository for usb-serial-for-android');
} else {
  console.log('[prepare-android] JitPack already present');
}

console.log('[prepare-android] Done');

/**
 * Main app shell - tabs, connection bar, routing
 */

import type { AppState } from '../types.js';
import type { Transport } from '../transport/types.js';
import {
  isDesktopApp,
  isTauriApp,
  isAndroidApp,
  isIosApp,
  getAppPlatform,
  resolveAppPlatform,
} from '../transport/platform.js';
import { SiKRadioClient } from '../protocol/sik-client.js';
import { getSettings, saveSettings } from '../persistence/storage.js';
import { showToast } from './toast.js';
import { renderConnectionBar } from './connection.js';
import { renderSettingsTab } from './settings.js';
import { renderTerminalTab } from './terminal.js';
import { renderDiagnosticsTab } from './diagnostics.js';
import { renderProfilesTab } from './profiles.js';
import { renderAdvancedTab } from './advanced.js';
import { renderFirmwareTab } from './firmware.js';

let state: AppState = {
  connectionState: 'disconnected',
  transport: null,
  sikClient: null,
  baudRate: 57600,
  darkMode: true,
  demoMode: false,
  activeTab: 'settings',
  currentParams: {},
};

export function getState(): AppState {
  return { ...state };
}

export function setState(partial: Partial<AppState>): void {
  state = { ...state, ...partial };
  render();
}

export function getTransport(): Transport | null {
  return state.transport as Transport | null;
}

export function getSikClient(): SiKRadioClient | null {
  return state.sikClient as SiKRadioClient | null;
}

export function getCurrentParams(): Record<string, number | string> {
  return { ...state.currentParams };
}

export function setCurrentParams(params: Record<string, number | string>): void {
  state.currentParams = params;
}

const TABS = [
  { id: 'settings', label: 'Settings' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'firmware', label: 'Firmware' },
  { id: 'diagnostics', label: 'Diagnostics' },
  { id: 'profiles', label: 'Profiles' },
  { id: 'advanced', label: 'Advanced' },
];

function webSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.serial;
}

function hardwareSerialAvailable(): boolean {
  return isTauriApp() || webSerialSupported();
}

function platformBadge(): string {
  const platform = getAppPlatform();
  if (platform === 'android') return ' <span class="app-badge">Android</span>';
  if (platform === 'ios') return ' <span class="app-badge">iOS</span>';
  if (platform === 'desktop' || isDesktopApp()) return ' <span class="app-badge">Desktop</span>';
  return '';
}

function platformWarning(): string {
  if (hardwareSerialAvailable()) {
    if (isIosApp()) {
      return `<div class="browser-warning" role="status">
        iOS cannot use generic USB-serial FTDI adapters. Connect a <strong>BLE UART bridge</strong> wired to your SiK radio, or use Demo Mode.
      </div>`;
    }
    if (isAndroidApp()) {
      return `<div class="browser-warning" role="status">
        Plug the radio in with a <strong>USB-OTG</strong> cable/adapter, grant USB permission when prompted, then tap Connect.
      </div>`;
    }
    return '';
  }
  return `<div class="browser-warning" role="alert">
      Web Serial is not available in this browser. Use <strong>Chrome</strong> or <strong>Edge</strong> on desktop over <strong>HTTPS</strong> (or localhost), the <strong>desktop app</strong>, or the <strong>Android / iOS</strong> app builds.
    </div>`;
}

function render(): void {
  const root = getRoot();

  root.innerHTML = `
    ${platformWarning()}
    <header class="app-header">
      <h1 class="app-title">SiK Radio Tools${platformBadge()}</h1>
      <label class="btn">
        <input type="checkbox" id="demo-mode" ${state.demoMode ? 'checked' : ''}>
        Demo Mode
      </label>
      <label class="btn">
        <input type="checkbox" id="dark-mode" ${state.darkMode ? 'checked' : ''}>
        Dark Mode
      </label>
    </header>
    <div id="connection-bar"></div>
    <nav class="tabs">
      ${TABS.map((t) => `<button class="tab ${t.id === state.activeTab ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
    </nav>
    <div id="tab-content"></div>
    <div id="toast-root"></div>
  `;

  document.documentElement.dataset.theme = state.darkMode ? 'dark' : 'light';

  // Event bindings
  document.getElementById('demo-mode')?.addEventListener('change', (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    if (state.connectionState === 'connected') {
      showToast('warning', 'Disconnect before switching mode');
      (e.target as HTMLInputElement).checked = !checked;
      return;
    }
    setState({ demoMode: checked });
  });

  document.getElementById('dark-mode')?.addEventListener('change', (e) => {
    const darkMode = (e.target as HTMLInputElement).checked;
    setState({ darkMode });
    saveSettings({ darkMode });
  });

  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      setState({ activeTab: (btn as HTMLElement).dataset.tab ?? 'settings' });
    });
  });

  // Render connection bar and active tab
  const connBar = document.getElementById('connection-bar');
  if (connBar) {
    renderConnectionBar(connBar, state, setState);
  }

  const tabContent = document.getElementById('tab-content');
  if (tabContent) {
    tabContent.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'tab-panel active';
    panel.id = `panel-${state.activeTab}`;
    tabContent.appendChild(panel);

    switch (state.activeTab) {
      case 'settings':
        renderSettingsTab(panel, state);
        break;
      case 'terminal':
        renderTerminalTab(panel, state);
        break;
      case 'firmware':
        renderFirmwareTab(panel, state);
        break;
      case 'diagnostics':
        renderDiagnosticsTab(panel, state);
        break;
      case 'profiles':
        renderProfilesTab(panel, state);
        break;
      case 'advanced':
        renderAdvancedTab(panel, state);
        break;
      default:
        renderSettingsTab(panel, state);
    }
  }
}

let appRoot: HTMLElement | null = null;

export function renderApp(root: HTMLElement): void {
  appRoot = root;
  void (async () => {
    if (isTauriApp()) {
      await resolveAppPlatform();
    }
    const s = await getSettings();
    setState({ baudRate: s.baudRate, darkMode: s.darkMode });
    render();
  })();
}

function getRoot(): HTMLElement {
  return appRoot ?? document.getElementById('app') ?? document.body;
}

/**
 * Runtime platform detection for web, Tauri desktop, and Tauri mobile.
 */

export interface TauriGlobal {
  core: {
    invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
  };
  event: {
    listen: <T>(
      event: string,
      handler: (event: { payload: T }) => void
    ) => Promise<() => void>;
  };
}

export type AppPlatform = 'web' | 'desktop' | 'android' | 'ios';

declare global {
  interface Window {
    __TAURI__?: TauriGlobal;
    __TAURI_OS_PLUGIN_INTERNALS__?: {
      platform?: string;
      os_type?: string;
    };
    __SIK_APP_PLATFORM__?: AppPlatform;
  }
}

/** True when running inside any Tauri shell (desktop or mobile). */
export function isTauriApp(): boolean {
  return typeof window !== 'undefined' && typeof window.__TAURI__ !== 'undefined';
}

/** @deprecated Use isTauriApp() — kept for existing call sites. */
export function isDesktopApp(): boolean {
  return isTauriApp() && getAppPlatform() === 'desktop';
}

export function getTauri(): TauriGlobal {
  if (!window.__TAURI__) {
    throw new Error('Tauri API is not available');
  }
  return window.__TAURI__;
}

function detectFromOsPlugin(): AppPlatform | null {
  const internals = window.__TAURI_OS_PLUGIN_INTERNALS__;
  const value = (internals?.os_type || internals?.platform || '').toLowerCase();
  if (value === 'android') return 'android';
  if (value === 'ios') return 'ios';
  if (value === 'windows' || value === 'linux' || value === 'macos') return 'desktop';
  return null;
}

function detectFromUserAgent(): AppPlatform | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  return null;
}

/**
 * Best-effort platform classification. Prefer injected OS plugin values when present.
 * Cache can be set explicitly by bootstrap code after an invoke.
 */
export function getAppPlatform(): AppPlatform {
  if (typeof window === 'undefined') return 'web';
  if (window.__SIK_APP_PLATFORM__) return window.__SIK_APP_PLATFORM__;
  if (!isTauriApp()) return 'web';

  const fromPlugin = detectFromOsPlugin();
  if (fromPlugin) {
    window.__SIK_APP_PLATFORM__ = fromPlugin;
    return fromPlugin;
  }

  const fromUa = detectFromUserAgent();
  if (fromUa) {
    window.__SIK_APP_PLATFORM__ = fromUa;
    return fromUa;
  }

  window.__SIK_APP_PLATFORM__ = 'desktop';
  return 'desktop';
}

/** Resolve platform via Rust when OS plugin globals are not yet available. */
export async function resolveAppPlatform(): Promise<AppPlatform> {
  if (!isTauriApp()) {
    window.__SIK_APP_PLATFORM__ = 'web';
    return 'web';
  }
  try {
    const platform = await getTauri().core.invoke<string>('get_app_platform');
    const normalized =
      platform === 'android' || platform === 'ios' || platform === 'desktop'
        ? platform
        : 'desktop';
    window.__SIK_APP_PLATFORM__ = normalized;
    return normalized;
  } catch {
    return getAppPlatform();
  }
}

export function isAndroidApp(): boolean {
  return getAppPlatform() === 'android';
}

export function isIosApp(): boolean {
  return getAppPlatform() === 'ios';
}

export function isMobileApp(): boolean {
  const p = getAppPlatform();
  return p === 'android' || p === 'ios';
}

/**
 * Runtime platform detection for web vs Tauri desktop.
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

declare global {
  interface Window {
    __TAURI__?: TauriGlobal;
  }
}

/** True when running inside the Tauri desktop shell. */
export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && typeof window.__TAURI__ !== 'undefined';
}

export function getTauri(): TauriGlobal {
  if (!window.__TAURI__) {
    throw new Error('Tauri API is not available');
  }
  return window.__TAURI__;
}

/**
 * Shared types for SiK Radio Tools
 */

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface PortInfo {
  name?: string;
  vendorId?: number;
  productId?: number;
  serialNumber?: string;
}

export interface AppSettings {
  baudRate: number;
  darkMode: boolean;
  lastConnectedPort?: string;
}

export type ParamValues = Record<string, number | string>;

/** App state - transport/sikClient use any to avoid circular imports */
export interface AppState {
  connectionState: ConnectionState;
  transport: unknown;
  sikClient: unknown;
  baudRate: number;
  darkMode: boolean;
  demoMode: boolean;
  activeTab: string;
  currentParams: Record<string, number | string>;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  text: string;
  duration?: number;
}

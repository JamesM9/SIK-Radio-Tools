/**
 * Transport layer interface - abstracts serial/TCP/Bluetooth for future extensibility
 */

export interface TransportCallbacks {
  onData?: (data: string) => void;
  onLine?: (line: string) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

/** Additional line listeners (e.g. terminal) - called in addition to onLine */
export type LineListener = (line: string) => void;

export interface Transport {
  /** Request user to select a port (user gesture required) */
  requestPort(options?: { filters?: SerialPortFilter[] }): Promise<void>;

  /** Reconnect to a previously approved port if available */
  reconnectKnownPort(): Promise<boolean>;

  /** Open connection with given options */
  open(options: { baudRate: number }): Promise<void>;

  /** Close connection */
  close(): Promise<void>;

  /** Write data to the transport */
  write(data: string | Uint8Array): Promise<void>;

  /** Whether the transport is currently connected */
  readonly isConnected: boolean;

  /** Port info when connected */
  readonly portInfo?: { name?: string; vendorId?: number; productId?: number };

  /** Set callbacks for data, line, close, error */
  setCallbacks(cb: TransportCallbacks): void;

  /** Add line listener (for terminal display). Returns unsubscribe fn. */
  addLineListener?(cb: (line: string) => void): () => void;

  /** Add raw byte listener (for bootloader flashing). Returns unsubscribe fn. */
  addDataListener?(cb: (data: Uint8Array) => void): () => void;
}

export interface SerialPortFilter {
  usbVendorId: number;
  usbProductId?: number;
}

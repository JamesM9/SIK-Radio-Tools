/**
 * Modal serial port picker for the desktop (Tauri) transport.
 */

export interface PickerPort {
  path: string;
  name: string;
  vendorId?: number | null;
  productId?: number | null;
}

function formatPort(port: PickerPort): string {
  const ids =
    port.vendorId != null && port.productId != null
      ? ` (${port.vendorId.toString(16).padStart(4, '0')}:${port.productId
          .toString(16)
          .padStart(4, '0')})`
      : '';
  const label = port.name && port.name !== port.path ? `${port.name} — ${port.path}` : port.path;
  return `${label}${ids}`;
}

export interface PortPickerOptions {
  title?: string;
  hint?: string;
  emptyHint?: string;
}

/**
 * Show a modal listing serial ports. Resolves with the selected path, or rejects if cancelled.
 */
export function pickSerialPort(ports: PickerPort[], options: PortPickerOptions = {}): Promise<string> {
  const title = options.title ?? 'Select serial port';
  const hint = options.hint ?? 'Choose the USB COM / tty port for your SiK radio.';
  const emptyHint =
    options.emptyHint ?? 'No serial ports found. Plug in the radio (USB) and click Refresh.';

  return new Promise((resolve, reject) => {
    const overlay = document.createElement('div');
    overlay.className = 'port-picker-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title);

    const optionsHtml =
      ports.length === 0
        ? `<p class="form-hint">${escapeHtml(emptyHint)}</p>`
        : `<select id="port-picker-select" size="${Math.min(8, Math.max(3, ports.length))}">
            ${ports
              .map(
                (p, i) =>
                  `<option value="${escapeAttr(p.path)}" ${i === 0 ? 'selected' : ''}>${escapeHtml(
                    formatPort(p)
                  )}</option>`
              )
              .join('')}
          </select>`;

    overlay.innerHTML = `
      <div class="port-picker-dialog">
        <h2>${escapeHtml(title)}</h2>
        <p class="form-hint">${escapeHtml(hint)}</p>
        <div id="port-picker-list">${optionsHtml}</div>
        <div class="port-picker-actions">
          <button type="button" class="btn" id="port-picker-refresh">Refresh</button>
          <button type="button" class="btn" id="port-picker-cancel">Cancel</button>
          <button type="button" class="btn btn-primary" id="port-picker-ok" ${
            ports.length === 0 ? 'disabled' : ''
          }>Connect</button>
        </div>
      </div>
    `;

    const cleanup = (): void => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    };

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        cleanup();
        reject(new Error('Port selection cancelled'));
      }
    };

    document.body.appendChild(overlay);
    document.addEventListener('keydown', onKey);

    overlay.querySelector('#port-picker-cancel')?.addEventListener('click', () => {
      cleanup();
      reject(new Error('Port selection cancelled'));
    });

    overlay.querySelector('#port-picker-ok')?.addEventListener('click', () => {
      const select = overlay.querySelector('#port-picker-select') as HTMLSelectElement | null;
      const path = select?.value;
      if (!path) {
        reject(new Error('No serial port selected'));
        cleanup();
        return;
      }
      cleanup();
      resolve(path);
    });

    overlay.querySelector('#port-picker-refresh')?.addEventListener('click', () => {
      cleanup();
      reject(new Error('__refresh__'));
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        reject(new Error('Port selection cancelled'));
      }
    });
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

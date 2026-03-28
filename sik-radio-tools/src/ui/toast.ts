/**
 * Toast notification component
 */

import type { ToastMessage } from '../types.js';

const CONTAINER_ID = 'toast-container';

function getContainer(): HTMLDivElement {
  let el = document.getElementById(CONTAINER_ID) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = CONTAINER_ID;
    el.className = 'toast-container';
    document.body.appendChild(el);
  }
  return el;
}

export function showToast(type: ToastMessage['type'], text: string, duration = 4000): void {
  const container = getContainer();
  const id = crypto.randomUUID();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = text;
  el.dataset.id = id;
  container.appendChild(el);

  const remove = () => {
    el.style.animation = 'slideIn 0.2s ease reverse';
    setTimeout(() => el.remove(), 200);
  };

  const t = setTimeout(remove, duration);
  el.addEventListener('click', () => {
    clearTimeout(t);
    remove();
  });
}

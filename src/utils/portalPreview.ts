/**
 * Remembers that a demo seller jumped into the Farmer Portal to preview their store,
 * so the farmer shell can offer a way back. Session-scoped and browser-local only.
 */
const KEY = 'AgriPulse:v1:storePreviewFromSeller';

export function markStorePreview(active: boolean): void {
  try {
    if (active) window.sessionStorage.setItem(KEY, '1');
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable (private mode) — the banner simply will not show */
  }
}

export function isStorePreview(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

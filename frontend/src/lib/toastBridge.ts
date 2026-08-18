import type { ToastItem } from "../context/ToastContext";

// Jembatan toast non-React: interceptor axios (bukan komponen React) butuh
// memunculkan toast tanpa hook `useToast()`. Bridge ini di-set dari dalam
// <ToastProvider> saat mount, lalu dipanggil dari mana saja (termasuk
// `lib/api.ts`). Bila provider belum ter-mount, panggilan diabaikan (no-op).

type ToastFn = (item: Omit<ToastItem, "id">) => void;

let toastFn: ToastFn | null = null;

/** Dipanggil dari ToastProvider saat mount/unmount. */
export function setToastBridge(fn: ToastFn | null): void {
  toastFn = fn;
}

/** Tampilkan toast apa pun (no-op bila bridge belum aktif). */
export function showToast(item: Omit<ToastItem, "id">): void {
  toastFn?.(item);
}

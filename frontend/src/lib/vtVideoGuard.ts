// frontend/src/lib/vtVideoGuard.ts
// Melindungi <video> dari pembekuan View Transitions API.
//
// Akar masalah: startViewTransition memfoto halaman jadi bitmap old/new
// lalu menganimasikannya di top-layer ::view-transition — frame video di
// dalam bitmap beku ±0.6s. Lubang transparan (placeholder) TIDAK cukup:
// snapshot root ternyata opaque (background canvas html/body + background
// card/section tetap menggambar piksel di koordinat video).
//
// Mekanisme yang benar: Top Layer itu FIFO. ::view-transition masuk ke
// top layer saat startViewTransition dipanggil; elemen popover="manual"
// yang di-showPopover() SESUDAHNYA masuk top layer lebih belakang →
// dirender DI ATAS bitmap VT. Video (elemen live yang sama, currentTime
// utuh) tampil nyata bergerak selama wipe, menutupi frame beku di bawahnya.
//
// Aturan main: JANGAN pause(), jangan load()/src, jangan clone — hanya
// reparent + style + popover. Flag theme transitioning (themeTransition.ts)
// wajib aktif SEBELUM detach supaya IntersectionObserver tidak ikut campur.
//
// Fallback: browser tanpa Popover API → video dibiarkan di pohon konten
// (perilaku lama: beku 0.6s tapi tidak pernah rusak/pause permanen).

type PopoverVideo = HTMLElement & {
  showPopover?: () => void;
  hidePopover?: () => void;
};

interface GuardedVideo {
  video: HTMLVideoElement;
  placeholder: HTMLElement;
  parent: Node;
  next: Node | null;
}

let guarded: GuardedVideo[] = [];

/** true bila engine mendukung popover manual (top layer). */
export function canProtectVideosDuringTransition(): boolean {
  return (
    typeof HTMLElement !== "undefined" &&
    "showPopover" in HTMLElement.prototype &&
    "hidePopover" in HTMLElement.prototype
  );
}

// Properti inline yang dipasang saat detach — dibersihkan saat restore
// agar layout kembali 100% dikendalikan class Tailwind semula.
const INLINE_PROPS = [
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "width",
  "height",
  "margin",
  "z-index",
  "pointer-events",
] as const;

function isInViewport(rect: DOMRect): boolean {
  return (
    rect.bottom > 0 &&
    rect.top < window.innerHeight &&
    rect.right > 0 &&
    rect.left < window.innerWidth
  );
}

/**
 * Tahap 1 (dipanggil SEBELUM startViewTransition): pulihkan sisa siklus
 * sebelumnya, lalu untuk setiap video yang play / terlihat — ukur rect,
* taruh placeholder TRANSPARAN di posisinya (layout tidak loncat), dan
 * pindahkan elemen yang SAMA ke document.body dengan position:fixed tepat
 * di atas koordinat asalnya. Playback tidak disentuh sama sekali.
 */
export function beginVideoProtection(): void {
  restoreLiveVideos();

  const videos = Array.from(document.querySelectorAll("video"));
  for (const video of videos) {
    if (!video.isConnected) continue;

    const rect = video.getBoundingClientRect();
    // Video mati & di luar viewport tidak perlu dilindungi — biarkan IO
    // mengelola play/pause seperti biasa (hemat bandwidth).
    const playing = !video.paused && !video.ended;
    if (!playing && !isInViewport(rect)) continue;
    if (rect.width === 0 || rect.height === 0) continue;

    const parent = video.parentNode;
    if (!parent) continue;

    // Placeholder transparan — tanpa poster/background apa pun.
    const placeholder = document.createElement("div");
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;

    const next = video.nextSibling;
    parent.insertBefore(placeholder, next);

    // Elemen yang SAMA (bukan clone) → currentTime aman, playback lanjut.
    document.body.appendChild(video);
    const s = video.style;
    s.setProperty("position", "fixed");
    s.setProperty("top", `${rect.top}px`);
    s.setProperty("left", `${rect.left}px`);
    s.setProperty("width", `${rect.width}px`);
    s.setProperty("height", `${rect.height}px`);
    s.setProperty("margin", "0");
    s.setProperty("z-index", "30");
    s.setProperty("pointer-events", "none");

    if (canProtectVideosDuringTransition()) {
      // Dibuka belakangan (lihat followTransitionReady) supaya berada
      // DI ATAS pseudo ::view-transition di top layer.
      video.setAttribute("popover", "manual");
    }

    guarded.push({ video, placeholder, parent, next });
  }
}

function liftAll(): void {
  for (const { video } of guarded) {
    const el = video as PopoverVideo;
    try {
      if (!el.matches(":popover-open")) el.showPopover?.();
    } catch {
      // InvalidStateError dsb. — biarkan video di bawah snapshot,
      // fungsi ganti tema tetap aman.
    }
  }
}

/**
 * Tahap 2 (dipanggil SETELAH startViewTransition mengembalikan objek
 * transisi): begitu transition.ready terpenuhi, pseudo ::view-transition
 * pasti sudah ada di top layer — buka popover saat itu juga sehingga
 * urutan top layer: [VT pseudo] → [video live di atasnya].
 */
export function followTransitionReady(ready: Promise<void>): void {
  ready.then(() => liftAll()).catch(() => {});
}

/**
 * Kembalikan semua video: tutup popover, reparent ke tempat semula,
 * bersihkan style inline, hapus placeholder. Aman dipanggil berulang.
 */
export function restoreLiveVideos(): void {
  for (const { video, placeholder, parent, next } of guarded) {
    const el = video as PopoverVideo;
    try {
      if (video.hasAttribute("popover") && el.matches(":popover-open")) {
        el.hidePopover?.();
      }
    } catch {
      // Sudah tertutup / tidak terbuka — lanjut.
    }
    video.removeAttribute("popover");

    parent.insertBefore(video, next);
    const s = video.style;
    for (const prop of INLINE_PROPS) {
      s.removeProperty(prop);
    }
    placeholder.remove();
  }
  guarded = [];
}

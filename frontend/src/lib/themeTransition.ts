// frontend/src/lib/themeTransition.ts
// Flag global SINKRON penanda animasi circle-reveal ganti tema sedang jalan.
// Kenapa bukan cek class di DOM: callback IntersectionObserver berjalan async
// dan bisa menyusul/mendahului mutasi class — flag modul tidak punya race.
// Event THEME_TRANSITION_END dikirim saat transisi selesai supaya elemen
// yang visualnya sempat "dibekukan" View Transitions API (snapshot statis)
// atau ter-pause oleh reflow .dark bisa dilanjutkan secara eksplisit.

let transitioning = false;

export function setThemeTransitioning(value: boolean) {
  transitioning = value;
}

export function isThemeTransitioning() {
  return transitioning;
}

export const THEME_TRANSITION_END = "theme-transition-end";

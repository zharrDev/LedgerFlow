import { useEffect, useRef } from "react";
import { isThemeTransitioning, THEME_TRANSITION_END } from "../../lib/themeTransition";

type Props = {
  sources: { src: string; type: string }[];
  className?: string;
};

/** Video yang hanya memuat metadata di awal dan play/pause
 *  otomatis mengikuti posisi elemen di viewport (hemat bandwidth). */
export default function InViewVideo({ sources, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let intersecting = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Selama circle-reveal theme transition: abaikan SELURUH callback —
        // reflow class .dark bisa membuat intersection terbaca salah sesaat
        // dan mem-pause video di tengah transisi.
        if (isThemeTransitioning()) return;
        intersecting = entry.isIntersecting;
        if (entry.isIntersecting) {
          // Hanya play jika belum playing — cegah micro-pause dari
          // pemanggilan play() ulang yang tidak perlu.
          if (video.paused) video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(video);

    // Setelah transisi selesai, lanjutkan pemutaran bila elemen memang
    // sedang terlihat — menangani pause dari browser/reflow saat transisi.
    const resume = () => {
      if (video.paused && intersecting) video.play().catch(() => {});
    };
    document.addEventListener(THEME_TRANSITION_END, resume);

    return () => {
      observer.disconnect();
      document.removeEventListener(THEME_TRANSITION_END, resume);
    };
  }, []);

  return (
    <video ref={videoRef} muted loop playsInline preload="metadata" className={className}>
      {sources.map((s) => (
        <source key={s.src} src={s.src} type={s.type} />
      ))}
    </video>
  );
}

import { useEffect, useRef } from "react";

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
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Hanya play jika belum playing — cegah micro-pause dari
          // pemanggilan play() ulang saat theme transition berjalan.
          if (video.paused) video.play().catch(() => {});
        } else if (
          // Jangan pause saat circle-reveal theme transition aktif —
          // snapshot View Transitions API butuh video tetap berjalan
          // supaya tidak terlihat "jeda" di tengah animasi ganti tema.
          !document.documentElement.classList.contains("theme-transitioning")
        ) {
          video.pause();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video ref={videoRef} muted loop playsInline preload="metadata" className={className}>
      {sources.map((s) => (
        <source key={s.src} src={s.src} type={s.type} />
      ))}
    </video>
  );
}

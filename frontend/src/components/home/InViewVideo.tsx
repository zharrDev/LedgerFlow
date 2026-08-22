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
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
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

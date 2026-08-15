interface AuroraBackgroundProps {
  /** Variasi letak blob; default tersebar merata */
  className?: string;
}

/**
 * Aurora blob di belakang konten supaya efek glassmorphism terlihat.
 * Posisi absolute di dalam wrapper relative; konten harus dibungkus
 * elemen relative z-10.
 */
export default function AuroraBackground({
  className = "",
}: AuroraBackgroundProps) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-primary-500/20 blur-[100px]" />
      <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-indigo-500/15 blur-[110px]" />
      <div className="absolute bottom-0 left-1/4 w-[26rem] h-[26rem] rounded-full bg-cyan-400/10 blur-[100px]" />
    </div>
  );
}
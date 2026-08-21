// Badge pill dengan "beam" cahaya yang berputar mengitari border
// (conic-gradient yang dirotasi). Dipakai untuk label section homepage,
// mis. "Product Demo".
//
// Catatan implementasi:
// - Layer beam sengaja dibuat JAUH lebih besar dari badge (inset -1000%)
//   supaya conic-gradient tetap berbentuk lingkaran sempurna saat diputar;
//   kelebihannya terpotong oleh overflow-hidden dari parent.
// - Keyframes `border-beam-spin` didefinisikan eksplisit di index.css
//   (bukan memakai keyframes `spin` Tailwind) supaya animasi tidak
//   bergantung pada utility animate-spin dari file lain yang bisa hilang.
// - Warna beam mengikuti palet primary LedgerFlow (cyan); ganti hex di
//   gradient di bawah bila ingin nuansa lain.
import React from "react";

interface BorderBeamBadgeProps {
  text?: string;
  icon?: React.ReactNode;
  className?: string;
}

const BorderBeamBadge: React.FC<BorderBeamBadgeProps> = ({
  text = "Product Demo",
  icon,
  className = "",
}) => {
  return (
    <div
      className={`relative inline-flex rounded-full p-[1.5px] overflow-hidden ${className}`}
    >
      {/* Layer beam — cahaya cyan (primary-600/300/500) mengitari border */}
      <div
        className="border-beam-layer absolute inset-[-1000%]"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0%, #0891B2 10%, #67E8F9 15%, #06B6D4 20%, transparent 30%, transparent 100%)",
          animation: "border-beam-spin 3.5s linear infinite",
        }}
      />

      {/* Isi badge — adaptif light & dark mode */}
      <div className="relative z-10 rounded-full bg-white/90 dark:bg-slate-800/90 border border-primary-500/20 dark:border-slate-700/40 px-4 py-1.5 text-sm text-primary-600 dark:text-teal-300 font-medium inline-flex items-center gap-1.5 backdrop-blur-sm">
        {icon}
        {text}
      </div>
    </div>
  );
};

export default BorderBeamBadge;

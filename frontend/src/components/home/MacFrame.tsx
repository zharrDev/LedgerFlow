import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Kelas tambahan untuk wrapper luar (mis. ukuran/posisi). */
  className?: string;
  /** Ukuran titik lampu (default 10px, ala notch MacBook). */
  dotSize?: number;
};

/** Bingkai ala MacBook untuk konten video/visual: bar atas gelap dengan
 *  3 titik lampu (merah/kuning/hijau), bodi bezel #1D1D1F, sudut membulat,
 *  dan shadow dalam lembut. Konten apa pun bisa dimasukkan via children.
 *
 *  Ukuran adaptif: bar atas tinggi tetap (2.75rem desktop), bezel samping
 *  tipis supaya video tidak kehilangan area di layar kecil. */
export default function MacFrame({ children, className = "", dotSize = 10 }: Props) {
  return (
    <div
      className={`relative rounded-[14px] border border-white/10 bg-[#1D1D1F] p-1.5 sm:p-2 shadow-[0_24px_80px_rgba(0,0,0,0.35)] ${className}`}
    >
      {/* Bar atas — titik lampu "traffic light" ala macOS */}
      <div className="flex h-7 sm:h-8 items-center justify-center rounded-t-[10px] bg-[#242427] relative">
        <div className="absolute left-3 sm:left-4 flex items-center gap-1.5 sm:gap-2">
          <span
            className="rounded-full bg-[#FF5F57] shadow-[inset_0_0_2px_rgba(0,0,0,0.3)]"
            style={{ width: dotSize, height: dotSize }}
          />
          <span
            className="rounded-full bg-[#FEBC2E] shadow-[inset_0_0_2px_rgba(0,0,0,0.3)]"
            style={{ width: dotSize, height: dotSize }}
          />
          <span
            className="rounded-full bg-[#28C840] shadow-[inset_0_0_2px_rgba(0,0,0,0.3)]"
            style={{ width: dotSize, height: dotSize }}
          />
        </div>
      </div>

      {/* Layar — konten video/visual dengan sudut dalam membulat */}
      <div className="overflow-hidden rounded-[8px] bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
        {children}
      </div>

      {/* Benti (kaki) bawah ala MacBook — tipis, menyatu dengan bodi */}
      <div className="mx-auto h-1.5 sm:h-2 w-[18%] rounded-b-[8px] bg-gradient-to-b from-[#2A2A2E] to-[#161618]" />
    </div>
  );
}

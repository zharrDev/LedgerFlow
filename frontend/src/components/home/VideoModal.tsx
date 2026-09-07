import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import MacFrame from "./MacFrame";

type Props = {
  open: boolean;
  onClose: () => void;
  src: string;
  type?: string;
};

/** Modal video ringan untuk tombol "Lihat Cara Kerjanya" — tanpa library
 *  player eksternal. Esc / klik backdrop menutup, ganti bahasa tidak
 *  memengaruhi pemutaran (src stabil per render modal).
 *
 *  Accessibility: backdrop & tombol tutup berlabel aria, fokus awal ke
 *  tombol tutup supaya keyboard user bisa langsung keluar. */
export default function VideoModal({ open, onClose, src, type = "video/webm" }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    // Kunci scroll body saat modal terbuka supaya backdrop tidak "bergeser".
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close video"
              className="absolute -top-11 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <X size={18} />
            </button>
            <MacFrame>
              <video
                key={src}
                controls
                autoPlay
                playsInline
                className="aspect-video w-full"
              >
                <source src={src} type={type} />
              </video>
            </MacFrame>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

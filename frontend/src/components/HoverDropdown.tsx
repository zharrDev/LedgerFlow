import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import type { ReactNode, CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

/**
 * HoverDropdown — muncul saat hover/klik.
 * Panel pakai posisi `fixed` (bukan absolute di flow dokumen) supaya
 * membuka dropdown tidak memperpanjang tinggi halaman / memicu scroll jump.
 */

export interface DropdownOption {
  value: string;
  label: string;
}

interface HoverDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  labelRenderer?: (value: string) => string;
  icon?: ReactNode;
  placeholder?: string;
  minWidth?: number;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  placement?: "bottom" | "top" | "auto";
  alignRight?: boolean;
}

interface PanelPos {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  place: "bottom" | "top";
}

export function HoverDropdown({
  value,
  onChange,
  options,
  labelRenderer,
  icon,
  placeholder = "Pilih",
  minWidth = 180,
  fullWidth = false,
  disabled = false,
  className = "",
  placement = "auto",
  alignRight = false,
}: HoverDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const getLabel = () => {
    if (labelRenderer) return labelRenderer(value);
    const option = options.find((opt) => opt.value === value);
    return option ? option.label : placeholder;
  };

  const updatePosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const gap = 4;
    const viewportPad = 8;
    const preferredWidth = Math.max(rect.width, minWidth);
    const maxPanelH = Math.min(288, window.innerHeight - viewportPad * 2);

    const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPad;
    const spaceAbove = rect.top - gap - viewportPad;

    let place: "bottom" | "top";
    if (placement === "top") place = "top";
    else if (placement === "bottom") place = "bottom";
    else place = spaceBelow < 120 && spaceAbove > spaceBelow ? "top" : "bottom";

    const maxHeight =
      place === "bottom"
        ? Math.max(96, Math.min(maxPanelH, spaceBelow))
        : Math.max(96, Math.min(maxPanelH, spaceAbove));

    let left = alignRight ? rect.right - preferredWidth : rect.left;
    left = Math.min(
      Math.max(viewportPad, left),
      window.innerWidth - preferredWidth - viewportPad,
    );

    if (place === "bottom") {
      setPanelPos({
        top: rect.bottom + gap,
        left,
        width: preferredWidth,
        maxHeight,
        place,
      });
    } else {
      setPanelPos({
        bottom: window.innerHeight - rect.top + gap,
        left,
        width: preferredWidth,
        maxHeight,
        place,
      });
    }
  }, [alignRight, minWidth, placement]);

  const open = () => {
    if (disabled) return;
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsOpen(true);
  };

  const scheduleClose = () => {
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), 180);
  };

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      setPanelPos(null);
      return;
    }
    updatePosition();
  }, [isOpen, updatePosition, options.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onReposition = () => updatePosition();
    window.addEventListener("resize", onReposition);
    // capture scroll di window + elemen scrollable agar panel ikut tombol
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        containerRef.current?.contains(t) ||
        panelRef.current?.contains(t)
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Isolasi wheel: jangan biarkan scroll chain ke halaman saat hover panel
  useEffect(() => {
    const panel = panelRef.current;
    if (!isOpen || !panel) return;

    const onWheel = (e: WheelEvent) => {
      e.stopPropagation();
      const { scrollTop, scrollHeight, clientHeight } = panel;
      const canScroll = scrollHeight > clientHeight + 1;
      if (!canScroll) {
        e.preventDefault();
        return;
      }
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
        e.preventDefault();
      }
    };

    panel.addEventListener("wheel", onWheel, { passive: false });
    return () => panel.removeEventListener("wheel", onWheel);
  }, [isOpen, panelPos]);

  const panelStyle: CSSProperties | undefined = panelPos
    ? {
        position: "fixed",
        top: panelPos.top,
        bottom: panelPos.bottom,
        left: panelPos.left,
        width: panelPos.width,
        maxHeight: panelPos.maxHeight,
        zIndex: 10050,
      }
    : undefined;

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? "w-full" : "inline-block"} ${className}`}
      onMouseEnter={open}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        className={`flex items-center justify-between gap-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-darkCard hover:bg-gray-50 dark:hover:bg-white/5 focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          fullWidth ? "w-full" : ""
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
          <span className="text-gray-700 dark:text-gray-200 truncate">
            {getLabel()}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && panelPos && (
          <motion.div
            ref={panelRef}
            initial={{
              opacity: 0,
              y: panelPos.place === "top" ? 6 : -6,
              scale: 0.98,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: panelPos.place === "top" ? 6 : -6,
              scale: 0.98,
            }}
            transition={{ duration: 0.12 }}
            style={panelStyle}
            onMouseEnter={open}
            onMouseLeave={scheduleClose}
            className="overflow-y-auto overscroll-contain bg-white dark:bg-darkCard border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl scrollbar-thin"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors break-words ${
                  value === option.value
                    ? "text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-500/10 font-medium"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HoverDropdown;

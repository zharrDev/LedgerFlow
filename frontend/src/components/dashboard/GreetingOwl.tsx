import { useState, useEffect, useRef } from "react";

import owlMencatat from "../../assets/owl-analisis.webp";
import owlLaptop from "../../assets/owl-laptop.webp";
import owlKaca from "../../assets/owl-kacapembesar.webp";
import owlIde from "../../assets/owl-idebolalampu.webp";

// 4 unique poses — owlStatistik removed (was duplicate of owlMencatat)
const OWL_POSES = [
  { src: owlMencatat, alt: "Owl mencatat" },
  { src: owlLaptop, alt: "Owl di laptop" },
  { src: owlKaca, alt: "Owl dengan kaca pembesar" },
  { src: owlIde, alt: "Owl punya ide" },
];

const CYCLE_INTERVAL = 5000; // 5 seconds
const FADE_DURATION = 350; // 350ms crossfade

interface GreetingOwlProps {
  size?: string;
  variant?: "animated" | "static";
}

export function GreetingOwl({ size = "h-28 lg:h-36 xl:h-40", variant = "animated" }: GreetingOwlProps) {
  // Static variant: only first pose, no timer, no crossfade
  if (variant === "static") {
    return (
      <div className="pointer-events-none select-none">
        <img
          src={OWL_POSES[0].src}
          alt={OWL_POSES[0].alt}
          className={`${size} w-auto object-contain`}
          draggable={false}
        />
      </div>
    );
  }

  // Animated variant: cycle poses with crossfade
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isActiveRef = useRef(true);

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const startCycle = () => {
    if (prefersReduced || OWL_POSES.length <= 1) return;
    timerRef.current = setTimeout(() => {
      if (!isActiveRef.current) return;
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % OWL_POSES.length);
        setIsTransitioning(false);
        startCycle();
      }, FADE_DURATION);
    }, CYCLE_INTERVAL);
  };

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        isActiveRef.current = false;
        if (timerRef.current) clearTimeout(timerRef.current);
      } else {
        isActiveRef.current = true;
        startCycle();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [prefersReduced]);

  useEffect(() => {
    startCycle();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [prefersReduced]);

  const pose = OWL_POSES[currentIndex];

  return (
    <div className="pointer-events-none select-none">
      <img
        src={pose.src}
        alt={pose.alt}
        className={`${size} w-auto object-contain transition-opacity`}
        style={{
          opacity: isTransitioning ? 0 : 1,
          transitionDuration: `${FADE_DURATION}ms`,
          transitionTimingFunction: "ease-in-out",
        }}
        draggable={false}
      />
    </div>
  );
}

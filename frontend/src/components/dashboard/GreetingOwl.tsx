import { useState, useEffect, useRef } from "react";

// Owl poses — import as assets are added to frontend/src/assets/
// For now, fallback to owl-mascot.webp for all poses
import owlMascot from "../../assets/owl-mascot.webp";

// TODO: Replace with individual owl assets once available:
// import owlMencatat from "../../assets/owl-mencatat.webp";
// import owlLaptop from "../../assets/owl-laptop.webp";
// import owlKaca from "../../assets/owl-kacapembesar.webp";
// import owlStatistik from "../../assets/owl-menulistatistik.webp";
// import owlIde from "../../assets/owl-ide.webp";

const OWL_POSES = [
  { src: owlMascot, alt: "Owl mencatat" },
  { src: owlMascot, alt: "Owl di laptop" },
  { src: owlMascot, alt: "Owl dengan kaca pembesar" },
  { src: owlMascot, alt: "Owl melihat statistik" },
  { src: owlMascot, alt: "Owl punya ide" },
];

const CYCLE_INTERVAL = 5000; // 5 seconds
const FADE_DURATION = 350; // 350ms crossfade

export function GreetingOwl() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isActiveRef = useRef(true);

  // Pause when tab is hidden
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
  }, []);

  // Respect prefers-reduced-motion
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
    if (!prefersReduced) startCycle();
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
        className="h-32 lg:h-40 xl:h-44 w-auto object-contain transition-opacity"
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

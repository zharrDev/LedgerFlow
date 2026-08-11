import { useEffect, type RefObject } from "react";

/** Cegah scroll wheel di sidebar/nav ikut menggulir halaman utama di belakangnya. */
export function useScrollIsolation(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.stopPropagation();

      const { scrollTop, scrollHeight, clientHeight } = el;
      const canScroll = scrollHeight > clientHeight + 1;

      if (!canScroll) {
        e.preventDefault();
        return;
      }

      const goingDown = e.deltaY > 0;
      const goingUp = e.deltaY < 0;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

      if ((goingDown && atBottom) || (goingUp && atTop)) {
        e.preventDefault();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref]);
}

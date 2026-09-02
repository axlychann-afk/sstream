import { useIsFetching } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

/**
 * Slim NProgress-style loading bar — appears at the very top of the page
 * whenever React Query has in-flight requests.
 */
export function TopLoadingBar() {
  const fetching = useIsFetching();
  const loading = fetching > 0;

  const [width, setWidth] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clear = () => {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      if (doneRef.current) { clearTimeout(doneRef.current);  doneRef.current = null; }
    };

    if (loading) {
      clear();
      setWidth(8);
      setOpacity(1);

      tickRef.current = setInterval(() => {
        setWidth(w => {
          const next = w + (90 - w) * 0.08;
          if (next >= 89.5) {
            clearInterval(tickRef.current!);
            tickRef.current = null;
          }
          return next;
        });
      }, 120);
    } else {
      clear();
      setWidth(100);
      doneRef.current = setTimeout(() => {
        setOpacity(0);
        doneRef.current = setTimeout(() => setWidth(0), 300);
      }, 80);
    }

    return clear;
  }, [loading]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 right-0 z-[9999] h-[2px]"
      style={{ opacity }}
    >
      <div
        className="h-full bg-primary"
        style={{
          width: `${width}%`,
          transition: loading
            ? "width 0.12s ease-out"
            : "width 0.18s ease-in, opacity 0.3s ease",
          boxShadow: "0 0 8px 1px rgba(225,29,72,0.6)",
        }}
      />
    </div>
  );
}

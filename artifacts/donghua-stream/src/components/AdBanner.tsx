import { useEffect, useRef } from "react";

interface AdBannerProps {
  /** Adsterra "highperformanceformat" ad unit key */
  adKey: string;
  width: number;
  height: number;
  className?: string;
}

/**
 * Adsterra "highperformanceformat" banner ad.
 * The network's invoke.js writes its markup via `document.currentScript`,
 * so both the `atOptions` config script and the `invoke.js` loader must be
 * injected as real <script> elements inside this component's own container —
 * not rendered as JSX — for the ad to land in the right place. Each instance
 * gets its own container + own atOptions call so multiple different ad units
 * can coexist on the same page.
 */
export function AdBanner({ adKey, width, height, className }: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reset in case of StrictMode double-invoke / route re-mount
    container.innerHTML = "";

    const configScript = document.createElement("script");
    configScript.type = "text/javascript";
    configScript.text = `
      atOptions = {
        'key' : '${adKey}',
        'format' : 'iframe',
        'height' : ${height},
        'width' : ${width},
        'params' : {}
      };
    `;

    const invokeScript = document.createElement("script");
    invokeScript.type = "text/javascript";
    invokeScript.src = `https://www.highperformanceformat.com/${adKey}/invoke.js`;
    invokeScript.async = true;

    container.appendChild(configScript);
    container.appendChild(invokeScript);

    return () => {
      container.innerHTML = "";
    };
  }, [adKey, width, height]);

  return (
    <div
      className={className}
      aria-label="advertisement"
      style={{ width, height, overflow: "hidden" }}
    >
      <div ref={containerRef} style={{ width, height }} />
    </div>
  );
}

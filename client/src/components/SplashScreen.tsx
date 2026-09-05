/**
 * SplashScreen — apertura "Bass Impact".
 *
 * La escena usa transform y opacity para mantener la animación fluida en el
 * WebView, respeta prefers-reduced-motion y puede saltarse con un toque.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

const EXIT_MS = 520;
const SPECTRUM_BARS = 28;

export function SplashScreen({ onFinish, duration = 3600 }: SplashScreenProps) {
  const [leaving, setLeaving] = useState(false);
  const { t } = useLanguage();
  const finishedRef = useRef(false);
  const exitTimerRef = useRef<number | null>(null);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setLeaving(true);
    exitTimerRef.current = window.setTimeout(onFinish, EXIT_MS);
  }, [onFinish]);

  useEffect(() => {
    const finishTimer = window.setTimeout(
      finish,
      Math.max(0, duration - EXIT_MS),
    );

    return () => {
      window.clearTimeout(finishTimer);
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, [duration, finish]);

  return (
    <div
      className={`intro-root ${leaving ? "intro-leaving" : ""}`}
      onClick={finish}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          finish();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={t("splash.skip")}
    >
      <div className="intro-stage">
        <span className="intro-ring intro-ring-1" />
        <span className="intro-ring intro-ring-2" />
        <span className="intro-ring intro-ring-3" />
        <span className="intro-bloom" />

        <img
          src="/epicenter-logo.png"
          alt="EpicenterDSP"
          className="intro-logo"
          draggable={false}
        />

        <span className="intro-sweep" />
      </div>

      <div className="intro-spectrum" aria-hidden="true">
        {Array.from({ length: SPECTRUM_BARS }).map((_, index) => (
          <span
            key={index}
            className="intro-bar"
            style={{
              animationDelay: `${0.95 + (index % 7) * 0.04}s`,
              ["--bar-peak" as string]: `${36 + ((index * 37) % 52)}%`,
            }}
          />
        ))}
      </div>

      <div className="intro-footer">
        <span className="intro-version">v{t("app.version")}</span>
        <span className="intro-tagline">Bass Reconstruction Technology</span>
      </div>
    </div>
  );
}

export default SplashScreen;

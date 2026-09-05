import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Car, Headphones, Power, Sparkles } from "lucide-react";
import type { TranslateFn } from "@/components/home/types";

type TutorialTab = "player" | "dsp";

interface EpicenterTutorialProps {
  t: TranslateFn;
  onFinish: () => void;
  onNavigate: (tab: TutorialTab) => void;
}

interface TutorialStep {
  tab: TutorialTab;
  badge: string;
  title: string;
  body: string;
  illustration: ReactNode;
}

function ToggleIllustration({ t }: { t: TranslateFn }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="tutorial-toggle relative flex h-12 w-24 items-center rounded-full p-1.5">
        <span className="tutorial-toggle-thumb h-9 w-9 rounded-full bg-white shadow-lg" />
      </div>
      <div className="flex items-center gap-2 text-[#ff6a6a]">
        <Power className="h-4 w-4" />
        <span className="text-xs font-black uppercase tracking-[0.2em]">
          {t("tutorial.epicenter")}
        </span>
      </div>
    </div>
  );
}

function ModeSwitchIllustration({
  active,
  t,
}: {
  active: "normal" | "headphones";
  t: TranslateFn;
}) {
  const modes = [
    {
      id: "normal" as const,
      icon: Car,
      label: t("tutorial.normalLabel"),
    },
    {
      id: "headphones" as const,
      icon: Headphones,
      label: t("tutorial.headphonesLabel"),
    },
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-64 max-w-full gap-1 rounded-2xl border border-[#2a1e1f] bg-[#0b0809] p-1">
        {modes.map(({ id, icon: Icon, label }) => (
          <div
            key={id}
            className={`tutorial-mode flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-3 text-[10px] font-black uppercase tracking-[0.08em] ${
              id === active
                ? "tutorial-mode-active text-white"
                : "text-zinc-500"
            }`}
          >
            <Icon className="h-4 w-4 flex-none" />
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="flex h-10 items-end gap-1" aria-hidden="true">
        {Array.from({ length: 13 }).map((_, index) => (
          <span
            key={index}
            className="tutorial-wave-bar w-1.5 rounded-t bg-[#ff2a2a]"
            style={{
              animationDelay: `${index * 50}ms`,
              ["--tutorial-wave-peak" as string]: `${10 + ((index * 5) % 26)}px`,
              opacity: 0.5 + (index % 4) * 0.12,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function KnobIllustration({ t }: { t: TranslateFn }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="tutorial-knob relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#ff2a2a]/60 bg-[#140e0f] shadow-[0_0_24px_rgba(255,42,42,0.28)]">
        <span className="absolute top-2 h-4 w-1 rounded-full bg-[#ff2a2a] shadow-[0_0_8px_rgba(255,42,42,0.9)]" />
        <span className="h-3 w-3 rounded-full bg-[#ff6a6a]" />
      </div>
      <span className="text-xs font-black uppercase tracking-[0.2em] text-[#ff6a6a]">
        {t("tutorial.intensity")}
      </span>
    </div>
  );
}

function LogoIllustration() {
  return (
    <img
      src="/epicenter-logo.png"
      alt="EpicenterDSP"
      className="tutorial-logo h-28 w-28 rounded-2xl border border-[#ff2a2a]/25 bg-black/50 object-contain p-2"
      draggable={false}
    />
  );
}

export function EpicenterTutorial({
  t,
  onFinish,
  onNavigate,
}: EpicenterTutorialProps) {
  const steps = useMemo<TutorialStep[]>(
    () => [
      {
        tab: "player",
        badge: t("tutorial.welcomeBadge"),
        title: t("tutorial.welcomeTitle"),
        body: t("tutorial.welcomeBody"),
        illustration: <LogoIllustration />,
      },
      {
        tab: "dsp",
        badge: t("tutorial.enableBadge"),
        title: t("tutorial.enableTitle"),
        body: t("tutorial.enableBody"),
        illustration: <ToggleIllustration t={t} />,
      },
      {
        tab: "dsp",
        badge: t("tutorial.normalBadge"),
        title: t("tutorial.normalTitle"),
        body: t("tutorial.normalBody"),
        illustration: <ModeSwitchIllustration active="normal" t={t} />,
      },
      {
        tab: "dsp",
        badge: t("tutorial.headphonesBadge"),
        title: t("tutorial.headphonesTitle"),
        body: t("tutorial.headphonesBody"),
        illustration: <ModeSwitchIllustration active="headphones" t={t} />,
      },
      {
        tab: "dsp",
        badge: t("tutorial.readyBadge"),
        title: t("tutorial.readyTitle"),
        body: t("tutorial.readyBody"),
        illustration: <KnobIllustration t={t} />,
      },
    ],
    [t],
  );
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  useEffect(() => {
    onNavigate(step.tab);
  }, [onNavigate, step.tab]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFinish();
      if (event.key === "ArrowLeft") {
        setIndex((current) => Math.max(current - 1, 0));
      }
      if (event.key === "ArrowRight") {
        if (isLast) onFinish();
        else setIndex((current) => Math.min(current + 1, steps.length - 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLast, onFinish, steps.length]);

  const next = useCallback(() => {
    if (isLast) onFinish();
    else setIndex((current) => Math.min(current + 1, steps.length - 1));
  }, [isLast, onFinish, steps.length]);

  return (
    <div
      className="tutorial-backdrop fixed inset-0 z-[95] flex items-end justify-center bg-black/80 p-4 backdrop-blur-[4px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="epicenter-tutorial-title"
    >
      <div className="tutorial-panel relative w-full max-w-md overflow-hidden rounded-3xl border border-[rgba(255,16,42,0.42)] bg-[#0b0b0b] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.75)]">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-[rgba(255,16,42,0.2)] blur-3xl" />

        <div className="relative flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-[#ff6a6a]">
            {step.badge}
          </span>
          <button
            type="button"
            onClick={onFinish}
            className="text-xs font-semibold text-zinc-500 transition-colors hover:text-white"
          >
            {t("onboarding.skip")}
          </button>
        </div>

        <div className="relative mt-4 flex min-h-[250px] flex-col items-center justify-center text-center">
          <div
            key={index}
            className="tutorial-step-enter flex flex-col items-center gap-5"
            aria-live="polite"
          >
            <div className="flex h-32 items-center justify-center">
              {step.illustration}
            </div>
            <div>
              <h2
                id="epicenter-tutorial-title"
                className="text-2xl font-black text-white"
              >
                {step.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                {step.body}
              </p>
            </div>
          </div>
        </div>

        <div
          className="relative mt-4 flex items-center justify-center gap-2"
          aria-label={t("tutorial.progress", {
            current: index + 1,
            total: steps.length,
          })}
        >
          {steps.map((_, stepIndex) => (
            <span
              key={stepIndex}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                stepIndex === index
                  ? "w-6 bg-[linear-gradient(90deg,#ff102a,#8f0012)] shadow-[0_0_10px_rgba(255,16,42,0.65)]"
                  : "w-1.5 bg-zinc-700"
              }`}
            />
          ))}
        </div>

        <div className="relative mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex((current) => Math.max(current - 1, 0))}
            disabled={index === 0}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-400 transition-colors hover:text-white disabled:opacity-30"
          >
            {t("onboarding.back")}
          </button>
          <button
            type="button"
            onClick={next}
            className="tutorial-next-button relative flex-1 overflow-hidden rounded-2xl px-6 py-3 text-base font-black text-white"
          >
            <span className="tutorial-shimmer pointer-events-none absolute inset-0" />
            <span className="relative flex items-center justify-center gap-2">
              {isLast && <Sparkles className="h-5 w-5" />}
              {isLast ? t("tutorial.start") : t("onboarding.next")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default EpicenterTutorial;

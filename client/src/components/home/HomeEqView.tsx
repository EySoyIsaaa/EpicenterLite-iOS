import { useEffect, useRef } from "react";
import { Crown, LockKeyhole, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { TranslateFn } from "@/components/home/types";
import { LITE_EQ_PRESETS } from "@/config/appEdition";

interface HomeEqViewProps {
  t: TranslateFn;
  eqEnabled: boolean;
  activePresetId: string;
  onToggleEq: (enabled: boolean) => void;
  onSelectPreset: (presetId: string) => void;
  onOpenAutoModal: () => void;
  onOpenManualEq: () => void;
}

export function HomeEqView({
  t,
  eqEnabled,
  activePresetId,
  onToggleEq,
  onSelectPreset,
  onOpenAutoModal,
  onOpenManualEq,
}: HomeEqViewProps) {
  const viewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    viewRef.current?.scrollTo({ top: 0, left: 0 });
  }, []);

  return (
    <div
      ref={viewRef}
      className="animate-view-enter flex-1 overflow-y-auto px-4 home-scroll-with-player pt-12"
      data-testid="eq-view"
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="premium-title text-[10px] font-black text-[var(--ep-red)]">
            DSP Equalizer
          </p>
          <h2 className="premium-title mt-1 text-2xl font-black text-white">
            {t("eq.title")}
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[var(--ep-border)] bg-[#0b0b0b] px-3 py-1.5">
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ep-text-secondary)]">
            {eqEnabled ? t("eq.on") : t("eq.off")}
          </span>
          <Switch checked={eqEnabled} onCheckedChange={onToggleEq} />
        </div>
      </header>
      <div className="mb-4 rounded-2xl border border-[rgba(255,16,42,0.35)] bg-[#0b0b0b] p-4">
        <p className="premium-title text-xs font-black text-white">
          {t("lite.eq.presetsTitle")}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--ep-text-secondary)]">
          {t("lite.eq.presetsDescription")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3" data-testid="lite-eq-presets">
        {LITE_EQ_PRESETS.map((preset) => {
          const active = preset.id === activePresetId;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectPreset(preset.id)}
              className={`min-h-20 rounded-2xl border px-4 py-3 text-left transition ${
                active
                  ? "border-[var(--ep-red)] bg-[rgba(255,16,42,0.14)] text-white shadow-[0_0_18px_rgba(255,16,42,0.18)]"
                  : "border-[var(--ep-border)] bg-[#0b0b0b] text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <Sparkles className="mb-2 h-4 w-4 text-[var(--ep-red)]" />
              <span className="text-sm font-black">{preset.name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button
          onClick={onOpenAutoModal}
          className="min-h-16 rounded-2xl border border-[rgba(255,16,42,0.4)] bg-[#111] text-white hover:bg-[#181818]"
        >
          <LockKeyhole className="mr-2 h-4 w-4" />
          Auto EQ
        </Button>
        <Button
          variant="outline"
          onClick={onOpenManualEq}
          className="min-h-16 rounded-2xl border-[var(--ep-border)] bg-black text-zinc-300 hover:bg-[#111] hover:text-white"
        >
          <Crown className="mr-2 h-4 w-4 text-[var(--ep-red)]" />
          31-band EQ
        </Button>
      </div>
    </div>
  );
}

export default HomeEqView;

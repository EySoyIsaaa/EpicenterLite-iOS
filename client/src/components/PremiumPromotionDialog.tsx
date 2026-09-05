import {
  Bot,
  Crown,
  Infinity as InfinityIcon,
  SlidersHorizontal,
  Sparkles,
  Waves,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TranslateFn } from "@/components/home/types";

export type PremiumPromotionKind = "benefits";

interface PremiumPromotionDialogProps {
  kind: PremiumPromotionKind | null;
  t: TranslateFn;
  onBuy: () => void;
  onClose: () => void;
}

const BENEFIT_KEYS = [
  { icon: InfinityIcon, key: "lite.premium.benefitLibrary" },
  { icon: SlidersHorizontal, key: "lite.premium.benefitEq" },
  { icon: Bot, key: "lite.premium.benefitAuto" },
  { icon: Waves, key: "lite.premium.benefitEffects" },
] as const;

export function PremiumPromotionDialog({
  kind,
  t,
  onBuy,
  onClose,
}: PremiumPromotionDialogProps) {
  if (!kind) return null;

  return (
    <div
      className="modal-backdrop fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-promotion-title"
        className="modal-panel relative w-full max-w-sm overflow-hidden rounded-3xl border border-[rgba(255,16,42,0.42)] bg-[#0b0b0b] p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[rgba(255,16,42,0.24)] blur-3xl" />
        <button
          type="button"
          aria-label={t("common.close")}
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-zinc-500 hover:bg-white/5 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative flex flex-col items-center text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#ff2439,#85000e)] shadow-[0_0_28px_rgba(255,16,42,0.32)]">
            <Crown className="h-8 w-8 text-white" />
          </span>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--ep-red)]">
            EpicenterDSP Premium
          </p>
          <h2
            id="premium-promotion-title"
            className="mt-1 text-2xl font-black leading-tight text-white"
          >
            {t("lite.premium.benefitsTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {t("lite.premium.benefitsDescription")}
          </p>
        </div>

        <div className="relative mt-5 space-y-2">
          {BENEFIT_KEYS.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded-xl border border-[#2a1e1f] bg-[#100c0d]/70 p-2.5"
            >
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-[rgba(255,16,42,0.14)]">
                <Icon className="h-4 w-4 text-[var(--ep-red)]" />
              </span>
              <p className="text-left text-sm font-semibold text-white">
                {t(key)}
              </p>
            </div>
          ))}
        </div>

        <div className="relative mt-5 grid gap-2">
          <Button
            onClick={() => {
              onBuy();
              onClose();
            }}
            className="h-auto rounded-2xl btn-brand px-6 py-4 text-base font-bold"
          >
            <Sparkles className="mr-2 h-5 w-5" />
            {t("lite.premium.buyButton")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-full text-zinc-400"
          >
            {t("lite.premium.continueLite")}
          </Button>
        </div>
      </div>
    </div>
  );
}

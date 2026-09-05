import { Crown, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openFullVersionAppStore } from "@/services/storeService";
import type { TranslateFn } from "@/components/home/types";

export type ProFeatureKind =
  | "eq31"
  | "autoEq"
  | "autoEpicenter"
  | "advancedEpicenter"
  | "effects"
  | "libraryLimit";

interface ProFeatureModalProps {
  feature: ProFeatureKind | null;
  t: TranslateFn;
  onClose: () => void;
}

const FEATURE_KEYS: Record<ProFeatureKind, string> = {
  eq31: "lite.pro.eq31",
  autoEq: "lite.pro.autoEq",
  autoEpicenter: "lite.pro.autoEpicenter",
  advancedEpicenter: "lite.pro.advancedEpicenter",
  effects: "lite.pro.effects",
  libraryLimit: "lite.pro.libraryLimit",
};

export function ProFeatureModal({ feature, t, onClose }: ProFeatureModalProps) {
  if (!feature) return null;

  const close = () => {
    onClose();
  };

  const openFull = () => {
    if (!openFullVersionAppStore()) {
      window.alert(t("lite.fullUrlPending"));
      return;
    }
    close();
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-feature-title"
        className="modal-panel w-full max-w-md space-y-5 rounded-3xl border border-[rgba(255,16,42,0.42)] bg-[#0b0b0b] p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-[rgba(255,16,42,0.14)] p-3 text-[var(--ep-red)]">
              <Crown className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--ep-red)]">
                EpicenterDSP Full
              </p>
              <h2
                id="pro-feature-title"
                className="mt-1 text-xl font-black text-white"
              >
                {t(FEATURE_KEYS[feature])}
              </h2>
            </div>
          </div>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={close}
            className="rounded-full p-2 text-zinc-500 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-zinc-300">
          {t("lite.pro.description")}
        </p>
        <ul className="space-y-2 text-sm text-zinc-400">
          {["lite.pro.benefit1", "lite.pro.benefit2", "lite.pro.benefit3"].map(
            (key) => (
              <li key={key} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--ep-red)]" />
                <span>{t(key)}</span>
              </li>
            ),
          )}
        </ul>

        <div className="grid gap-2">
          <Button onClick={openFull} className="rounded-full btn-brand">
            {t("lite.getFull")}
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={close}
            className="rounded-full text-zinc-400"
          >
            {t("common.close")}
          </Button>
        </div>
      </div>
    </div>
  );
}

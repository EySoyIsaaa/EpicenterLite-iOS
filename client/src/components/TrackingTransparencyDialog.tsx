import { ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TranslateFn } from "@/components/home/types";

interface TrackingTransparencyDialogProps {
  open: boolean;
  t: TranslateFn;
  onContinue: () => void;
  onNotNow: () => void;
}

export function TrackingTransparencyDialog({
  open,
  t,
  onContinue,
  onNotNow,
}: TrackingTransparencyDialogProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tracking-context-title"
        className="modal-panel w-full max-w-md space-y-5 rounded-3xl border border-zinc-800 bg-[#0b0b0b] p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="rounded-2xl bg-white/5 p-3 text-white">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={onNotNow}
            className="rounded-full p-2 text-zinc-500 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div>
          <h2 id="tracking-context-title" className="text-xl font-black text-white">
            {t("lite.tracking.title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {t("lite.tracking.description")}
          </p>
        </div>
        <div className="grid gap-2">
          <Button onClick={onContinue} className="rounded-full btn-brand">
            {t("lite.tracking.continue")}
          </Button>
          <Button
            variant="ghost"
            onClick={onNotNow}
            className="rounded-full text-zinc-400"
          >
            {t("lite.tracking.notNow")}
          </Button>
        </div>
      </div>
    </div>
  );
}

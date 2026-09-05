import { FEATURES } from "@/config/appEdition";

export const ADMOB_IOS_APP_ID = "ca-app-pub-4970020999623772~6089460269";
export const ADMOB_INTERSTITIAL_ID = "ca-app-pub-4970020999623772/2927156018";

export const ADS_ENABLED = FEATURES.ads;
export const AD_INTERSTITIAL_INTERVAL_MS = 60 * 1000;
export const TRACKING_CONTEXT_DELAY_MS = 2 * 60 * 1000;
export const TRACKING_CONTEXT_POLL_MS = 2_000;
export const AD_LOAD_RETRY_DELAYS_MS = [5_000, 15_000, 45_000, 2 * 60_000];

export const TRACKING_PROMPT_STORAGE_KEY =
  "epicenter-lite-tracking-context-resolved";

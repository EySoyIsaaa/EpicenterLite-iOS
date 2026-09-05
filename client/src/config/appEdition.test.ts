import { describe, expect, it } from "vitest";
import {
  EQ_31_FREQUENCIES,
  FEATURES,
  LITE_EQ_MAX_BOOST_DB,
  LITE_EQ_PRESETS,
  MAX_IMPORTED_TRACKS,
  sanitizeLiteEqGains,
} from "./appEdition";
import {
  AD_INTERSTITIAL_INTERVAL_MS,
  ADMOB_INTERSTITIAL_ID,
  ADMOB_IOS_APP_ID,
  TRACKING_CONTEXT_DELAY_MS,
  TRACKING_CONTEXT_POLL_MS,
} from "./ads";
import {
  EPICENTERDSP_PREMIUM_APP_STORE_URL,
  FULL_VERSION_APP_STORE_URL,
  HAS_FULL_VERSION_APP_STORE_URL,
} from "./storeLinks";

describe("EpicenterDSP Lite product rules", () => {
  it("keeps the imported library limit at 30", () => {
    expect(MAX_IMPORTED_TRACKS).toBe(30);
    expect(FEATURES.unlimitedImports).toBe(false);
  });

  it("keeps Full-only processing disabled", () => {
    expect(FEATURES.fullEq).toBe(false);
    expect(FEATURES.autoEq).toBe(false);
    expect(FEATURES.autoEpicenter).toBe(false);
    expect(FEATURES.spatialEffects).toBe(false);
  });

  it("defines complete and safely limited Lite presets", () => {
    expect(LITE_EQ_PRESETS).toHaveLength(6);
    for (const preset of LITE_EQ_PRESETS) {
      expect(preset.gains).toHaveLength(EQ_31_FREQUENCIES.length);
      expect(Math.max(...preset.gains)).toBeLessThanOrEqual(
        LITE_EQ_MAX_BOOST_DB,
      );
    }
  });

  it("clamps and pads arbitrary preset data", () => {
    const sanitized = sanitizeLiteEqGains([99, -99, Number.NaN]);
    expect(sanitized).toHaveLength(31);
    expect(sanitized.slice(0, 4)).toEqual([2, -8, 0, 0]);
  });

  it("uses only the EpicenterDSP Lite production AdMob IDs", () => {
    expect(ADMOB_IOS_APP_ID).toBe("ca-app-pub-4970020999623772~6089460269");
    expect(ADMOB_INTERSTITIAL_ID).toBe(
      "ca-app-pub-4970020999623772/2927156018",
    );
    expect(AD_INTERSTITIAL_INTERVAL_MS).toBe(60 * 1000);
    expect(TRACKING_CONTEXT_DELAY_MS).toBe(2 * 60 * 1000);
    expect(TRACKING_CONTEXT_POLL_MS).toBe(2_000);
  });

  it("sends every Premium purchase action to the published App Store app", () => {
    expect(EPICENTERDSP_PREMIUM_APP_STORE_URL).toBe(
      "https://apps.apple.com/mx/app/epicenterdsp-player/id6785658490",
    );
    expect(FULL_VERSION_APP_STORE_URL).toBe(EPICENTERDSP_PREMIUM_APP_STORE_URL);
    expect(HAS_FULL_VERSION_APP_STORE_URL).toBe(true);
  });
});

export const APP_EDITION = "LITE" as const;
export const APP_DISPLAY_NAME = "EpicenterDSP Lite";
export const APP_BUNDLE_ID = "com.epicenterdsp.lite";

export const MAX_IMPORTED_TRACKS = 30;

export const FEATURES = Object.freeze({
  ads: true,
  presets: true,
  basicEpicenter: true,
  headphonesMode: true,
  fullEq: false,
  autoEq: false,
  autoEpicenter: false,
  spatialEffects: false,
  unlimitedImports: false,
});

export const EQ_31_FREQUENCIES = [
  20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630,
  800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000,
  12500, 16000, 20000,
] as const;

export const LITE_EQ_MAX_BOOST_DB = 2;

export interface LiteEqPreset {
  id: string;
  name: string;
  gains: number[];
}

export const LITE_EQ_PRESETS: LiteEqPreset[] = [
  {
    id: "neutral",
    name: "Neutral",
    gains: Array(31).fill(0),
  },
  {
    id: "bass-boost",
    name: "Bass Boost",
    gains: [
      1.5, 2, 2, 2, 1.5, 1, 0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ],
  },
  {
    id: "vocal",
    name: "Vocal",
    gains: [
      -2, -2, -2, -1.5, -1.5, -1.5, -1.5, -1.5, -1.5, -1, -1, -1, -1,
      -1, -1, -0.5, 0, 1, 1.5, 2, 2, 2, 2, 1.5, 1, 1, 1, 0, 0, 0, 0,
    ],
  },
  {
    id: "warm",
    name: "Warm",
    gains: [
      0, 0, 0, 1, 1.5, 1.5, 1.5, 1, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 0.5,
      0, 0, 0, -0.5, -1, -1, -1, -1, -1, -1.5, -1.5, -2, -2, -2, -2,
    ],
  },
  {
    id: "rock",
    name: "Rock",
    gains: [
      0, 0, 0, 0, 0, 1.5, 2, 2, 1, 0, -1, -1, -1, -1, -0.5, 0, 0.5, 1.5,
      1.5, 2, 2, 2, 2, 1.5, 0.5, 0.5, 1, 1, 1, 0.5, 0,
    ],
  },
  {
    id: "electronic",
    name: "Electronic",
    gains: [
      1, 1.5, 2, 2, 1.5, 1.5, 1.5, 0.5, 0, 0, 0, 0, 0, 0, -0.5, -0.5,
      -0.5, -0.5, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 1, 1, 1.5, 1.5, 1,
    ],
  },
];

for (const preset of LITE_EQ_PRESETS) {
  if (preset.gains.length !== EQ_31_FREQUENCIES.length) {
    throw new Error(
      `Lite EQ preset "${preset.id}" must define ${EQ_31_FREQUENCIES.length} bands`,
    );
  }
}

export function sanitizeLiteEqGains(gains: number[]): number[] {
  return Array.from({ length: EQ_31_FREQUENCIES.length }, (_, index) => {
    const gain = Number.isFinite(gains[index]) ? gains[index] : 0;
    return Math.min(LITE_EQ_MAX_BOOST_DB, Math.max(-8, gain));
  });
}

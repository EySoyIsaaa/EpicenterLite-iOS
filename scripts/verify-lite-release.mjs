import { readFileSync } from "node:fs";

try {
  process.loadEnvFile();
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const failures = [];
const fullStoreUrl = process.env.VITE_FULL_VERSION_APP_STORE_URL?.trim() ?? "";
const appId = "ca-app-pub-4970020999623772~6089460269";
const interstitialId = "ca-app-pub-4970020999623772/2927156018";
const infoPlist = readFileSync("ios/App/App/Info.plist", "utf8");
const adsConfig = readFileSync("client/src/config/ads.ts", "utf8");
const adService = readFileSync("client/src/services/adService.ts", "utf8");

if (!/^ca-app-pub-\d+~\d+$/.test(appId)) {
  failures.push("The compiled AdMob iOS app ID is invalid.");
}
if (!/^ca-app-pub-\d+\/\d+$/.test(interstitialId)) {
  failures.push("The compiled AdMob interstitial ID is invalid.");
}
if (
  !/^https:\/\/apps\.apple\.com\//.test(fullStoreUrl) ||
  fullStoreUrl.includes("REPLACE_WITH")
) {
  failures.push(
    "VITE_FULL_VERSION_APP_STORE_URL must be a real App Store URL.",
  );
}
if (!infoPlist.includes(`<string>${appId}</string>`)) {
  failures.push(
    "Info.plist GADApplicationIdentifier must match the production app ID.",
  );
}
if (
  !adsConfig.includes(`"${appId}"`) ||
  !adsConfig.includes(`"${interstitialId}"`)
) {
  failures.push(
    "The app must compile the production AdMob app and interstitial IDs.",
  );
}
if (
  adsConfig.includes("ADMOB_USE_TEST_ADS") ||
  adService.includes("initializeForTesting: true") ||
  adService.includes("isTesting: true")
) {
  failures.push("The app still contains a test-ad selection path.");
}

if (failures.length > 0) {
  console.error("EpicenterDSP Lite release verification failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("EpicenterDSP Lite release configuration is ready.");

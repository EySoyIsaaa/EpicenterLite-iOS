export const EPICENTERDSP_PREMIUM_APP_STORE_URL =
  "https://apps.apple.com/mx/app/epicenterdsp-player/id6785658490";

export const FULL_VERSION_APP_STORE_URL =
  import.meta.env.VITE_FULL_VERSION_APP_STORE_URL?.trim() ||
  EPICENTERDSP_PREMIUM_APP_STORE_URL;

export const HAS_FULL_VERSION_APP_STORE_URL =
  /^https:\/\/apps\.apple\.com\//.test(FULL_VERSION_APP_STORE_URL);

export const PRIVACY_POLICY_URL = "https://epicenterdsp.com/privacy/";
export const TERMS_OF_SERVICE_URL = "https://epicenterdsp.com/terms/";

export const HAS_PUBLISHED_LEGAL_URLS =
  /^https:\/\//.test(PRIVACY_POLICY_URL) &&
  /^https:\/\//.test(TERMS_OF_SERVICE_URL);

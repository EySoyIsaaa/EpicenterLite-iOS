import {
  FULL_VERSION_APP_STORE_URL,
  HAS_FULL_VERSION_APP_STORE_URL,
} from "@/config/storeLinks";

export function openFullVersionAppStore(): boolean {
  if (!HAS_FULL_VERSION_APP_STORE_URL) return false;

  try {
    window.open(FULL_VERSION_APP_STORE_URL, "_blank", "noopener,noreferrer");
  } catch {
    window.location.href = FULL_VERSION_APP_STORE_URL;
  }
  return true;
}

import {
  AdMob,
  AdmobConsentStatus,
  InterstitialAdPluginEvents,
} from "@capacitor-community/admob";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import {
  ADS_ENABLED,
  ADMOB_INTERSTITIAL_ID,
  AD_INTERSTITIAL_INTERVAL_MS,
  AD_LOAD_RETRY_DELAYS_MS,
  TRACKING_CONTEXT_DELAY_MS,
  TRACKING_PROMPT_STORAGE_KEY,
} from "@/config/ads";
import { EpicenterNative } from "@/native/iosNativeAudio";

export interface NaturalAdBreak {
  key: string;
  blocked: boolean;
}

class AdService {
  private readonly sessionStartedAt = Date.now();
  private initialized = false;
  private initializing: Promise<void> | null = null;
  private adMobInitialized = false;
  private canRequestAds = false;
  private interstitialReady = false;
  private preparing = false;
  private lastInterstitialAt = 0;
  private lastBreakKey = "";
  private loadRetryIndex = 0;
  private loadRetryTimer: number | null = null;
  private initializationRetryIndex = 0;
  private initializationRetryTimer: number | null = null;
  private listenerHandles: PluginListenerHandle[] = [];

  private isIosNative(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  }

  async initialize(): Promise<void> {
    if (this.initialized || !ADS_ENABLED || !this.isIosNative()) return;
    if (this.initializing) return this.initializing;

    this.initializing = this.initializeOnce();
    try {
      await this.initializing;
    } finally {
      this.initializing = null;
    }
  }

  private async initializeOnce(): Promise<void> {
    try {
      // This plugin exposes UMP only after the Mobile Ads bridge is initialized.
      // No ad request happens until consent has been refreshed below.
      await this.initializeSdk();

      try {
        const consentInfo = await AdMob.requestConsentInfo();
        if (
          consentInfo.status === AdmobConsentStatus.REQUIRED &&
          consentInfo.isConsentFormAvailable
        ) {
          await AdMob.showConsentForm();
        }
      } catch (error) {
        // UMP permits ad requests when a valid decision from an earlier
        // session is still cached. A transient refresh failure must not erase
        // that valid state, but a fresh install remains blocked until UMP can
        // establish consent.
        const cachedConsent = await EpicenterNative.getAdConsentState().catch(
          () => null,
        );
        if (!cachedConsent?.canRequestAds) {
          console.warn(
            "[Ads] UMP has no usable consent state. Verify the build's GADApplicationIdentifier, network access, and the published AdMob Privacy & messaging configuration.",
          );
          throw error;
        }
        console.warn(
          "[Ads] UMP refresh failed; using the valid cached consent state:",
          error,
        );
      }

      const nativeConsent = await EpicenterNative.getAdConsentState();
      this.canRequestAds = nativeConsent.canRequestAds;
      this.initialized = true;
      this.initializationRetryIndex = 0;
      this.clearInitializationRetry();

      if (this.canRequestAds) {
        await this.activateAds();
      }
    } catch (error) {
      this.initialized = false;
      this.canRequestAds = false;
      console.warn("[Ads] initialization skipped:", error);
      this.scheduleInitializationRetry();
    }
  }

  private async initializeSdk(): Promise<void> {
    if (!this.adMobInitialized) {
      await AdMob.initialize({
        initializeForTesting: false,
      });
      await AdMob.setApplicationMuted({ muted: true });
      await AdMob.setApplicationVolume({ volume: 0 });
      this.adMobInitialized = true;
    }
  }

  private async activateAds(): Promise<void> {
    if (!this.canRequestAds) return;
    await this.initializeSdk();
    await this.registerListeners();
    await this.prepareNext();
  }

  private clearInitializationRetry(): void {
    if (this.initializationRetryTimer !== null) {
      window.clearTimeout(this.initializationRetryTimer);
      this.initializationRetryTimer = null;
    }
  }

  private scheduleInitializationRetry(): void {
    if (this.initializationRetryTimer !== null) return;
    const delay =
      AD_LOAD_RETRY_DELAYS_MS[
        Math.min(
          this.initializationRetryIndex,
          AD_LOAD_RETRY_DELAYS_MS.length - 1,
        )
      ];
    this.initializationRetryIndex += 1;
    this.initializationRetryTimer = window.setTimeout(() => {
      this.initializationRetryTimer = null;
      void this.initialize();
    }, delay);
  }

  private async registerListeners(): Promise<void> {
    if (this.listenerHandles.length > 0) return;

    this.listenerHandles.push(
      await AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
        this.interstitialReady = true;
        this.loadRetryIndex = 0;
        this.clearLoadRetry();
        console.info("[Ads] interstitial ready");
      }),
      await AdMob.addListener(
        InterstitialAdPluginEvents.FailedToLoad,
        (error) => {
          this.interstitialReady = false;
          console.warn("[Ads] interstitial failed to load:", error);
          this.scheduleLoadRetry();
        },
      ),
      await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        this.interstitialReady = false;
        void this.prepareNext();
      }),
      await AdMob.addListener(
        InterstitialAdPluginEvents.FailedToShow,
        (error) => {
          this.interstitialReady = false;
          console.warn("[Ads] interstitial failed to show:", error);
          void this.prepareNext();
        },
      ),
    );
  }

  private clearLoadRetry(): void {
    if (this.loadRetryTimer !== null) {
      window.clearTimeout(this.loadRetryTimer);
      this.loadRetryTimer = null;
    }
  }

  private scheduleLoadRetry(): void {
    if (this.loadRetryTimer !== null) return;
    const delay =
      AD_LOAD_RETRY_DELAYS_MS[
        Math.min(this.loadRetryIndex, AD_LOAD_RETRY_DELAYS_MS.length - 1)
      ];
    this.loadRetryIndex += 1;
    this.loadRetryTimer = window.setTimeout(() => {
      this.loadRetryTimer = null;
      void this.prepareNext();
    }, delay);
  }

  private async prepareNext(): Promise<void> {
    if (
      !this.canRequestAds ||
      this.preparing ||
      this.interstitialReady ||
      !ADMOB_INTERSTITIAL_ID
    ) {
      return;
    }

    this.preparing = true;
    try {
      await AdMob.prepareInterstitial({
        adId: ADMOB_INTERSTITIAL_ID,
        isTesting: false,
      });
    } catch (error) {
      console.warn("[Ads] prepare failed:", error);
      this.scheduleLoadRetry();
    } finally {
      this.preparing = false;
    }
  }

  private recordInterstitial(now: number): void {
    this.lastInterstitialAt = now;
  }

  private getInterstitialCooldownReason(now: number): string | null {
    if (
      this.lastInterstitialAt > 0 &&
      now - this.lastInterstitialAt < AD_INTERSTITIAL_INTERVAL_MS
    ) {
      return "one-minute cooldown active";
    }
    return null;
  }

  async shouldOfferTrackingContext(): Promise<boolean> {
    if (!this.isIosNative()) return false;
    if (Date.now() - this.sessionStartedAt < TRACKING_CONTEXT_DELAY_MS) {
      return false;
    }
    if (localStorage.getItem(TRACKING_PROMPT_STORAGE_KEY) === "true") {
      return false;
    }

    try {
      const result = await AdMob.trackingAuthorizationStatus();
      return result.status === "notDetermined";
    } catch {
      return false;
    }
  }

  async requestTrackingAuthorization(): Promise<void> {
    try {
      await AdMob.requestTrackingAuthorization();
    } catch (error) {
      console.warn("[Ads] ATT request failed:", error);
    } finally {
      localStorage.setItem(TRACKING_PROMPT_STORAGE_KEY, "true");
    }
  }

  dismissTrackingContext(): void {
    localStorage.setItem(TRACKING_PROMPT_STORAGE_KEY, "true");
  }

  async tryShowInterstitial(context: NaturalAdBreak): Promise<boolean> {
    const now = Date.now();
    const cooldownReason = this.getInterstitialCooldownReason(now);
    const pendingReason =
      context.key === this.lastBreakKey
        ? "duplicate navigation break"
        : !ADS_ENABLED
          ? "ads disabled or production IDs missing"
          : !this.canRequestAds
            ? "UMP has not allowed ad requests"
            : !this.interstitialReady
              ? "interstitial not loaded yet"
              : cooldownReason
                ? cooldownReason
                : context.blocked
                  ? "another app overlay is active"
                  : document.visibilityState !== "visible"
                    ? "app is not visible"
                    : null;
    if (pendingReason) {
      console.info(`[Ads] interstitial pending: ${pendingReason}`);
      return false;
    }

    this.lastBreakKey = context.key;
    this.interstitialReady = false;
    console.info(`[Ads] showing interstitial for ${context.key}`);

    try {
      await AdMob.setApplicationMuted({ muted: true });
      await AdMob.setApplicationVolume({ volume: 0 });
      await AdMob.showInterstitial();
      this.recordInterstitial(now);
      return true;
    } catch (error) {
      console.warn("[Ads] show failed:", error);
      void this.prepareNext();
      return false;
    }
  }

  async showPrivacyOptions(): Promise<void> {
    if (!this.isIosNative()) return;
    await EpicenterNative.showAdPrivacyOptions();
    const nativeConsent = await EpicenterNative.getAdConsentState();
    this.canRequestAds = nativeConsent.canRequestAds;
    if (this.canRequestAds) {
      await this.activateAds();
    }
  }

  async dispose(): Promise<void> {
    this.clearInitializationRetry();
    this.clearLoadRetry();
    const handles = this.listenerHandles.splice(0);
    await Promise.all(handles.map((handle) => handle.remove()));
    this.interstitialReady = false;
  }
}

export const adService = new AdService();

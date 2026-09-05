/**
 * EpicenterDSP Lite - Apple Music Style Player
 * Diseño minimalista, monocromático y premium
 * Con biblioteca de música organizada, playlists y cola interactiva
 *
 * v1.1.3 - Splash screen + Last track memory
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  useIosNativeAudioProcessor,
  type StreamingParams,
} from "@/hooks/useIosNativeAudioProcessor";
import { useAudioQueue, type Track } from "@/hooks/useAudioQueue";
import { usePlaylists, type Playlist } from "@/hooks/usePlaylists";
import { usePresetPersistence } from "@/hooks/usePresetPersistence";
import { useMediaSession } from "@/hooks/useMediaSession";
import { useMediaNotification } from "@/hooks/useMediaNotification";
import { useCrossfade } from "@/hooks/useCrossfade";
import { useTheme } from "@/contexts/ThemeContext";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PremiumMiniPlayer } from "@/components/PremiumMiniPlayer";
import { EpicenterTutorial } from "@/components/EpicenterTutorial";
import {
  AddSongsToPlaylistModal,
  AddToPlaylistModal,
  DeletePlaylistModal,
  DuplicatesModal,
  PlaylistContextMenu,
  PlaylistNameModal,
  TrackContextMenu,
} from "@/components/home/HomeOverlays";
import { HomeDspView } from "@/components/home/HomeDspView";
import { HomeEqView } from "@/components/home/HomeEqView";
import { HomeFxView } from "@/components/home/HomeFxView";
import { HomeImportProgressOverlay } from "@/components/home/HomeImportProgressOverlay";
import { HomeLibraryView } from "@/components/home/HomeLibraryView";
import { HomePlayerView } from "@/components/home/HomePlayerView";
import { HomeSearchView } from "@/components/home/HomeSearchView";
import { HomeSettingsView } from "@/components/home/HomeSettingsView";
import { ActionsErrorBoundary } from "@/components/home/ActionsErrorBoundary";
import {
  type DspParamConfig,
  type HomeLibraryView as LibraryView,
  type HomeTabType as TabType,
} from "@/components/home/types";
import { useLanguage } from "@/hooks/useLanguage";
import { hiresAudioBadgeUrl, hiresLogoUrl } from "@/lib/assetUrls";
import { LITE_EQ_PRESETS, FEATURES } from "@/config/appEdition";
import {
  ProFeatureModal,
  type ProFeatureKind,
} from "@/components/ProFeatureModal";
import { TrackingTransparencyDialog } from "@/components/TrackingTransparencyDialog";
import {
  PremiumPromotionDialog,
  type PremiumPromotionKind,
} from "@/components/PremiumPromotionDialog";
import { adService } from "@/services/adService";
import { openFullVersionAppStore } from "@/services/storeService";
import {
  AD_INTERSTITIAL_INTERVAL_MS,
  TRACKING_CONTEXT_POLL_MS,
} from "@/config/ads";
import { toast } from "sonner";

type HomeNavigationSnapshot = {
  activeTab: TabType;
  libraryView: LibraryView;
  showQueue: boolean;
  showCreatePlaylist: boolean;
  showRenamePlaylist: boolean;
  showDeletePlaylist: boolean;
  showAddToPlaylist: boolean;
  showAddSongsToPlaylist: boolean;
  showTutorial: boolean;
  selectedPlaylistId: string | null;
  contextMenuOpen: boolean;
  playlistMenuOpen: boolean;
  duplicatesModalOpen: boolean;
};

const HOME_NAVIGATION_STATE_KEY = "__epicenterHomeNav";

const clampDspParam = (key: keyof StreamingParams, value: number): number => {
  switch (key) {
    case "sweepFreq":
      return Math.max(27, Math.min(63, value));
    case "width":
    case "intensity":
    case "balance":
    case "volume":
      return Math.max(0, Math.min(100, value));
    default:
      return value;
  }
};

const clampDspParams = (params: StreamingParams): StreamingParams => ({
  sweepFreq: clampDspParam("sweepFreq", params.sweepFreq),
  width: clampDspParam("width", params.width),
  intensity: clampDspParam("intensity", params.intensity),
  balance: clampDspParam("balance", params.balance),
  volume: clampDspParam("volume", params.volume),
});

const MAX_SAFE_DSP_BIT_DEPTH = 24;
const MAX_SAFE_DSP_SAMPLE_RATE = 192000;

const safeTitle = (track?: Partial<Track> | null): string =>
  typeof track?.title === "string" && track.title.trim()
    ? track.title
    : "Canción desconocida";

const safeArtist = (track?: Partial<Track> | null): string =>
  typeof track?.artist === "string" && track.artist.trim()
    ? track.artist
    : "Artista desconocido";

const normalizeLibraryTrack = (
  track: Track | null | undefined,
): Track | null => {
  if (!track || !track.id) return null;
  return {
    ...track,
    title: safeTitle(track),
    artist: safeArtist(track),
  };
};

const getAudioCompatibilityUnsupportedReason = (
  track: Track,
): string | null => {
  const bitDepth =
    typeof track.bitDepth === "number" ? track.bitDepth : undefined;
  const sampleRate =
    typeof track.sampleRate === "number" ? track.sampleRate : undefined;
  const codec = track.codec?.trim().toLowerCase();
  const extension = track.fileName?.split(".").pop()?.trim().toLowerCase();
  const safeCodecs = new Set(["lpcm", "alac", "flac", "mp3", "aac", "mp4a"]);
  const safeExtensions = new Set([
    "wav",
    "wave",
    "aif",
    "aiff",
    "aifc",
    "caf",
    "flac",
    "m4a",
    "mp4",
    "m4b",
    "mp3",
    "aac",
  ]);

  console.info("[AudioCompat] track metadata", {
    id: track.id,
    stableId: track.sourceTrackId,
    sourceUri: track.sourceUri,
    audioUrl: track.coverUrl,
    title: track.title,
    artist: track.artist,
    bitDepth,
    sampleRate,
    codec,
    extension,
    qualityClass: track.qualityClass,
  });

  const hasPreparedPlaybackFile =
    track.optimizedForPlayback === true &&
    track.optimizationStatus === "ready" &&
    typeof track.playbackUrl === "string" &&
    track.playbackUrl.length > 0;

  if (
    !hasPreparedPlaybackFile &&
    bitDepth &&
    bitDepth > MAX_SAFE_DSP_BIT_DEPTH
  ) {
    return `bitDepth ${bitDepth} exceeds ${MAX_SAFE_DSP_BIT_DEPTH}`;
  }

  if (
    !hasPreparedPlaybackFile &&
    sampleRate &&
    sampleRate > MAX_SAFE_DSP_SAMPLE_RATE
  ) {
    return `sampleRate ${sampleRate} exceeds ${MAX_SAFE_DSP_SAMPLE_RATE}`;
  }

  if (
    codec &&
    !safeCodecs.has(codec) &&
    extension &&
    !safeExtensions.has(extension)
  ) {
    return `unsupported codec/container ${codec}/${extension}`;
  }

  return null;
};

export default function Home() {
  const audioProcessor = useIosNativeAudioProcessor();
  const queue = useAudioQueue();
  const presetManager = usePresetPersistence();
  const mediaSession = useMediaSession();
  const mediaNotification = useMediaNotification();
  const crossfade = useCrossfade();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme, switchable } = useTheme();
  // Keep this as the single safeLibrary declaration, before usePlaylists.
  const safeLibrary = useMemo(() => {
    if (!Array.isArray(queue.library)) return [];
    return queue.library
      .map((track) => normalizeLibraryTrack(track))
      .filter((track): track is Track => {
        if (!track?.id) {
          console.warn("[SongsScreen] invalid track skipped", { track });
          return false;
        }
        return true;
      });
  }, [queue.library]);
  const playlistManager = usePlaylists(safeLibrary);

  const [activeTab, setActiveTab] = useState<TabType>("player");
  const [libraryView, setLibraryView] = useState<LibraryView>("main");
  const [songSort, setSongSort] = useState<"default" | "name" | "artist">(
    "default",
  );
  const [visibleSongsCount, setVisibleSongsCount] = useState(250);
  const [visibleArtistsCount, setVisibleArtistsCount] = useState(30);
  const [showQueue, setShowQueue] = useState(false);
  const [pendingTrack, setPendingTrack] = useState<Track | null>(null);
  const [nowPlayingTrack, setNowPlayingTrack] = useState<Track | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [dspParams, setDspParams] = useState<StreamingParams>({
    sweepFreq: 45,
    width: 50,
    intensity: 100,
    balance: 100,
    volume: 100,
  });
  const epicenterEnabled = audioProcessor.epicenterEnabled;
  const [activeLitePresetId, setActiveLitePresetId] = useState("neutral");
  const [proFeature, setProFeature] = useState<ProFeatureKind | null>(null);
  const [showTrackingContext, setShowTrackingContext] = useState(false);
  const [premiumPromotion, setPremiumPromotion] =
    useState<PremiumPromotionKind | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    track: Track;
    x: number;
    y: number;
  } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Playlist states
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(
    null,
  );
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [showRenamePlaylist, setShowRenamePlaylist] = useState(false);
  const [showDeletePlaylist, setShowDeletePlaylist] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState<Track | null>(
    null,
  );
  const [showAddSongsToPlaylist, setShowAddSongsToPlaylist] = useState(false); // New: modal to add songs from library
  const [showDuplicatesModal, setShowDuplicatesModal] = useState<string[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [playlistMenu, setPlaylistMenu] = useState<{
    playlist: Playlist;
    x: number;
    y: number;
  } | null>(null);

  // Ref para evitar recargar el archivo cuando cambian los params
  const currentTrackRef = useRef<string | null>(null);
  const initialLoadRef = useRef(true);
  const trackLoadRequestRef = useRef(0);
  const playbackReasonRef = useRef("queue-change");
  const currentTrackIdRef = useRef<string | null>(null);
  const playTimeoutRef = useRef<number | null>(null);
  const failedQueueTrackIdsRef = useRef<Set<string>>(new Set());
  const nextPrefetchKeyRef = useRef<string | null>(null);
  const mediaStoreReconciledRef = useRef(false);
  const lastPositionSyncRef = useRef(0);
  const adContextRef = useRef({ blocked: false });
  const previousAdTabRef = useRef<TabType>(activeTab);
  const navigationAdAttemptInFlightRef = useRef(false);
  const navigationAdBreakSerialRef = useRef(0);
  const nextInterstitialEligibleAtRef = useRef(
    Date.now() + AD_INTERSTITIAL_INTERVAL_MS,
  );
  const hiResTracks = useMemo(
    () => safeLibrary.filter((track) => track.isHiRes),
    [safeLibrary],
  );

  const sortedSongs = useMemo(() => {
    console.info("[SongsScreen] render state", {
      libraryCount: safeLibrary.length,
      songSort,
    });
    try {
      if (songSort === "default") return safeLibrary;
      const copy = [...safeLibrary];
      if (songSort === "name") {
        copy.sort((a, b) =>
          safeTitle(a).localeCompare(
            safeTitle(b),
            language === "es" ? "es" : "en",
            {
              sensitivity: "base",
            },
          ),
        );
        return copy;
      }
      copy.sort((a, b) =>
        safeArtist(a).localeCompare(
          safeArtist(b),
          language === "es" ? "es" : "en",
          {
            sensitivity: "base",
          },
        ),
      );
      return copy;
    } catch (error) {
      console.error("[SongsScreen] sort failed", error);
      return safeLibrary;
    }
  }, [safeLibrary, songSort, language]);

  useEffect(() => {
    setVisibleSongsCount(250);
    setVisibleArtistsCount(30);
  }, [songSort, safeLibrary.length]);

  const normalizedGlobalQuery = globalSearchQuery.trim().toLowerCase();

  const globalResults = useMemo(() => {
    if (!normalizedGlobalQuery) return [];
    return safeLibrary.filter((track) =>
      `${safeTitle(track)} ${safeArtist(track)}`
        .toLowerCase()
        .includes(normalizedGlobalQuery),
    );
  }, [safeLibrary, normalizedGlobalQuery]);

  const adFlowBlocked =
    showQueue ||
    showTutorial ||
    queue.importProgress.isImporting ||
    showCreatePlaylist ||
    showRenamePlaylist ||
    showDeletePlaylist ||
    !!showAddToPlaylist ||
    showAddSongsToPlaylist ||
    showDuplicatesModal.length > 0 ||
    !!contextMenu ||
    !!playlistMenu ||
    !!proFeature ||
    !!premiumPromotion ||
    showTrackingContext;

  useEffect(() => {
    adContextRef.current = {
      blocked: adFlowBlocked,
    };
  }, [adFlowBlocked]);

  const attemptNavigationInterstitial = useCallback(async () => {
    if (
      navigationAdAttemptInFlightRef.current ||
      Date.now() < nextInterstitialEligibleAtRef.current
    ) {
      return;
    }

    const context = adContextRef.current;
    if (context.blocked || document.visibilityState !== "visible") return;

    navigationAdAttemptInFlightRef.current = true;
    try {
      await adService.initialize();
      const shown = await adService.tryShowInterstitial({
        key: `navigation-${++navigationAdBreakSerialRef.current}`,
        blocked: adContextRef.current.blocked,
      });
      if (shown) {
        nextInterstitialEligibleAtRef.current =
          Date.now() + AD_INTERSTITIAL_INTERVAL_MS;
      }
    } finally {
      navigationAdAttemptInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    void adService.initialize();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attemptInFlight = false;

    const attemptTrackingContext = async () => {
      if (cancelled || attemptInFlight || adContextRef.current.blocked) return;
      attemptInFlight = true;
      try {
        if (await adService.shouldOfferTrackingContext()) {
          setShowTrackingContext(true);
        }
      } finally {
        attemptInFlight = false;
      }
    };

    void attemptTrackingContext();
    const timer = window.setInterval(
      attemptTrackingContext,
      TRACKING_CONTEXT_POLL_MS,
    );

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (previousAdTabRef.current === activeTab) return;
    previousAdTabRef.current = activeTab;
    const remainingMs = Math.max(
      0,
      nextInterstitialEligibleAtRef.current - Date.now(),
    );
    console.info(
      `[Ads] top-level navigation: ${activeTab}; eligible in ${Math.ceil(remainingMs / 1000)}s`,
    );
    void attemptNavigationInterstitial();
  }, [activeTab, attemptNavigationInterstitial]);

  const handleOpenAdPrivacyOptions = useCallback(async () => {
    try {
      await adService.showPrivacyOptions();
    } catch (error) {
      console.warn("[Ads] privacy options unavailable:", error);
      toast.info(t("lite.privacy.unavailable"));
    }
  }, [t]);

  const handleGetFullVersion = useCallback(() => {
    if (!openFullVersionAppStore()) {
      toast.info(t("lite.fullUrlPending"));
    }
  }, [t]);

  useEffect(() => {
    try {
      const tutorialDone = localStorage.getItem("epicenter-tutorial-done");
      if (!tutorialDone) {
        setShowTutorial(true);
      }
    } catch (error) {
      console.warn("[Tutorial] storage unavailable", error);
    }
  }, []);

  const finishTutorial = useCallback(() => {
    try {
      localStorage.setItem("epicenter-tutorial-done", "true");
      localStorage.setItem("epicenter-onboarding-dismissed", "true");
    } catch (error) {
      console.warn("[Tutorial] storage write failed", error);
    }
    setShowTutorial(false);
  }, []);

  const navigateTutorial = useCallback((tab: "player" | "dsp") => {
    setActiveTab(tab);
  }, []);

  const openTutorial = useCallback(() => {
    setShowTutorial(true);
  }, []);

  // Actualizar selectedPlaylist cuando cambien los playlists
  useEffect(() => {
    if (selectedPlaylist) {
      const updated = playlistManager.playlists.find(
        (p) => p.id === selectedPlaylist.id,
      );
      if (
        updated &&
        (Array.isArray(updated.trackIds) ? updated.trackIds.length : 0) !==
          (Array.isArray(selectedPlaylist.trackIds)
            ? selectedPlaylist.trackIds.length
            : 0)
      ) {
        setSelectedPlaylist(updated);
      }
    }
  }, [playlistManager.playlists, selectedPlaylist]);

  // Cargar última configuración
  useEffect(() => {
    const lastConfig = presetManager.getLastConfig();
    if (lastConfig) {
      setDspParams(clampDspParams(lastConfig.dspParams));
      audioProcessor.eqBands.forEach((_, index) => {
        audioProcessor.setEqBandGain(index, lastConfig.eqBands[index] || 0);
      });
    }
    initialLoadRef.current = false;
  }, []);

  // Configurar crossfade en el procesador de audio
  useEffect(() => {
    audioProcessor.setCrossfadeConfig({
      enabled: crossfade.enabled,
      duration: crossfade.duration,
    });
  }, [crossfade.enabled, crossfade.duration, audioProcessor]);

  const createPlaybackRequestId = (action: "next" | "previous") =>
    `ui-${action}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const handleNextTrack = useCallback(
    (
      source:
        | "media-session"
        | "notification"
        | "ui"
        | "autoplay"
        | "unsupported-skip" = "ui",
    ) => {
      const requestId = `ui-next-${Date.now()}`;
      console.info(`[UI] next click requestId=${requestId}`, {
        source,
        currentIndex: queue.currentTrackIndex,
        queueLength: queue.queue.length,
        currentTrackId: queue.currentTrack?.id,
      });
      playbackReasonRef.current =
        source === "unsupported-skip" ? "unsupported-skip" : "next";
      void audioProcessor.next(requestId);
    },
    [
      audioProcessor,
      queue.currentTrack?.id,
      queue.currentTrackIndex,
      queue.queue.length,
    ],
  );

  const handlePreviousTrack = useCallback(
    (source: "media-session" | "notification" | "ui" = "ui") => {
      const requestId = `ui-previous-${Date.now()}`;
      console.info(`[UI] previous click requestId=${requestId}`, {
        source,
        currentIndex: queue.currentTrackIndex,
        queueLength: queue.queue.length,
        currentTrackId: queue.currentTrack?.id,
      });
      playbackReasonRef.current = "previous";
      void audioProcessor.previous(requestId);
    },
    [
      audioProcessor,
      queue.currentTrack?.id,
      queue.currentTrackIndex,
      queue.queue.length,
    ],
  );

  // Configurar handlers de Media Session y Notificaciones Nativas
  useEffect(() => {
    mediaSession.setHandlers({
      onPlay: () => audioProcessor.play(),
      onPause: () => audioProcessor.pause(),
      onNextTrack: () => {
        console.info(
          "[MediaSession] ignored nexttrack on iOS Capacitor; native MPRemoteCommandCenter owns it",
        );
      },
      onPreviousTrack: () => {
        console.info(
          "[MediaSession] ignored previoustrack on iOS Capacitor; native MPRemoteCommandCenter owns it",
        );
      },
      onSeekTo: (time) => audioProcessor.seek(time),
      onSeekBackward: (offset) => {
        audioProcessor.seek(Math.max(0, audioProcessor.currentTime - offset));
      },
      onSeekForward: (offset) => {
        audioProcessor.seek(
          Math.min(
            audioProcessor.duration,
            audioProcessor.currentTime + offset,
          ),
        );
      },
    });

    mediaNotification.setHandlers({
      onPlay: () => audioProcessor.play(),
      onPause: () => audioProcessor.pause(),
      onNext: () => handleNextTrack("notification"),
      onPrevious: () => handlePreviousTrack("notification"),
      onSeek: (time) => audioProcessor.seek(time),
    });
  }, [
    audioProcessor,
    handleNextTrack,
    handlePreviousTrack,
    mediaSession,
    mediaNotification,
  ]);

  // Actualizar metadatos en Media Session cuando cambia el track
  useEffect(() => {
    if (nowPlayingTrack) {
      mediaSession.updateMetadata({
        title: nowPlayingTrack.title,
        artist: nowPlayingTrack.artist,
        artwork: nowPlayingTrack.coverUrl,
      });

      mediaNotification.updateMetadata({
        title: nowPlayingTrack.title,
        artist: nowPlayingTrack.artist,
        album: "EpicenterDSP Lite",
        artwork: nowPlayingTrack.coverUrl,
      });
    }
  }, [nowPlayingTrack, mediaSession, mediaNotification]);

  // Actualizar estado de reproducción
  useEffect(() => {
    mediaSession.updatePlaybackState(
      audioProcessor.isPlaying ? "playing" : "paused",
    );
    mediaNotification.updatePlaybackState(audioProcessor.isPlaying);

    if (audioProcessor.isPlaying && nowPlayingTrack) {
      mediaNotification.start();
    }
  }, [
    audioProcessor.isPlaying,
    mediaSession,
    mediaNotification,
    nowPlayingTrack,
  ]);

  // Actualizar posición sin saturar el bridge nativo durante reproducción.
  useEffect(() => {
    if (audioProcessor.duration <= 0) return;
    const now = performance.now();
    if (now - lastPositionSyncRef.current < 1000) return;
    lastPositionSyncRef.current = now;
    mediaSession.updatePosition(
      audioProcessor.currentTime,
      audioProcessor.duration,
    );
    mediaNotification.updatePosition(
      audioProcessor.currentTime,
      audioProcessor.duration,
    );
  }, [
    audioProcessor.currentTime,
    audioProcessor.duration,
    mediaSession,
    mediaNotification,
  ]);

  // Guardar configuración (debounced)
  useEffect(() => {
    if (initialLoadRef.current) return;
    const timer = setTimeout(() => {
      presetManager.saveLastConfig(
        audioProcessor.eqBands.map((b) => b.gain),
        dspParams,
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [dspParams, audioProcessor.eqBands]);

  useEffect(() => {
    currentTrackIdRef.current = queue.currentTrack?.id ?? null;
  }, [queue.currentTrack?.id]);

  useEffect(() => {
    const nativeTrack = audioProcessor.currentTrack;
    if (!nativeTrack) {
      if (!audioProcessor.currentTrackId) {
        setNowPlayingTrack(null);
      }
      return;
    }

    const queuedTrack =
      queue.queue.find((track) => track.id === nativeTrack.id) ??
      safeLibrary.find((track) => track.id === nativeTrack.id);

    console.info("[Playback] loaded track", {
      trackId: nativeTrack.id,
      stableId: nativeTrack.sourceTrackId,
      sourceUri: nativeTrack.sourceUri,
      cachePath: nativeTrack.albumArtUri,
      audioUrl: nativeTrack.coverUrl,
      title: nativeTrack.title,
    });
    queue.syncCurrentTrackById(nativeTrack.id);
    currentTrackRef.current = nativeTrack.id;
    setNowPlayingTrack({ ...(queuedTrack ?? {}), ...nativeTrack } as Track);
  }, [
    audioProcessor.currentTrack,
    audioProcessor.currentTrackId,
    safeLibrary,
    queue.queue,
    queue.syncCurrentTrackById,
  ]);

  const clearPendingPlaybackTimers = useCallback(() => {
    if (playTimeoutRef.current !== null) {
      window.clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
  }, []);

  const requestTrackPlayback = useCallback(
    (requestedTrack: Track, reason: string) => {
      if (!requestedTrack) return;

      const unsupportedReason =
        getAudioCompatibilityUnsupportedReason(requestedTrack);
      if (unsupportedReason) {
        console.warn("[AudioCompat] unsupported reason", {
          trackId: requestedTrack.id,
          title: requestedTrack.title,
          reason: unsupportedReason,
        });
        failedQueueTrackIdsRef.current.add(requestedTrack.id);
        setPendingTrack(null);
        toast.error(t("actions.unsupportedHiResFormat"));
        if (
          queue.queue.length > 1 &&
          queue.currentTrackIndex < queue.queue.length - 1
        ) {
          void audioProcessor.next();
        }
        return;
      }

      const requestId = ++trackLoadRequestRef.current;
      clearPendingPlaybackTimers();
      currentTrackRef.current = requestedTrack.id;
      setPendingTrack(requestedTrack);
      setNowPlayingTrack(requestedTrack);
      console.info(
        "[Playback] resolved stableId/sourceUri/cachePath/audioUrl",
        {
          reason,
          requestId,
          trackId: requestedTrack.id,
          stableId: requestedTrack.sourceTrackId,
          sourceUri: requestedTrack.sourceUri,
          cachePath: requestedTrack.albumArtUri,
          audioUrl: requestedTrack.coverUrl,
          title: requestedTrack.title,
        },
      );

      void audioProcessor.playTrackId(requestedTrack.id).then((played) => {
        if (trackLoadRequestRef.current !== requestId) return;
        setPendingTrack(null);
        if (!played) {
          currentTrackRef.current = null;
          toast.error(t("actions.errorLoadingTrackNoFallback"));
        }
      });
    },
    [
      audioProcessor,
      clearPendingPlaybackTimers,
      queue.currentTrackIndex,
      queue.queue.length,
      t,
    ],
  );

  const playNextAvailableTrackAfterFailure = useCallback(
    (failedQueueTrackId: string) => {
      if (queue.queue.length <= 1) {
        return false;
      }

      const startIndex = queue.currentTrackIndex;
      for (let offset = 1; offset < queue.queue.length; offset += 1) {
        const candidateIndex = (startIndex + offset) % queue.queue.length;
        const candidateTrack = queue.queue[candidateIndex];

        if (!candidateTrack || candidateTrack.id === failedQueueTrackId) {
          continue;
        }

        if (failedQueueTrackIdsRef.current.has(candidateTrack.id)) {
          continue;
        }

        playbackReasonRef.current = "failure-skip";
        void audioProcessor.next();
        return true;
      }

      return false;
    },
    [audioProcessor, queue.currentTrackIndex, queue.queue],
  );

  // Configurar callbacks cuando termina o falla una canción.
  useEffect(() => {
    audioProcessor.setOnTrackEnded(() => {
      console.info(
        "[Playback] native track ended; NativePlaybackController owns auto-next",
      );
    });

    audioProcessor.setOnTrackError((error) => {
      const failedTrackId = queue.currentTrack?.id;
      if (!failedTrackId) {
        return;
      }

      failedQueueTrackIdsRef.current.add(failedTrackId);
      clearPendingPlaybackTimers();
      audioProcessor.resetAfterError();
      currentTrackRef.current = null;
      console.error("Playback runtime error:", error);

      // NativePlaybackController owns failure-skip decisions. Web only records
      // the temporary failed track and reflects the controlled error to the UI.
      toast.error(t("actions.errorLoadingTrackSkipped"));
    });

    return () => {
      audioProcessor.setOnTrackEnded(null);
      audioProcessor.setOnTrackError(null);
    };
  }, [
    audioProcessor,
    clearPendingPlaybackTimers,
    playNextAvailableTrackAfterFailure,
    queue,
    t,
  ]);

  useEffect(() => {
    if (audioProcessor.isPlaying && queue.currentTrack?.id) {
      failedQueueTrackIdsRef.current.delete(queue.currentTrack.id);
    }
  }, [audioProcessor.isPlaying, queue.currentTrack?.id]);

  useEffect(() => {
    return () => {
      trackLoadRequestRef.current += 1;
      clearPendingPlaybackTimers();
    };
  }, [clearPendingPlaybackTimers]);

  // Cargar track cuando cambia (y guardar como último track).
  //
  // IMPORTANT: depend only on the *selected track id*. Previously this effect also
  // depended on `requestTrackPlayback`, whose identity changes on every progress tick
  // (it closes over the `audioProcessor` memo, which is rebuilt each second). That made
  // the effect run on stale intermediate renders during a native-initiated skip: at that
  // point `queue.currentTrack` still pointed at the *old* track (the queue index sync had
  // not applied yet) while `currentTrackRef` had already been advanced to the new track by
  // the effect above. The guard therefore failed and we re-requested playback of the OLD
  // track, fighting the native skip and making the player bounce back and forth between
  // tracks. Reacting only to `queue.currentTrack?.id` ensures we act on a genuine
  // selection change, after the index has settled.
  useEffect(() => {
    const requestedTrack = queue.currentTrack;

    if (!requestedTrack || requestedTrack.id === currentTrackRef.current) {
      return;
    }

    const reason = playbackReasonRef.current || "queue-change";
    playbackReasonRef.current = "queue-change";
    requestTrackPlayback(requestedTrack, reason);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.currentTrack?.id]);

  const handleFileSelect = useCallback(async () => {
    try {
      const result = await queue.importManualTracksFromNativePicker();
      if (result.added > 0) {
        const msg =
          result.added > 1
            ? t("actions.songsAddedPlural", { count: result.added })
            : t("actions.songsAdded", { count: result.added });
        toast.success(msg);
      }

      if (result.duplicates.length > 0) {
        setShowDuplicatesModal(result.duplicates);
      }
      if (result.limitReached) {
        setProFeature("libraryLimit");
      }
    } catch (error) {
      console.error("[iOS Native Library] import failed", error);
      toast.error(t("actions.errorAddingSongs"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }, [queue, t]);

  const updateDspParam = useCallback(
    (key: keyof StreamingParams, value: number) => {
      const clampedValue = clampDspParam(key, value);
      setDspParams((prev) => ({ ...prev, [key]: clampedValue }));
      if (key === "volume" || epicenterEnabled) {
        audioProcessor.setDspParam(key, clampedValue);
      }
    },
    [audioProcessor, epicenterEnabled],
  );

  const toggleEq = useCallback(
    (enabled: boolean) => {
      audioProcessor.setEqEnabled(enabled);

      // Epicenter debe poder seguir activo de forma independiente aunque el EQ se apague.
    },
    [audioProcessor, epicenterEnabled],
  );

  const toggleEpicenter = useCallback(() => {
    const newEnabled = !epicenterEnabled;
    audioProcessor.setEpicenterEnabled(newEnabled);
    if (newEnabled) {
      Object.entries(dspParams).forEach(([key, value]) => {
        audioProcessor.setDspParam(key as keyof StreamingParams, value);
      });
    }
  }, [epicenterEnabled, audioProcessor, dspParams]);

  const selectLitePreset = useCallback(
    (presetId: string) => {
      const preset = LITE_EQ_PRESETS.find(
        (candidate) => candidate.id === presetId,
      );
      if (!preset) return;
      audioProcessor.setEqPresetGains(preset.gains);
      setActiveLitePresetId(preset.id);
    },
    [audioProcessor],
  );

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Agrupar canciones
  const songsByArtist = useMemo(
    () =>
      safeLibrary.reduce(
        (acc, track) => {
          if (!track?.id) {
            console.warn(
              "[ActionsScreen] skipping invalid artist track",
              track,
            );
            return acc;
          }
          const artist = track.artist || t("common.unknownArtist");
          if (!acc[artist]) acc[artist] = [];
          acc[artist].push(track);
          return acc;
        },
        {} as Record<string, Track[]>,
      ),
    [safeLibrary, t],
  );

  const albums = useMemo(
    () =>
      safeLibrary.reduce(
        (acc, track) => {
          if (!track?.id) {
            console.warn("[ActionsScreen] skipping invalid album track", track);
            return acc;
          }
          const title = track.title || t("player.noTrack");
          const album = title.split(" - ")[0] || title;
          if (!acc[album]) acc[album] = [];
          acc[album].push(track);
          return acc;
        },
        {} as Record<string, Track[]>,
      ),
    [safeLibrary, t],
  );

  // Handlers
  const handleAddToQueue = (track: Track) => {
    queue.addToQueue(track);
    toast.success(t("actions.addedToQueue"));
    setContextMenu(null);
  };

  const handlePlayNext = (track: Track) => {
    queue.addToQueueNext(track);
    toast.success(t("actions.willPlayNext"));
    setContextMenu(null);
  };

  const handlePlayNow = (
    track: Track,
    contextTracks: Track[] = safeLibrary,
  ) => {
    playbackReasonRef.current = "manual";
    currentTrackRef.current = null;
    queue.playNow(track, contextTracks);
    setContextMenu(null);
    setActiveTab("player");
    setShowQueue(false);
  };

  const handlePersistEphemeralTrack = useCallback(
    async (track: Track) => {
      try {
        const persisted = await queue.persistEphemeralTrack(track.id);
        if (persisted) {
          toast.success(t("actions.persistTrackSuccess"));
        } else {
          toast.error(t("actions.persistTrackFailed"));
        }
      } catch (error) {
        console.error("Error persisting track:", error);
        toast.error(t("actions.persistTrackFailed"));
      }
    },
    [queue, t],
  );

  const handleShufflePlay = (tracks: Track[]) => {
    if (tracks.length === 0) {
      toast.error(t("actions.noSongsToPlay"));
      return;
    }
    const candidates =
      tracks.length > 1 && nowPlayingTrack
        ? tracks.filter((track) => track.id !== nowPlayingTrack.id)
        : tracks;
    const randomIndex = Math.floor(Math.random() * candidates.length);
    const randomTrack = candidates[randomIndex] ?? tracks[0];
    console.info("[SHUFFLE_REQUEST]", {
      randomIndex,
      randomTrackId: randomTrack.id,
      randomTitle: randomTrack.title,
      previousNowPlayingId: nowPlayingTrack?.id,
    });
    playbackReasonRef.current = "shuffle";
    currentTrackRef.current = null;
    queue.shuffleAll(tracks, randomTrack.id);
    toast.success(t("actions.playingShuffled", { count: tracks.length }));
    setActiveTab("player");
    setShowQueue(false);
  };

  const handlePlayInOrder = (tracks: Track[]) => {
    if (tracks.length === 0) {
      toast.error(t("actions.noSongsToPlay"));
      return;
    }
    playbackReasonRef.current = "manual-order";
    currentTrackRef.current = null;
    queue.playAllInOrder(tracks);
    toast.success(t("actions.playingAll", { count: tracks.length }));
    setActiveTab("player");
    setShowQueue(false);
  };

  // Playlist handlers
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    await playlistManager.createPlaylist(newPlaylistName.trim());
    toast.success(t("playlists.created"));
    setNewPlaylistName("");
    setShowCreatePlaylist(false);
  };

  const handleRenamePlaylist = async () => {
    if (!selectedPlaylist || !newPlaylistName.trim()) return;
    await playlistManager.renamePlaylist(
      selectedPlaylist.id,
      newPlaylistName.trim(),
    );
    setSelectedPlaylist({ ...selectedPlaylist, name: newPlaylistName.trim() });
    toast.success(t("playlists.renamed"));
    setNewPlaylistName("");
    setShowRenamePlaylist(false);
    setPlaylistMenu(null);
  };

  const handleDeletePlaylist = async () => {
    if (!selectedPlaylist) return;
    await playlistManager.deletePlaylist(selectedPlaylist.id);
    toast.success(t("playlists.deleted"));
    setSelectedPlaylist(null);
    setShowDeletePlaylist(false);
    setPlaylistMenu(null);
    setLibraryView("playlists");
  };

  const handleAddToPlaylist = async (playlistId: string, track: Track) => {
    await playlistManager.addTrackToPlaylist(playlistId, track.id);
    toast.success(t("playlists.songAdded"));
    setShowAddToPlaylist(null);
  };

  const handleRemoveFromPlaylist = async (track: Track) => {
    if (!selectedPlaylist) return;
    await playlistManager.removeTrackFromPlaylist(
      selectedPlaylist.id,
      track.id,
    );
    // Update local state
    const updatedPlaylist = playlistManager.playlists.find(
      (p) => p.id === selectedPlaylist.id,
    );
    if (updatedPlaylist) {
      setSelectedPlaylist(updatedPlaylist);
    }
    toast.success(t("playlists.songRemoved"));
  };

  // Handler para abrir modal de selección de playlist desde cualquier canción
  const handleOpenAddToPlaylist = (track: Track) => {
    setShowAddToPlaylist(track);
  };

  // Handler para agregar canción a la playlist seleccionada (desde el modal dentro de playlist-detail)
  const handleAddSongToSelectedPlaylist = async (track: Track) => {
    if (!selectedPlaylist) return;

    // Check if already in playlist
    if (!track?.id) return;

    const selectedTrackIds = Array.isArray(selectedPlaylist.trackIds)
      ? selectedPlaylist.trackIds
      : [];
    if (selectedTrackIds.includes(track.id)) {
      toast.error(t("duplicates.alreadyInPlaylist"));
      return;
    }

    await playlistManager.addTrackToPlaylist(selectedPlaylist.id, track.id);
    toast.success(t("playlists.songAdded"));
  };

  // Touch reorder state
  const [touchStart, setTouchStart] = useState<{
    index: number;
    y: number;
  } | null>(null);
  const isRestoringNavigationRef = useRef(false);
  const lastNavigationSnapshotRef = useRef<HomeNavigationSnapshot | null>(null);

  const buildNavigationSnapshot = useCallback(
    (): HomeNavigationSnapshot => ({
      activeTab,
      libraryView,
      showQueue,
      showCreatePlaylist,
      showRenamePlaylist,
      showDeletePlaylist,
      showAddToPlaylist: !!showAddToPlaylist,
      showAddSongsToPlaylist,
      showTutorial,
      selectedPlaylistId: selectedPlaylist?.id ?? null,
      contextMenuOpen: !!contextMenu,
      playlistMenuOpen: !!playlistMenu,
      duplicatesModalOpen: showDuplicatesModal.length > 0,
    }),
    [
      activeTab,
      libraryView,
      showQueue,
      showCreatePlaylist,
      showRenamePlaylist,
      showDeletePlaylist,
      showAddToPlaylist,
      showAddSongsToPlaylist,
      showTutorial,
      selectedPlaylist,
      contextMenu,
      playlistMenu,
      showDuplicatesModal,
    ],
  );

  const applyNavigationSnapshot = useCallback(
    (snapshot: HomeNavigationSnapshot) => {
      isRestoringNavigationRef.current = true;

      setActiveTab(snapshot.activeTab);
      setLibraryView(snapshot.libraryView);
      setShowQueue(snapshot.showQueue);
      setShowCreatePlaylist(snapshot.showCreatePlaylist);
      setShowRenamePlaylist(snapshot.showRenamePlaylist);
      setShowDeletePlaylist(snapshot.showDeletePlaylist);
      setShowAddSongsToPlaylist(snapshot.showAddSongsToPlaylist);
      setShowTutorial(snapshot.showTutorial === true);

      if (!snapshot.showAddToPlaylist) {
        setShowAddToPlaylist(null);
      }
      if (!snapshot.contextMenuOpen) {
        setContextMenu(null);
      }
      if (!snapshot.playlistMenuOpen) {
        setPlaylistMenu(null);
      }
      if (!snapshot.duplicatesModalOpen) {
        setShowDuplicatesModal([]);
      }

      const snapshotPlaylist = snapshot.selectedPlaylistId
        ? (playlistManager.playlists.find(
            (playlist) => playlist.id === snapshot.selectedPlaylistId,
          ) ?? null)
        : null;

      if (snapshot.libraryView === "playlist-detail" && !snapshotPlaylist) {
        setLibraryView("playlists");
      }

      setSelectedPlaylist(snapshotPlaylist);

      window.setTimeout(() => {
        isRestoringNavigationRef.current = false;
      }, 0);
    },
    [playlistManager.playlists],
  );

  useEffect(() => {
    const initialSnapshot = buildNavigationSnapshot();
    lastNavigationSnapshotRef.current = initialSnapshot;

    window.history.replaceState(
      {
        ...(window.history.state ?? {}),
        [HOME_NAVIGATION_STATE_KEY]: initialSnapshot,
      },
      "",
    );
  }, []);

  useEffect(() => {
    if (isRestoringNavigationRef.current) return;

    const nextSnapshot = buildNavigationSnapshot();
    const previousSnapshot = lastNavigationSnapshotRef.current;

    if (
      previousSnapshot &&
      JSON.stringify(previousSnapshot) === JSON.stringify(nextSnapshot)
    ) {
      return;
    }

    lastNavigationSnapshotRef.current = nextSnapshot;
    window.history.pushState(
      {
        ...(window.history.state ?? {}),
        [HOME_NAVIGATION_STATE_KEY]: nextSnapshot,
      },
      "",
    );
  }, [buildNavigationSnapshot]);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const navigationSnapshot = event.state?.[HOME_NAVIGATION_STATE_KEY] as
        | HomeNavigationSnapshot
        | undefined;

      if (!navigationSnapshot) {
        return;
      }

      lastNavigationSnapshotRef.current = navigationSnapshot;
      applyNavigationSnapshot(navigationSnapshot);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applyNavigationSnapshot]);

  const dspControls = useMemo<DspParamConfig[]>(() => {
    // In headphones mode the new engine is driven by Intensity only, so the knobs
    // that belong to the classic (car audio) engine are disabled.
    const headphonesMode = audioProcessor.epicenterMode === "headphones";
    return [
      {
        key: "sweepFreq",
        label: t("dsp.sweep"),
        value: dspParams.sweepFreq,
        min: 27,
        max: 63,
        step: 1,
        unit: " Hz",
        onChange: (value) => updateDspParam("sweepFreq", value),
        disabled: !epicenterEnabled || headphonesMode,
      },
      {
        key: "width",
        label: t("dsp.width"),
        value: dspParams.width,
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        onChange: (value) => updateDspParam("width", value),
        disabled: true,
        premium: true,
      },
      {
        key: "intensity",
        label: t("dsp.intensity"),
        value: dspParams.intensity,
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        onChange: (value) => updateDspParam("intensity", value),
        disabled: !epicenterEnabled,
      },
      {
        key: "balance",
        label: t("dsp.balance"),
        value: dspParams.balance,
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        onChange: (value) => updateDspParam("balance", value),
        disabled: true,
        premium: true,
      },
      {
        key: "volume",
        label: t("dsp.volume"),
        value: dspParams.volume,
        min: 0,
        max: 100,
        step: 1,
        unit: "%",
        onChange: (value) => updateDspParam("volume", value),
      },
    ];
  }, [
    dspParams,
    epicenterEnabled,
    t,
    updateDspParam,
    audioProcessor.epicenterMode,
  ]);

  useEffect(() => {
    if (!["dsp", "eq", "fx"].includes(activeTab)) return;

    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "player") return;

    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
    };
  }, [activeTab]);

  return (
    <div className="epicenter-shell min-h-screen flex flex-col bg-black text-white">
      <ActionsErrorBoundary t={t}>
        <TrackContextMenu
          contextMenu={contextMenu}
          t={t}
          onClose={() => setContextMenu(null)}
          onPlayNow={handlePlayNow}
          onPlayNext={handlePlayNext}
          onAddToQueue={handleAddToQueue}
          onAddToPlaylist={(track) => {
            setShowAddToPlaylist(track);
            setContextMenu(null);
          }}
        />

        <PlaylistContextMenu
          playlistMenu={playlistMenu}
          t={t}
          onClose={() => setPlaylistMenu(null)}
          onRename={(playlist) => {
            setSelectedPlaylist(playlist);
            setNewPlaylistName(playlist.name);
            setShowRenamePlaylist(true);
          }}
          onDelete={(playlist) => {
            setSelectedPlaylist(playlist);
            setShowDeletePlaylist(true);
          }}
        />
      </ActionsErrorBoundary>

      <PlaylistNameModal
        isOpen={showCreatePlaylist}
        title={t("playlists.createNew")}
        confirmLabel={t("playlists.create")}
        cancelLabel={t("common.cancel")}
        playlistName={newPlaylistName}
        placeholder={t("playlists.enterName")}
        onPlaylistNameChange={setNewPlaylistName}
        onClose={() => {
          setShowCreatePlaylist(false);
          setNewPlaylistName("");
        }}
        onConfirm={handleCreatePlaylist}
      />

      <PlaylistNameModal
        isOpen={showRenamePlaylist && !!selectedPlaylist}
        title={t("playlists.rename")}
        confirmLabel={t("common.save")}
        cancelLabel={t("common.cancel")}
        playlistName={newPlaylistName}
        placeholder={t("playlists.enterName")}
        onPlaylistNameChange={setNewPlaylistName}
        onClose={() => {
          setShowRenamePlaylist(false);
          setNewPlaylistName("");
          setPlaylistMenu(null);
        }}
        onConfirm={handleRenamePlaylist}
      />

      <DeletePlaylistModal
        isOpen={showDeletePlaylist && !!selectedPlaylist}
        t={t}
        onClose={() => {
          setShowDeletePlaylist(false);
          setPlaylistMenu(null);
        }}
        onConfirm={handleDeletePlaylist}
      />

      <ActionsErrorBoundary t={t}>
        <AddToPlaylistModal
          track={showAddToPlaylist}
          playlists={playlistManager.playlists}
          t={t}
          onClose={() => setShowAddToPlaylist(null)}
          onSelect={handleAddToPlaylist}
        />

        <DuplicatesModal
          duplicateFileNames={showDuplicatesModal}
          t={t}
          onClose={() => setShowDuplicatesModal([])}
        />
      </ActionsErrorBoundary>

      <ActionsErrorBoundary t={t}>
        <AddSongsToPlaylistModal
          isOpen={showAddSongsToPlaylist}
          selectedPlaylist={selectedPlaylist}
          library={safeLibrary}
          t={t}
          onClose={() => setShowAddSongsToPlaylist(false)}
          onAddTrack={handleAddSongToSelectedPlaylist}
        />
      </ActionsErrorBoundary>

      <HomePlayerView
        isVisible={activeTab === "player"}
        t={t}
        showQueue={showQueue}
        onToggleQueue={() => setShowQueue(!showQueue)}
        onCloseQueue={() => setShowQueue(false)}
        onOpenFilePicker={handleFileSelect}
        queue={{
          queue: queue.queue,
          currentTrack: nowPlayingTrack,
          currentTrackIndex: nowPlayingTrack
            ? queue.queue.findIndex((track) => track.id === nowPlayingTrack.id)
            : queue.currentTrackIndex,
          playTrack: (index: number) => {
            playbackReasonRef.current = "manual";
            queue.playTrack(index);
          },
          removeFromQueue: queue.removeFromQueue,
          reorderQueue: queue.reorderQueue,
          previousTrack: () => handlePreviousTrack("ui"),
          nextTrack: () => handleNextTrack("ui"),
        }}
        audioProcessor={{
          currentTime: audioProcessor.currentTime,
          duration: audioProcessor.duration,
          isPlaying: audioProcessor.isPlaying,
          seek: audioProcessor.seek,
          pause: audioProcessor.pause,
          play: audioProcessor.play,
          getAnalyserNode: audioProcessor.getAnalyserNode,
        }}
        draggedIndex={draggedIndex}
        onDraggedIndexChange={setDraggedIndex}
        touchStart={touchStart}
        onTouchStartChange={setTouchStart}
        formatTime={formatTime}
        hiresAudioBadgeUrl={hiresAudioBadgeUrl}
        epicenterEnabled={epicenterEnabled}
      />

      {activeTab === "library" && (
        <HomeLibraryView
          t={t}
          libraryView={libraryView}
          setLibraryView={setLibraryView}
          queueLibrary={safeLibrary}
          queueIsLoading={queue.isLoading}
          importIsImporting={queue.importProgress.isImporting}
          playlists={playlistManager.playlists}
          selectedPlaylist={selectedPlaylist}
          setSelectedPlaylist={setSelectedPlaylist}
          hiResTracks={hiResTracks}
          songsByArtist={songsByArtist}
          albums={albums}
          sortedSongs={sortedSongs}
          songSort={songSort}
          setSongSort={setSongSort}
          visibleSongsCount={visibleSongsCount}
          setVisibleSongsCount={setVisibleSongsCount}
          visibleArtistsCount={visibleArtistsCount}
          setVisibleArtistsCount={setVisibleArtistsCount}
          playlistMenu={playlistMenu}
          setPlaylistMenu={setPlaylistMenu}
          onCreatePlaylist={() => setShowCreatePlaylist(true)}
          onOpenFilePicker={handleFileSelect}
          onPlayNow={handlePlayNow}
          onAddToQueue={handleAddToQueue}
          onPlayNext={handlePlayNext}
          onAddToPlaylist={handleOpenAddToPlaylist}
          onPlayInOrder={handlePlayInOrder}
          onShufflePlay={handleShufflePlay}
          onOpenAddToPlaylist={handleOpenAddToPlaylist}
          onPersistEphemeralTrack={handlePersistEphemeralTrack}
          onOpenAddSongsToPlaylist={() => setShowAddSongsToPlaylist(true)}
          onOpenDeletePlaylist={(playlist) => {
            setSelectedPlaylist(playlist);
            setShowDeletePlaylist(true);
          }}
          onOpenRenamePlaylist={(playlist) => {
            setSelectedPlaylist(playlist);
            setNewPlaylistName(playlist.name);
            setShowRenamePlaylist(true);
          }}
          onRemoveFromPlaylist={handleRemoveFromPlaylist}
          hiresLogoUrl={hiresLogoUrl}
        />
      )}

      {activeTab === "search" && (
        <HomeSearchView
          t={t}
          globalSearchQuery={globalSearchQuery}
          setGlobalSearchQuery={setGlobalSearchQuery}
          normalizedGlobalQuery={normalizedGlobalQuery}
          globalResults={globalResults}
          onPlayNow={handlePlayNow}
          onAddToQueue={handleAddToQueue}
          onPlayNext={handlePlayNext}
          onAddToPlaylist={handleOpenAddToPlaylist}
        />
      )}

      {activeTab === "eq" && (
        <HomeEqView
          t={t}
          eqEnabled={audioProcessor.eqEnabled}
          activePresetId={activeLitePresetId}
          onToggleEq={toggleEq}
          onSelectPreset={selectLitePreset}
          onOpenAutoModal={() => setProFeature("autoEq")}
          onOpenManualEq={() => setProFeature("eq31")}
        />
      )}

      {activeTab === "dsp" && (
        <HomeDspView
          t={t}
          epicenterEnabled={epicenterEnabled}
          epicenterMode={audioProcessor.epicenterMode}
          onChangeEpicenterMode={audioProcessor.setEpicenterMode}
          params={dspControls}
          onOpenAutoModal={() => setProFeature("autoEpicenter")}
          onOpenAdvancedModal={() => setProFeature("advancedEpicenter")}
          onOpenPremium={() => setPremiumPromotion("benefits")}
          onToggleEpicenter={toggleEpicenter}
          onOpenEq={() => setActiveTab("eq")}
          onOpenFx={() => setProFeature("effects")}
        />
      )}

      {FEATURES.spatialEffects && activeTab === "fx" && (
        <HomeFxView
          t={t}
          reverbEnabled={audioProcessor.spatialEffects.reverbEnabled}
          reverbAmount={audioProcessor.spatialEffects.reverbAmount}
          concertHallEnabled={audioProcessor.spatialEffects.concertHallEnabled}
          concertHallAmount={audioProcessor.spatialEffects.concertHallAmount}
          onToggleReverb={audioProcessor.setReverbEnabled}
          onReverbAmountChange={audioProcessor.setReverbAmount}
          onToggleConcertHall={audioProcessor.setConcertHallEnabled}
          onConcertHallAmountChange={audioProcessor.setConcertHallAmount}
        />
      )}

      {activeTab === "settings" && (
        <HomeSettingsView
          t={t}
          switchable={switchable}
          theme={theme}
          toggleTheme={toggleTheme}
          language={language}
          setLanguage={setLanguage}
          crossfadeEnabled={crossfade.enabled}
          crossfadeDuration={crossfade.duration}
          onCrossfadeEnabledChange={crossfade.setEnabled}
          onCrossfadeDurationChange={crossfade.setDuration}
          onOpenAdPrivacyOptions={handleOpenAdPrivacyOptions}
          onOpenTutorial={openTutorial}
          onGetFullVersion={handleGetFullVersion}
        />
      )}

      <HomeImportProgressOverlay t={t} importProgress={queue.importProgress} />

      {activeTab !== "player" && nowPlayingTrack && (
        <PremiumMiniPlayer
          track={nowPlayingTrack}
          isPlaying={audioProcessor.isPlaying}
          currentTime={audioProcessor.currentTime}
          duration={audioProcessor.duration}
          onPlay={audioProcessor.play}
          onPause={audioProcessor.pause}
          onOpenPlayer={() => setActiveTab("player")}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === "fx" && !FEATURES.spatialEffects) {
            setProFeature("effects");
            return;
          }
          setActiveTab(tab);
        }}
        onLibraryTab={() => {
          setActiveTab("library");
          setLibraryView("main");
        }}
        eqEnabled={audioProcessor.eqEnabled}
        epicenterEnabled={epicenterEnabled}
        spatialEffectsEnabled={
          audioProcessor.spatialEffects.reverbEnabled ||
          audioProcessor.spatialEffects.concertHallEnabled
        }
        t={t}
      />
      <ProFeatureModal
        feature={proFeature}
        t={t}
        onClose={() => setProFeature(null)}
      />
      <PremiumPromotionDialog
        kind={premiumPromotion}
        t={t}
        onBuy={handleGetFullVersion}
        onClose={() => {
          setPremiumPromotion(null);
        }}
      />
      <TrackingTransparencyDialog
        open={showTrackingContext}
        t={t}
        onContinue={() => {
          setShowTrackingContext(false);
          void adService.requestTrackingAuthorization();
        }}
        onNotNow={() => {
          setShowTrackingContext(false);
          adService.dismissTrackingContext();
        }}
      />
      {showTutorial && (
        <EpicenterTutorial
          t={t}
          onFinish={finishTutorial}
          onNavigate={navigateTutorial}
        />
      )}
      <div className={activeTab === "player" ? "h-0" : "home-bottom-spacer"} />
    </div>
  );
}

# Migration notes

## Provenance

This is a new, independent Git repository. It was assembled selectively from:

- `CARPETA_IOS_FULL`: technical source for the React/Capacitor application, iOS target, native audio engine, SQLite library, document picker, metadata, queue, playlists, background playback, lock-screen controls, CarPlay, Hi-Res handling, and DSP bridge.
- `CARPETA_ANDROID_LITE`: product-policy reference for the 30-song limit, Lite preset set, safe EQ boost, headphones mode, and Full upsell behavior.

The Android project itself was not ported into this repository. Its Android build, Gradle, MediaStore, notification, and Play Store code are not part of the iOS target.

## Reference-folder cleanup

Before migration, only regenerable or explicitly disposable content was removed from the two reference folders:

- all `node_modules`
- web `dist` outputs
- Android `.gradle`, `.idea`, `app/build`, native `.cxx`, and generated Capacitor Android plugin build outputs
- generated Capacitor web payloads under native `assets/public` and `ios/App/App/public`
- generated laboratory output, compiled laboratory executables, and large test-audio copies
- redundant source/build ZIP archives
- `.manus-logs`
- folders explicitly named `basura_para_borrar_manual`

Source, assets, manifests, native projects, documentation, lockfiles, and Git history were preserved. The removed dependency/build content can be recreated with `pnpm install`, `pnpm build`, and the native platform build tools.

## New repository choices

- New package: `epicenterdsp-lite-ios` at version `1.0.0`
- New bundle ID: `com.epicenterdsp.lite`
- New display name and web title: `EpicenterDSP Lite`
- New repository initialized on branch `main`; no remote was configured and nothing was pushed
- Android-only hooks, scanner UI, review link, Android documentation, and an obsolete Android build script were omitted
- the unused template server, authentication/cloud integrations, debug collector, browser worklet, and unreachable UI components were omitted
- the dependency graph was reduced from 848 installed packages (403.7 MB) to 268 packages (147.7 MB) during validation
- The Android Lite artwork was reused as the provisional iOS app icon

Because iOS stores documents and Application Support data inside the application container, the distinct bundle ID gives Lite an independent music library and preferences. It does not read or overwrite the Full app's SQLite database or imported files.

## Lite enforcement

The frontend source of truth is `client/src/config/appEdition.ts`.

The 30-song rule has two layers:

1. `useAudioQueue` stops an import when the current library is already full and always passes `maxTrackCount: 30`.
2. `NativeTrackImporter` recounts the stored SQLite rows and enforces the limit while processing a multi-file selection.

The native layer checks duplicates before consuming capacity. Temporary audio, artwork, and optimized files created for duplicate or over-limit selections are removed. Deleting a stored row and its files frees capacity.

Full-only processing is disabled in both layers:

- the UI exposes only six safe presets
- arbitrary preset data is clamped to -8…+2 dB
- the React hook refuses manual per-band edits, Auto EQ, and spatial-effect changes
- the native bridge rejects manual single-band EQ, clamps bulk preset values, forces Auto EQ off, and forces advanced effects off

The Full processing engine remains part of the inherited native technical base, but Lite has no functional route that enables its Full-only controls.

## Ads and consent

`@capacitor-community/admob` 6.2.0 is used because its major version matches Capacitor 6. The plugin pins Google Mobile Ads SDK 11.3.0.

The local bridge pins Google User Messaging Platform 2.7.0. UMP 3 renamed its Swift API, so accepting an unconstrained newer major would make this Capacitor 6 bridge non-reproducible.

The version-6 JavaScript API does not expose UMP's `canRequestAds` or privacy-options form. The local `EpicenterNative` plugin therefore adds two narrow iOS methods backed by Google UMP:

- `getAdConsentState`
- `showAdPrivacyOptions`

`adService.ts` owns initialization, listener registration, preload state, bounded retries, natural-break eligibility, ATT context, session delay, cooldown, and fail-open behavior. No Firebase package or Firebase configuration file was added.

## Files that require release configuration

- `.env` (created locally from `.env.example`)
- `ios/App/App/Info.plist` production `GADApplicationIdentifier`
- Xcode development team, signing certificates, and provisioning profiles
- `VITE_FULL_VERSION_APP_STORE_URL`
- production AdMob iOS app and interstitial IDs

Run `pnpm verify:release` before creating an App Store archive.

## Validation performed on the creation machine

- dependency installation with pnpm 10.4.1
- TypeScript no-emission check
- automated Vitest suite
- production Vite application build
- Capacitor iOS sync with both plugins detected
- JSON and `Info.plist` XML parsing

The creation machine runs Windows, so CocoaPods installation, Swift compilation, Xcode simulator/device tests, signing, archive validation, and App Store upload were not available. Those checks are explicitly covered by the manual plan.

The inherited `Podfile.lock` was intentionally omitted because it predated AdMob/UMP and would have falsely described the native dependency graph. Generate and commit a fresh lockfile with `pod install` on macOS.

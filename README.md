# EpicenterDSP Lite for iOS

Independent iOS edition of EpicenterDSP. It keeps the native playback, background audio, lock-screen controls, metadata, playlists, queue, Hi-Res handling, and basic Epicenter processing from the Full iOS technical base while enforcing the Lite product rules.

## Lite product rules

- Bundle ID: `com.epicenterdsp.lite`
- Display name: `EpicenterDSP Lite`
- Imported library: at most 30 stored songs
- Duplicate imports do not consume a slot
- Deleting a song immediately frees a slot
- Tapping a specific song starts there and continues through the remaining songs in the visible library, artist, album, Hi-Res, playlist, or search order
- Six safe EQ presets, clamped to a maximum boost of +2 dB
- Intensity in Normal and Headphones modes, plus Sweep in Normal mode
- Animated five-screen first-run tutorial for enabling Epicenter and choosing between Normal and Headphones; it can be replayed from Settings
- Manual 31-band EQ, Auto EQ, Auto Epicenter, advanced Width/Balance, spatial effects, and unlimited imports are Full benefits
- Muted AdMob interstitials only; no native, rewarded, banner, app-open ads, or Firebase Analytics
- Premium prompts are contextual: locked tools, the 30-song boundary, Settings, and a DSP-only shortcut. Interstitial dismissal never opens a second promotion

The single product-policy source is [`client/src/config/appEdition.ts`](client/src/config/appEdition.ts).

## Requirements

- Node.js 22.12 or newer
- pnpm 10.4.1
- macOS with Xcode 16 or newer for native compilation and signing
- CocoaPods
- An Apple Developer team and an App Store Connect record for the Lite bundle ID

The web/type checks can run on Windows or macOS. Xcode, CocoaPods, simulator, device, archive, and signing checks require macOS.

## Local setup

```bash
pnpm install
cp .env.example .env
pnpm typecheck
pnpm test
pnpm build
pnpm exec cap sync ios
```

Open the native workspace on macOS:

```bash
pnpm exec cap open ios
```

Always open `ios/App/App.xcworkspace` after CocoaPods has been installed, select the `App` target, choose the development team, and verify the bundle identifier is `com.epicenterdsp.lite`.

## Editing on Windows, building on macOS

The web layer, TypeScript, Swift, C++, and the Xcode project files can all be
edited on Windows. Only compilation, signing, and archiving require macOS.

The repository intentionally does not version `node_modules`, `.env`, `dist/`,
`ios/App/App/public`, or `ios/App/Pods`. After pulling on the Mac, one command
rebuilds all of it:

```bash
git pull
pnpm mac:setup
```

`pnpm mac:setup` installs dependencies, creates `.env` from `.env.example` if it
is missing, builds the web bundle, runs `cap sync ios`, runs every verification
script, and finishes with `pod install`. When it succeeds, open
`ios/App/App.xcworkspace` and the only remaining manual step is selecting the
development team under Signing & Capabilities.

Line endings are pinned by `.gitattributes`, so source files stay LF on both
machines.

## AdMob, UMP, and ATT

Every build uses the EpicenterDSP Lite production identifiers:

- iOS app ID: `ca-app-pub-4970020999623772~6089460269`
- iOS interstitial unit: `ca-app-pub-4970020999623772/2927156018`

There is no sample-ID or test-mode code path. During development, register each iPhone as a test device in AdMob before interacting with ads so requests made with the production units are labeled as tests. The app initializes the Capacitor AdMob bridge before refreshing UMP consent, then waits for UMP to report that ads may be requested before loading any ad. If a refresh fails transiently, a still-valid consent decision cached by UMP may continue to be used; a fresh install remains blocked until UMP establishes consent. Settings exposes the UMP privacy-options form when applicable. ATT is preceded by a separate in-app explanation after the first two minutes, and declining it does not limit any Lite capability or delay the navigation-based ad cadence.

Interstitial policy:

- one interstitial becomes eligible every 60 seconds after launch or the previous impression
- it is shown only on the next actual top-level screen change, including Player, Music, Search, Epicenter, EQ, or Settings
- if the minute expires while the user remains on one screen, the ad never appears unexpectedly; eligibility waits for the next top-level navigation
- if the eligible transition happens before the ad is loaded, while the app is hidden, or behind a modal, it is retried only on a later top-level navigation
- eligible whether music is playing or paused
- never behind another modal, during an import, or while the app is hidden
- failures never block navigation or playback
- one preloaded ad and bounded retry delays
- ad audio is always muted; the navigation-ad flow never calls the player's pause command
- closing an interstitial returns directly to the app without opening a Premium modal
- the app requests no native, rewarded, banner, or app-open inventory

For production:

1. Copy `.env.example` to the untracked `.env` for the published Full-version App Store URL. The AdMob IDs are compiled directly into the app.
2. In AdMob → Privacy & messaging, create and publish the required European regulations message for EpicenterDSP Lite.
3. Confirm that `VITE_FULL_VERSION_APP_STORE_URL` points to the published [EpicenterDSP Player App Store listing](https://apps.apple.com/mx/app/epicenterdsp-player/id6785658490).
4. Run `pnpm verify:release`; it intentionally fails if the production IDs or App Store URL do not match.
5. Run `pnpm build && pnpm exec cap sync ios`, then `pod install` on macOS.

AdMob identifiers are public application configuration values, not secrets. The production IDs are checked in and `Info.plist` contains the production app ID, ATT usage description, and Google's current SKAdNetwork entries. Google Mobile Ads SDK 11.3.0 and the pinned UMP 2.7.0 provide their SDK privacy manifests through CocoaPods.

Primary references: [Google iOS interstitial guide](https://developers.google.com/admob/ios/interstitial), [Google UMP privacy guide](https://developers.google.com/admob/ios/privacy), and [Apple App Tracking Transparency](https://developer.apple.com/documentation/apptrackingtransparency).

## Native build and release

After the local checks:

1. Run `pod install` in `ios/App`.
2. Open `ios/App/App.xcworkspace`.
3. Select a real development team and provisioning profile.
4. Build on at least one supported simulator and one physical iPhone.
5. Run the scenarios in [`MANUAL_TEST_PLAN.md`](MANUAL_TEST_PLAN.md).
6. In Xcode, choose Product → Archive.
7. Validate the archive, privacy manifest report, signing, capabilities, App Store privacy answers, and AdMob production configuration before upload.

The deployment target inherited from the Full technical base is iOS 15.6. Background audio and lock-screen media controls are preserved. CarPlay is intentionally excluded so the Lite target can use standard automatic signing without Apple's managed CarPlay entitlement.

## Useful commands

```bash
pnpm lint
pnpm typecheck
pnpm check:test-types
pnpm test
pnpm build
pnpm exec cap sync ios
pnpm verify:ios-plugin
pnpm verify:release
```

`pnpm lint` is the repository's zero-emission TypeScript validation. Generated `node_modules`, `dist`, `ios/App/App/public`, Pods, DerivedData, archives, signing files, and environment files are ignored.

## Project map

- `client/src/config`: edition flags, ad rules, and store link
- `client/src/components/EpicenterTutorial.tsx`: first-run mode guide and lightweight motion
- `client/src/services/adService.ts`: UMP/ATT and muted interstitial lifecycle
- `client/src/hooks/useAudioQueue.ts`: iOS-native library bridge and Lite pre-check
- `plugins/epicenter-native-ios`: native playback, import, DSP, and UMP privacy bridge
- `ios/App`: Capacitor/Xcode target
- `MIGRATION_NOTES.md`: provenance and implementation decisions
- `MANUAL_TEST_PLAN.md`: release-oriented manual verification

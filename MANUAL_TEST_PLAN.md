# EpicenterDSP Lite iOS manual test plan

Record device, iOS version, build number, tester, date, and result for each run.

## Installation and identity

1. Fresh-install Lite next to the existing Full app. Confirm both apps coexist and Lite is labeled `EpicenterDSP Lite`.
2. Confirm Lite starts with an empty library even when Full already has imported songs.
3. Confirm the Lite icon, splash screen, orientation behavior, dark UI, English, and Spanish text.
4. Relaunch Lite and confirm preferences, playlists, queue state, and last playable track persist only inside Lite.

## Import limit and duplicates

5. Import one supported file and verify metadata, artwork, duration, quality badge, and playback.
6. Import the same file again. Confirm it is reported as a duplicate and the stored count does not increase.
7. Import enough distinct files to reach exactly 30 stored songs.
8. At 29 songs, select several new files at once. Confirm only one new distinct song is stored and the rest are reported as over the limit.
9. At 30 songs, attempt another import. Confirm the Full invitation appears, the picker/import does not add data, and the app remains usable.
10. Delete one song, import one new distinct song, and confirm the count returns to 30.
11. Force-close during or immediately after an import, relaunch, and verify the SQLite count never exceeds 30 and no broken row appears.

## Playback and iOS integration

12. In Songs, select a song from the middle of the visible order. Confirm it starts immediately and the following tracks continue automatically in that same order. Repeat in an artist, album, Hi-Res list, playlist, and search results.
13. Play, pause, seek, previous, next, reorder, remove from queue, play in order, and shuffle.
14. Verify MP3, AAC/M4A, WAV/AIFF, FLAC, and at least one supported Hi-Res file.
15. Lock the phone and verify artwork, metadata, progress, play/pause, previous, and next.
16. Put the app in the background, change audio route, receive an interruption, and return to the app. Confirm playback state stays coherent.
17. Confirm the target signs without a managed CarPlay entitlement and that background audio, lock-screen metadata, and remote playback controls still work.

## Lite DSP and Full boundaries

18. Apply every one of the six Lite EQ presets. Confirm the EQ enables, audio remains stable, and no band exceeds +2 dB.
19. Toggle Epicenter and verify Intensity works in both modes and Sweep works only in Normal. Width and Balance must remain visible, disabled, marked Full, and open a contextual Full invitation.
20. Tap Manual 31-band EQ, Auto Epicenter, and Effects. Each must show a dismissible Full invitation and must not enable the feature.
21. Tap the Full button in Settings and in every locked-feature invitation. Confirm each action opens the EpicenterDSP Player listing with App Store ID `6785658490`.

## First-run tutorial and motion

22. On a fresh install, confirm the five-screen tutorial appears once and moves the real background from Player to Epicenter when advancing.
23. Confirm the animated switch, Normal/Headphones selector, bass bars, intensity knob, step transitions, Back, Skip, and Start controls work without clipping on the smallest supported iPhone.
24. Confirm the Normal explanation recommends car, subwoofer, or large systems, while Headphones recommends headphones or portable speakers and explains that only Intensity applies.
25. Finish or skip the tutorial, relaunch, and confirm it does not appear again. Open Settings and confirm `View mode tutorial` replays it. With Reduce Motion enabled, confirm the guide remains usable without continuous motion.

## UMP, ATT, and ads

26. Reset consent state using an appropriate test device/geography. Launch and confirm UMP is refreshed before any ad request.
27. Confirm no ATT system dialog appears at launch. After two minutes, confirm the contextual explanation appears independently of interstitial cadence. Choose both Continue and Not now in separate clean runs. Neither choice may limit playback, Lite features, or navigation-based ads.
28. Open Settings → Ad privacy options. Where UMP requires it, confirm the privacy form opens and changes are honored. Where it is not required, confirm the unavailable path is harmless.
29. During the first 60 seconds after launch, switch repeatedly among all top-level screens and confirm no interstitial appears.
30. Register the iPhone as an AdMob test device. After 60 seconds, make one top-level screen change and confirm the muted interstitial appears with a test-mode label whether music is playing or stopped. If music is playing, confirm it continues without a pause command.
31. Dismiss the ad, make more top-level changes during the next 60 seconds, and confirm no second ad appears. After 60 seconds, confirm the next top-level transition can show the next interstitial.
32. Let the minute expire while staying on one screen, while the app is hidden, while the tutorial or another modal is open, and during an import. Confirm no ad appears by itself; it may be retried only on a later unblocked top-level screen change.
33. Disable networking and repeat eligible transitions. Navigation and playback must continue without waiting for an ad. Restore networking and confirm bounded preload retries recover later.
34. Inspect runtime logs across repeated one-minute cycles. Confirm ad listeners are not duplicated and one dismissal produces one preload.
35. Open Music with an empty library and with imported songs. Confirm there is no fixed/native ad card and the song list starts immediately below its normal tabs.
36. Inspect runtime AdMob requests. Confirm only interstitial inventory is requested: no native, rewarded, banner, or app-open ads.
37. Confirm every interstitial remains muted and never pauses, ducks, or otherwise interrupts music playback.
38. Confirm the Premium shortcut appears inside Epicenter without covering controls; Settings and locked features retain their contextual purchase actions. Dismiss an interstitial and confirm no second Premium modal opens.
39. Open locked Auto EQ and confirm it remains a Full-only purchase invitation with no rewarded-ad preview path.
40. Repeat the one-minute flow in Player, Music, Search, Epicenter, EQ, and Settings and confirm every destination can be the eligible transition.

## Release and regression

41. Run `pnpm typecheck`, `pnpm lint`, `pnpm check:test-types`, `pnpm test`, and `pnpm build`.
42. Run `pnpm verify:release` with release environment values and confirm `Info.plist` uses the same production app ID.
43. Run `pnpm exec cap sync ios`, `pod install`, and build the workspace in Debug and Release on macOS.
44. Inspect the archive privacy report. Confirm Google Mobile Ads/UMP privacy manifests are included, ATT purpose text is present, SKAdNetwork entries are present, and App Store privacy answers match actual data use.
45. Search the archive and source for Google sample IDs, `REPLACE_WITH`, Full's bundle ID, Firebase Analytics, Android manifests, keystores, certificates, provisioning profiles, `.env`, and credentials. Release only when the expected search is clean.

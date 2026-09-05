# Release checklist

- [ ] Premium purchase actions open `https://apps.apple.com/mx/app/epicenterdsp-player/id6785658490`
- [ ] Production AdMob app and interstitial IDs configured
- [ ] Required AdMob Privacy & messaging consent message is published for EpicenterDSP Lite
- [ ] Debug and Release both use the EpicenterDSP Lite production AdMob IDs
- [ ] `pnpm verify:release` passes
- [ ] Typecheck, lint, test, and production build pass
- [ ] Capacitor sync and CocoaPods install pass on macOS
- [ ] Correct Apple team, bundle ID, signing, and provisioning selected
- [ ] Physical-device playback, background audio, lock screen, routes, and interruptions pass
- [ ] 30-song, duplicate, delete-and-reimport, and multi-select boundary tests pass
- [ ] First-run five-screen tutorial, Normal/Headphones guidance, Settings replay, mobile layout, and Reduce Motion behavior pass
- [ ] UMP, privacy options, ATT, offline failure, muted-ad playback continuity, Premium upsell, and one-minute eligibility tests pass
- [ ] No early or late presentation, no fixed/native/rewarded ad requests, and no post-interstitial Premium modal pass
- [ ] Archive privacy report includes required SDK manifests
- [ ] App Store privacy answers match AdMob/UMP/ATT behavior
- [ ] No Google sample IDs, test-ad paths, placeholders, secrets, or Full app credentials remain
- [ ] Archive validates in Xcode and is uploaded from the Lite App Store Connect record

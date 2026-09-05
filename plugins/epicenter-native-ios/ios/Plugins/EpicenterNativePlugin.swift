import Foundation
import Capacitor
import UserMessagingPlatform

@objc(EpicenterNativePlugin)
public class EpicenterNativePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "EpicenterNativePlugin"
    public let jsName = "EpicenterNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "importTracks", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAdConsentState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showAdPrivacyOptions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLibraryPage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getTrack", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteTrack", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPlaybackState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seek", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setQueue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "next", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "previous", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setEpicenterEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setEpicenterParams", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setEpicenterMode", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setEqEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setEqBand", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setEqBands", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setEqPreset", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resetEq", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setAutoEqEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setReverbEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setReverbAmount", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setConcertHallEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setConcertHallAmount", returnType: CAPPluginReturnPromise),
    ]

    private let repository = NativeTrackRepository()

    public override init() {
        super.init()
    }
    private lazy var importer = NativeTrackImporter(repository: repository)
    // Preserve one playback engine and queue across Capacitor bridge reloads.
    private let playbackController = NativePlaybackController.shared

    public override func load() {
        playbackController.setEventEmitter { [weak self] eventName, data in
            self?.notifyListeners(eventName, data: data)
        }
    }

    @objc func importTracks(_ call: CAPPluginCall) {
        guard let presenter = bridge?.viewController else {
            call.reject("Unable to present the iOS document picker")
            return
        }

        let maximumTrackCount = call.getInt("maxTrackCount")

        DispatchQueue.main.async { [weak self] in
            self?.importer.importTracks(
                from: presenter,
                maximumTrackCount: maximumTrackCount
            ) { result in
                switch result {
                case .success(let batch):
                    call.resolve([
                        "status": "ok",
                        "tracks": batch.tracks.map { $0.dictionary },
                        "duplicates": batch.duplicates,
                        "skippedForLimit": batch.skippedForLimit,
                        "limitReached": batch.skippedForLimit > 0,
                    ])
                case .failure(let error):
                    call.reject("Unable to import tracks", nil, error)
                }
            }
        }
    }

    @objc func getAdConsentState(_ call: CAPPluginCall) {
        let consentInformation = UMPConsentInformation.sharedInstance
        call.resolve([
            "status": "ok",
            "canRequestAds": consentInformation.canRequestAds,
            "privacyOptionsRequired":
                consentInformation.privacyOptionsRequirementStatus == .required,
        ])
    }

    @objc func showAdPrivacyOptions(_ call: CAPPluginCall) {
        guard let presenter = bridge?.viewController else {
            call.reject("Unable to present Ad Privacy Options")
            return
        }

        DispatchQueue.main.async {
            UMPConsentForm.presentPrivacyOptionsForm(from: presenter) { error in
                if let error {
                    call.reject("Unable to present Ad Privacy Options", nil, error)
                    return
                }
                call.resolve(["status": "ok"])
            }
        }
    }

    @objc func getLibraryPage(_ call: CAPPluginCall) {
        let offset = call.getInt("offset") ?? 0
        let limit = call.getInt("limit") ?? 50
        let search = call.getString("search")
        let sort = call.getString("sort")
        call.resolve(repository.getLibraryPage(offset: offset, limit: limit, search: search, sort: sort))
    }

    @objc func getTrack(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty else {
            call.reject("Track id is required")
            return
        }
        call.resolve(repository.getTrack(id: id))
    }

    @objc func deleteTrack(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty else {
            call.reject("Track id is required")
            return
        }
        do {
            call.resolve(try repository.deleteTrack(id: id))
        } catch {
            call.reject("Unable to delete track", nil, error)
        }
    }

    @objc func getPlaybackState(_ call: CAPPluginCall) {
        call.resolve(playbackController.getPlaybackState())
    }

    @objc func play(_ call: CAPPluginCall) {
        call.resolve(playbackController.play(trackId: call.getString("trackId")))
    }

    @objc func pause(_ call: CAPPluginCall) {
        call.resolve(playbackController.pause())
    }

    @objc func seek(_ call: CAPPluginCall) {
        let seconds = call.getDouble("seconds") ?? 0
        call.resolve(playbackController.seek(seconds: seconds))
    }

    @objc func stop(_ call: CAPPluginCall) {
        call.resolve(playbackController.stop())
    }

    @objc func setQueue(_ call: CAPPluginCall) {
        let trackIds = call.getArray("trackIds", String.self) ?? []
        let startIndex = call.getInt("startIndex") ?? 0
        call.resolve(playbackController.setQueue(trackIds: trackIds, startIndex: startIndex))
    }

    @objc func next(_ call: CAPPluginCall) {
        let requestId = call.getString("requestId") ?? "bridge-next-\(UUID().uuidString)"
        NSLog("[Bridge] next command received requestId=\(requestId)")
        call.resolve(playbackController.next(source: "bridge", requestId: requestId))
    }

    @objc func previous(_ call: CAPPluginCall) {
        let requestId = call.getString("requestId") ?? "bridge-previous-\(UUID().uuidString)"
        NSLog("[Bridge] previous command received requestId=\(requestId)")
        call.resolve(playbackController.previous(source: "bridge", requestId: requestId))
    }

    @objc func setEpicenterEnabled(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled") ?? false
        call.resolve(playbackController.setEpicenterEnabled(enabled))
    }

    @objc func setEpicenterParams(_ call: CAPPluginCall) {
        call.resolve(playbackController.setEpicenterParams(
            intensity: call.getDouble("intensity"),
            sweepFreq: call.getDouble("sweepFreq") ?? call.getDouble("sweep"),
            width: call.getDouble("width"),
            balance: call.getDouble("balance"),
            volume: call.getDouble("volume") ?? call.getDouble("output")
        ))
    }

    @objc func setEpicenterMode(_ call: CAPPluginCall) {
        let mode = call.getString("mode") ?? "car"
        call.resolve(playbackController.setEpicenterMode(headphones: mode == "headphones"))
    }

    @objc func setEqEnabled(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled") ?? false
        call.resolve(playbackController.setEqEnabled(enabled))
    }

    @objc func setEqBand(_ call: CAPPluginCall) {
        call.reject("Manual 31-band EQ is available in EpicenterDSP Full")
    }

    @objc func setEqBands(_ call: CAPPluginCall) {
        let gains = (call.getArray("gains", Double.self) ?? [])
            .prefix(31)
            .map { min(2.0, max(-8.0, $0)) }
        call.resolve(playbackController.setEqBands(gains))
    }

    @objc func setEqPreset(_ call: CAPPluginCall) {
        let name = call.getString("name")
        let gains = (call.getArray("gains", Double.self) ?? [])
            .prefix(31)
            .map { min(2.0, max(-8.0, $0)) }
        call.resolve(playbackController.setEqPreset(name: name, gains: gains))
    }

    @objc func resetEq(_ call: CAPPluginCall) {
        call.resolve(playbackController.resetEq())
    }

    @objc func setAutoEqEnabled(_ call: CAPPluginCall) {
        call.resolve(playbackController.setAutoEqEnabled(false))
    }

    @objc func setReverbEnabled(_ call: CAPPluginCall) {
        call.resolve(playbackController.setReverbEnabled(false))
    }

    @objc func setReverbAmount(_ call: CAPPluginCall) {
        call.resolve(playbackController.setReverbAmount(0))
    }

    @objc func setConcertHallEnabled(_ call: CAPPluginCall) {
        call.resolve(playbackController.setConcertHallEnabled(false))
    }

    @objc func setConcertHallAmount(_ call: CAPPluginCall) {
        call.resolve(playbackController.setConcertHallAmount(0))
    }
}

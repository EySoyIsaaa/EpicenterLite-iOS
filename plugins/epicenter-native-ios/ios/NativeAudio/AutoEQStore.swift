import Foundation

/// Per-song Auto-EQ cache.
///
/// Deliberately isolated from the main library SQLite database: this is a derived,
/// disposable analysis result, and keeping it in its own JSON file means we never touch the
/// live library schema (no migration risk on an app that's already shipping). Keyed by the
/// track's content `stableId`, so a re-import of the same file reuses the cached curve.
final class AutoEQStore {
    static let shared = AutoEQStore()

    private let queue = DispatchQueue(label: "com.epicenterdsp.lite.auto-eq-store")
    private let fileURL: URL
    private var cache: [String: [Float]]

    private init() {
        let base = (try? FileManager.default.url(
            for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true
        )) ?? FileManager.default.temporaryDirectory
        fileURL = base.appendingPathComponent("EpicenterAutoEQ.json")
        cache = AutoEQStore.load(from: fileURL)
    }

    func gains(forStableId stableId: String) -> [Float]? {
        queue.sync { cache[stableId] }
    }

    func save(gains: [Float], forStableId stableId: String) {
        queue.async {
            self.cache[stableId] = gains
            self.persist()
        }
    }

    func clear(stableId: String) {
        queue.async {
            self.cache.removeValue(forKey: stableId)
            self.persist()
        }
    }

    private func persist() {
        guard let data = try? JSONEncoder().encode(cache) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }

    private static func load(from url: URL) -> [String: [Float]] {
        guard let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([String: [Float]].self, from: data) else {
            return [:]
        }
        return decoded
    }
}

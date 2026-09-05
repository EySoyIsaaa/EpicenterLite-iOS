import Accelerate
import AVFoundation
import Foundation

/// Per-song Auto-EQ analyzer.
///
/// Measures the long-term average spectrum of a fully decoded track (the buffer the engine
/// already holds in RAM), then returns a bespoke 31-band correction curve that nudges *that*
/// song toward a gentle "house" target curve. This is genuine per-song tonal correction, not
/// a preset: the measured spectrum is unique to each track, so the resulting curve is too.
///
/// The correction is shaped by four guards so it stays natural:
///   1. Per-band clamp (cuts allowed deeper than boosts).
///   2. Cuts favored over boosts (attenuating peaks is cleaner and costs no headroom).
///   3. Energy weighting (a band the song barely uses is never boosted — that only adds hiss).
///   4. Low-frequency boost cap + neighbour smoothing (no boom, no jagged curve).
enum EpicenterAutoEQAnalyzer {

    /// ISO 1/3-octave centres — must match NativeAudioEngine's EQ band order (31 bands).
    static let bandFrequencies: [Float] = [
        20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
        200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
        2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000,
    ]

    // MARK: Tunable "aggressiveness" (moderate-character defaults)

    /// Target house curve (relative dB). Mean-centred at runtime so it never adds broadband
    /// level. Gentle bass lift, flat mids, small presence/air lift, soft top roll-off.
    private static let targetCurveDb: [Float] = [
        1.6, 1.6, 1.7, 1.7, 1.6, 1.5, 1.3, 1.0, 0.6, 0.3,
        0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.2, 0.4, 0.6,
        0.8, 1.0, 1.0, 0.9, 0.7, 0.5, 0.6, 0.4, 0.2, -0.2, -0.6,
    ]

    private static let maxBoostDb: Float = 4.5
    private static let maxCutDb: Float = 6.0
    private static let boostScale: Float = 0.9          // cuts favored over boosts
    private static let lowFreqLimitHz: Float = 120
    private static let lowFreqBoostCapDb: Float = 2.0
    private static let fftSize = 4096
    private static let maxWindows = 120                 // caps analysis cost on long/hi-res tracks

    // MARK: Public API

    /// Computes the 31-band Auto-EQ gains (dB) for a decoded buffer, or nil if the track is
    /// too short / unreadable. Safe to call off the audio thread: reads the buffer read-only.
    static func computeGains(buffer: AVAudioPCMBuffer, sampleRate: Double) -> [Float]? {
        guard sampleRate > 0,
              let measuredRawDb = averageSpectrumDb(buffer: buffer, sampleRate: sampleRate) else {
            return nil
        }

        let bandCount = bandFrequencies.count
        let rawMean = measuredRawDb.reduce(0, +) / Float(bandCount)
        let measured = measuredRawDb.map { $0 - rawMean }          // tonal shape only
        let target = meanCentred(targetCurveDb)
        let rawPeak = measuredRawDb.max() ?? rawMean

        var gains = [Float](repeating: 0, count: bandCount)
        for i in 0..<bandCount {
            var g = target[i] - measured[i]
            if g > 0 {
                g *= boostScale                                    // guard 2: favor cuts
                g *= energyWeight(rawDb: measuredRawDb[i], peakDb: rawPeak)  // guard 3
            }
            g = min(max(g, -maxCutDb), maxBoostDb)                 // guard 1
            if bandFrequencies[i] < lowFreqLimitHz {               // guard 4a: no boom
                g = min(g, lowFreqBoostCapDb)
            }
            gains[i] = g
        }
        return smoothed(gains)                                     // guard 4b: musical curve
    }

    // MARK: Spectrum measurement (vDSP)

    private static func averageSpectrumDb(buffer: AVAudioPCMBuffer, sampleRate: Double) -> [Float]? {
        let totalFrames = Int(buffer.frameLength)
        guard totalFrames >= fftSize,
              let channelData = buffer.floatChannelData else { return nil }

        let channelCount = Int(buffer.format.channelCount)
        let halfN = fftSize / 2
        let log2n = vDSP_Length(log2(Float(fftSize)))
        guard let setup = vDSP_create_fftsetup(log2n, FFTRadix(kFFTRadix2)) else { return nil }
        defer { vDSP_destroy_fftsetup(setup) }

        var window = [Float](repeating: 0, count: fftSize)
        vDSP_hann_window(&window, vDSP_Length(fftSize), Int32(vDSP_HANN_NORM))

        let windowCount = max(1, min(maxWindows, (totalFrames - fftSize) / (fftSize / 2) + 1))
        let stride = windowCount > 1 ? (totalFrames - fftSize) / (windowCount - 1) : 0

        var mono = [Float](repeating: 0, count: fftSize)
        var windowed = [Float](repeating: 0, count: fftSize)
        var realp = [Float](repeating: 0, count: halfN)
        var imagp = [Float](repeating: 0, count: halfN)
        var magSq = [Float](repeating: 0, count: halfN)
        var magAccum = [Float](repeating: 0, count: halfN)
        let invChannels = 1.0 / Float(max(channelCount, 1))

        for w in 0..<windowCount {
            let start = w * stride
            // Downmix to mono (tonal balance is a mono property).
            for f in 0..<fftSize {
                var sum: Float = 0
                for c in 0..<channelCount { sum += channelData[c][start + f] }
                mono[f] = sum * invChannels
            }
            vDSP_vmul(mono, 1, window, 1, &windowed, 1, vDSP_Length(fftSize))

            realp.withUnsafeMutableBufferPointer { rp in
                imagp.withUnsafeMutableBufferPointer { ip in
                    var split = DSPSplitComplex(realp: rp.baseAddress!, imagp: ip.baseAddress!)
                    windowed.withUnsafeBufferPointer { wp in
                        wp.baseAddress!.withMemoryRebound(to: DSPComplex.self, capacity: halfN) { cp in
                            vDSP_ctoz(cp, 2, &split, 1, vDSP_Length(halfN))
                        }
                    }
                    vDSP_fft_zrip(setup, &split, 1, log2n, FFTDirection(FFT_FORWARD))
                    vDSP_zvmags(&split, 1, &magSq, 1, vDSP_Length(halfN))
                    for k in 0..<halfN { magAccum[k] += magSq[k] }
                }
            }
        }

        let inv = 1.0 / Float(windowCount)
        for k in 0..<halfN { magAccum[k] *= inv }
        return foldBinsToBands(power: magAccum, sampleRate: sampleRate)
    }

    private static func foldBinsToBands(power: [Float], sampleRate: Double) -> [Float] {
        let halfN = power.count
        let binHz = Float(sampleRate) / Float(fftSize)
        let bandCount = bandFrequencies.count
        var bandDb = [Float](repeating: 0, count: bandCount)

        for b in 0..<bandCount {
            let lo = b == 0 ? 0 : sqrt(bandFrequencies[b - 1] * bandFrequencies[b])
            let hi = b == bandCount - 1
                ? Float(sampleRate) / 2
                : sqrt(bandFrequencies[b] * bandFrequencies[b + 1])
            let loBin = min(max(1, Int(lo / binHz)), halfN - 1)
            let hiBin = min(halfN - 1, max(loBin, Int(hi / binHz)))
            var sum: Float = 0
            var count = 0
            if loBin <= hiBin {
                for k in loBin...hiBin { sum += power[k]; count += 1 }
            }
            let avg = count > 0 ? sum / Float(count) : 1e-9
            bandDb[b] = 10 * log10(avg + 1e-9)
        }
        return bandDb
    }

    // MARK: Guards / helpers

    private static func energyWeight(rawDb: Float, peakDb: Float) -> Float {
        // Full boost for bands within 15 dB of the loudest band; fades to zero by 35 dB below.
        let w = (rawDb - (peakDb - 35)) / 20
        return min(max(w, 0), 1)
    }

    private static func smoothed(_ gains: [Float]) -> [Float] {
        let n = gains.count
        guard n >= 3 else { return gains }
        var out = gains
        for i in 1..<(n - 1) {
            out[i] = gains[i - 1] * 0.25 + gains[i] * 0.5 + gains[i + 1] * 0.25
        }
        return out
    }

    private static func meanCentred(_ values: [Float]) -> [Float] {
        guard !values.isEmpty else { return values }
        let mean = values.reduce(0, +) / Float(values.count)
        return values.map { $0 - mean }
    }
}

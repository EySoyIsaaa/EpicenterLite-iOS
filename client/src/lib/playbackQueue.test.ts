import { describe, expect, it } from "vitest";
import { buildContextualPlaybackQueue } from "./playbackQueue";

const library = [
  { id: "one", title: "One" },
  { id: "two", title: "Two" },
  { id: "three", title: "Three" },
];

describe("contextual playback queue", () => {
  it("starts at the selected song and preserves the visible library order", () => {
    const result = buildContextualPlaybackQueue(library[1], library);

    expect(result.tracks.map((track) => track.id)).toEqual([
      "one",
      "two",
      "three",
    ]);
    expect(result.startIndex).toBe(1);
    expect(result.tracks[result.startIndex + 1]?.id).toBe("three");
  });

  it("falls back to only the selected song outside the supplied context", () => {
    const selected = { id: "other", title: "Other" };
    expect(buildContextualPlaybackQueue(selected, library)).toEqual({
      tracks: [selected],
      startIndex: 0,
    });
  });
});

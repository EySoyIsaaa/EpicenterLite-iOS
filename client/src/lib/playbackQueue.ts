export interface QueueItem {
  id: string;
}

export function buildContextualPlaybackQueue<T extends QueueItem>(
  selectedTrack: T,
  contextTracks?: T[],
): { tracks: T[]; startIndex: number } {
  const tracks = Array.isArray(contextTracks)
    ? contextTracks.filter((track) => Boolean(track?.id))
    : [];
  const startIndex = tracks.findIndex((track) => track.id === selectedTrack.id);

  return startIndex >= 0
    ? { tracks, startIndex }
    : { tracks: [selectedTrack], startIndex: 0 };
}

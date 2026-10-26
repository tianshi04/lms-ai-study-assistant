"use client";

import { useSyncExternalStore } from "react";

/**
 * Lightweight external store for the video playback time.
 *
 * Keeping the playback time outside of the page's React state prevents the whole learn page
 * (video player, sidebar, quiz overlay, ...) from re-rendering on every time update.
 * Consumers subscribe through `usePlaybackTime(selector)` and only re-render when the
 * value returned by their selector changes (e.g. the active transcript cue index).
 */
let currentTime = 0;
const listeners = new Set<() => void>();

export const playbackTimeStore = {
  get: () => currentTime,
  set: (time: number) => {
    if (time === currentTime) return;
    currentTime = time;
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/**
 * Subscribe to the playback time through a selector.
 * The selector MUST return a primitive (or otherwise referentially stable) value.
 */
export function usePlaybackTime<T>(selector: (time: number) => T): T {
  return useSyncExternalStore(
    playbackTimeStore.subscribe,
    () => selector(playbackTimeStore.get()),
    () => selector(0),
  );
}

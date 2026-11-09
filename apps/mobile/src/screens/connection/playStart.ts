// INFO: a play that could not start offline (play all of a paged list): the strip shows it until it is tapped, its screen leaves or another source starts. Module state read with useSyncExternalStore; the snapshot is the playback's sourceStart at the failure, a primitive.
import { useSyncExternalStore } from "react";

interface PlayStartFailure {
  readonly owner: string;
  readonly sourceStart: number;
  readonly retry: () => void;
}

let failure: PlayStartFailure | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => {
    listener();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function failPlayStart(next: PlayStartFailure): void {
  failure = next;
  notify();
}

// Clears the failure only when this owner recorded it.
export function clearPlayStart(owner: string): void {
  if (failure?.owner !== owner) return;
  failure = null;
  notify();
}

// Takes the current failure, clears it and then runs its retry.
export function retryPlayStart(): void {
  const current = failure;
  if (current === null) return;
  failure = null;
  notify();
  current.retry();
}

export function getPlayStartFailure(): PlayStartFailure | null {
  return failure;
}

export function usePlayStartSource(): number | null {
  return useSyncExternalStore(subscribe, () => failure?.sourceStart ?? null);
}

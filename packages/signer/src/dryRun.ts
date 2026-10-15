import type { SignedEvent } from './index';

/**
 * Dry-run (test) mode: events are still signed, but publishing keeps them in
 * an in-memory log instead of sending them to relays. Reads (fetchEvents,
 * fetchEventsFromRelay) also return logged events matching the filter, so
 * what was "published" shows up in feeds, pickers and lookups.
 */

/** An event that would have been published, and the relays it was meant for */
export interface DryRunEntry {
  event: SignedEvent;
  relays: string[];
}

/** Window event fired when dry-run mode is toggled or an event is logged or cleared */
export const DRY_RUN_CHANGE_EVENT = 'nostr-post:dry-run';

export interface DryRunChangeDetail {
  enabled: boolean;
  entries: DryRunEntry[];
}

declare global {
  interface WindowEventMap {
    'nostr-post:dry-run': CustomEvent<DryRunChangeDetail>;
  }
}

let enabled = false;
let entries: DryRunEntry[] = [];

const notify = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<DryRunChangeDetail>(DRY_RUN_CHANGE_EVENT, {
      detail: { enabled, entries: getDryRunEntries() },
    })
  );
};

/** Turn dry-run mode on or off. The log is kept until clearDryRunEntries(). */
export function setDryRun(on: boolean): void {
  if (enabled === on) return;
  enabled = on;
  notify();
}

export function isDryRun(): boolean {
  return enabled;
}

/** Logged events, newest first */
export function getDryRunEntries(): DryRunEntry[] {
  return [...entries];
}

export function clearDryRunEntries(): void {
  entries = [];
  notify();
}

/** Log an event instead of publishing it (called by publishToRelay(s) in dry-run mode) */
export function logDryRunEvent(event: SignedEvent, relays: string[]): void {
  entries = [{ event, relays: [...relays] }, ...entries];
  notify();
}

/** Logged events to merge into reads; none while dry-run mode is off */
export function dryRunEventsForReads(): SignedEvent[] {
  return enabled ? entries.map((e) => e.event) : [];
}

'use client';

import {
  clearDryRunEntries,
  DRY_RUN_CHANGE_EVENT,
  type DryRunEntry,
  getDryRunEntries,
  isDryRun,
  setDryRun,
} from '@nostr-post/signer';
import { useEffect, useState } from 'react';

/** Remembers the toggle for the browser tab, so a reload doesn't silently publish for real */
const STORAGE_KEY = 'nostr-post-manifest-creator-test-mode';

const styles = {
  toggle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
  },
  banner: {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    background: '#fffbeb',
    border: '1px solid #fcd34d',
    color: '#92400e',
    fontSize: '0.875rem',
  },
  bannerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  buttons: { display: 'flex', gap: '0.5rem' },
  button: {
    padding: '0.25rem 0.75rem',
    background: 'white',
    border: '1px solid #fcd34d',
    borderRadius: '0.375rem',
    color: '#92400e',
    fontSize: '0.8125rem',
    cursor: 'pointer',
  },
  entry: { marginTop: '0.75rem' },
  entryLabel: { fontWeight: 600, marginBottom: '0.25rem' },
  code: {
    margin: 0,
    padding: '0.75rem',
    background: '#1f2937',
    color: '#f9fafb',
    borderRadius: '0.375rem',
    fontSize: '0.75rem',
    overflowX: 'auto',
    maxHeight: '20rem',
  },
} as const;

const readStoredToggle = (): boolean => {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const storeToggle = (on: boolean) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    // Ignore storage errors
  }
};

/** Toggle for test mode (signer dry-run) and the log of events that weren't published */
export const TestModeToggle = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setDryRun(readStoredToggle());
    setEnabled(isDryRun());
    const onChange = (e: WindowEventMap['nostr-post:dry-run']) => setEnabled(e.detail.enabled);
    window.addEventListener(DRY_RUN_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(DRY_RUN_CHANGE_EVENT, onChange);
  }, []);

  const toggle = (on: boolean) => {
    storeToggle(on);
    setDryRun(on);
  };

  return (
    <label style={styles.toggle}>
      <input type="checkbox" checked={enabled} onChange={(e) => toggle(e.target.checked)} />🧪 Test
      mode (don't publish)
    </label>
  );
};

const entryLabel = (entry: DryRunEntry) =>
  `kind ${entry.event.kind} · ${entry.event.id.slice(0, 8)}… → ${entry.relays.join(', ') || 'no relays'}`;

/** Banner shown in test mode, with the events that would have been published */
export const TestModeLog = () => {
  const [enabled, setEnabled] = useState(false);
  const [entries, setEntries] = useState<DryRunEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setEnabled(isDryRun());
    setEntries(getDryRunEntries());
    const onChange = (e: WindowEventMap['nostr-post:dry-run']) => {
      setEnabled(e.detail.enabled);
      setEntries(e.detail.entries);
    };
    window.addEventListener(DRY_RUN_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(DRY_RUN_CHANGE_EVENT, onChange);
  }, []);

  if (!enabled) return null;

  const copyAll = () =>
    void navigator.clipboard?.writeText(
      JSON.stringify(
        entries.map((entry) => entry.event),
        null,
        2
      )
    );

  return (
    <div style={styles.banner}>
      <div style={styles.bannerRow}>
        <span>
          <strong>Test mode:</strong> events are signed but not sent to relays. Feeds and pickers
          include them until you reload. {entries.length} test event(s).
        </span>
        <div style={styles.buttons}>
          <button
            type="button"
            style={styles.button}
            onClick={() => setOpen(!open)}
            disabled={entries.length === 0}
          >
            {open ? 'Hide events' : 'Show events'}
          </button>
          <button
            type="button"
            style={styles.button}
            onClick={copyAll}
            disabled={entries.length === 0}
          >
            Copy JSON
          </button>
          <button
            type="button"
            style={styles.button}
            onClick={clearDryRunEntries}
            disabled={entries.length === 0}
          >
            Clear
          </button>
        </div>
      </div>
      {open &&
        entries.map((entry) => (
          <div key={`${entry.event.id}-${entry.relays.join()}`} style={styles.entry}>
            <div style={styles.entryLabel}>{entryLabel(entry)}</div>
            <pre style={styles.code}>{JSON.stringify(entry.event, null, 2)}</pre>
          </div>
        ))}
    </div>
  );
};

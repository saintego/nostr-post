'use client';

import type { NostrPostManifest } from '@nostr-post/core/types';
import type { WikiEvent } from '@nostr-post/wiki';
import { useCallback, useState } from 'react';
import { WikiComposer, type WikiComposerDetail } from './WikiElements';
import { styles } from './wikiPanelStyles';

interface EntityEditorProps {
  manifest: NostrPostManifest;
  /** Entity to edit; unset for a new one */
  dTag?: string;
  /** Version to edit from; newest when unset */
  baseEvent?: WikiEvent;
  prefill?: Record<string, unknown>;
  onUseNewest: () => void;
  onPublished: (dTag: string) => void;
}

/** Wiki composer for an entity, noting which version it starts from, plus the event it produced. */
export function EntityEditor({
  manifest,
  dTag,
  baseEvent,
  prefill,
  onUseNewest,
  onPublished,
}: EntityEditorProps) {
  const [pendingEvent, setPendingEvent] = useState<unknown>(null);

  const handleSubmit = useCallback((detail: WikiComposerDetail) => {
    setPendingEvent(detail.event);
  }, []);
  const handlePublished = useCallback(
    (detail: WikiComposerDetail) => {
      setPendingEvent(detail.event);
      if (detail.dTag) onPublished(detail.dTag);
    },
    [onPublished]
  );

  return (
    <>
      {baseEvent && (
        <div style={styles.infoBox}>
          Editing from the version by <code>{baseEvent.pubkey.slice(0, 8)}…</code> of{' '}
          {new Date(baseEvent.created_at * 1000).toLocaleString()}.{' '}
          <button type="button" style={styles.smallButton} onClick={onUseNewest}>
            Use the newest version
          </button>
        </div>
      )}
      <WikiComposer
        manifest={manifest}
        entityId={dTag}
        baseEvent={baseEvent}
        prefill={prefill}
        onSubmit={handleSubmit}
        onPublished={handlePublished}
      />
      {pendingEvent ? (
        <div>
          <p style={styles.sectionTitle}>Unsigned event</p>
          <div style={styles.eventCard}>
            <pre style={styles.eventJson}>{JSON.stringify(pendingEvent, null, 2)}</pre>
          </div>
        </div>
      ) : null}
    </>
  );
}

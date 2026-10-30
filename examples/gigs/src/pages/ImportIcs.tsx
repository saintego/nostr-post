import { draftFormatId, type IcsDraft, icsToDrafts } from '@nostr-post/calendar/ics';
import { useEffect, useRef, useState } from 'react';
import { GIG_MANIFEST } from '../lib/manifests';

/** One draft in the composer, to check and publish */
function DraftComposer({ draft }: { draft: IcsDraft }) {
  const ref = useRef<HTMLElementTagNameMap['nostr-post-composer']>(null);
  useEffect(() => ref.current?.scrollIntoView({ behavior: 'smooth' }), []);
  return (
    <nostr-post-composer
      ref={ref}
      manifest={GIG_MANIFEST}
      defaultFormatId={draftFormatId(draft)}
      dTag={draft.dTag}
      prefill={draft.formData}
      autoPublish
    />
  );
}

/** Importing gigs from an .ics file: each is checked by the user before it's published */
export function ImportIcs() {
  const [drafts, setDrafts] = useState<IcsDraft[]>();
  const [reviewing, setReviewing] = useState<IcsDraft>();
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setReviewing(undefined);
    setDrafts(icsToDrafts(await file.text()));
  };
  return (
    <>
      <h2>Import from a calendar (.ics)</h2>
      <p className="hint">
        E.g. Facebook's export of your events. Each event is checked by you before it's published;
        importing the same file again updates the events instead of adding copies.
      </p>
      <input
        type="file"
        accept=".ics,text/calendar"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {drafts && (
        <ul className="drafts">
          {drafts.length === 0 && <li>No events in this file.</li>}
          {drafts.map((d) => (
            <li key={d.uid}>
              <strong>{String(d.formData.title ?? d.uid)}</strong> ·{' '}
              {String((d.formData.when as { start?: string } | undefined)?.start ?? '')}{' '}
              {d.private ? (
                <em>(private: not offered)</em>
              ) : (
                <button type="button" onClick={() => setReviewing(d)}>
                  Review
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {reviewing && <DraftComposer key={reviewing.uid} draft={reviewing} />}
    </>
  );
}

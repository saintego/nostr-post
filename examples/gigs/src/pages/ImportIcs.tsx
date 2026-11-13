import { fromSource, importedFilter } from '@nostr-post/calendar';
import { draftFormatId, type IcsDraft, icsToDrafts } from '@nostr-post/calendar/ics';
import { fetchEvents, knownPublicKey, type SignedEvent } from '@nostr-post/signer';
import { useEffect, useRef, useState } from 'react';
import { addressOf } from '../lib/draft';
import { GIG_MANIFEST } from '../lib/manifests';
import { eventLink } from '../lib/routes';

/**
 * Events already imported from each draft's page (its `source`), by uid: not the user's own
 * copy of the same entry (importing again updates that one)
 */
async function importedElsewhere(drafts: IcsDraft[]): Promise<Map<string, SignedEvent[]>> {
  const filter = importedFilter(drafts.map((d) => d.formData.source));
  if (!filter) return new Map();
  const events = await fetchEvents(filter).catch(() => []);
  const me = knownPublicKey();
  return new Map(
    drafts.map((d) => {
      const source = typeof d.formData.source === 'string' ? d.formData.source : '';
      const found = source ? fromSource(events, source) : [];
      const others = found.filter(
        (e) => !(e.pubkey === me && e.tags.some((t) => t[0] === 'd' && t[1] === d.dTag))
      );
      return [d.uid, others];
    })
  );
}

/** "Already on Nostr: <title>" for a draft someone imported before */
function AlreadyThere({ events }: { events: SignedEvent[] | undefined }) {
  if (!events?.length) return null;
  return (
    <span className="np-hint">
      {' '}
      · already on Nostr:{' '}
      {events.map((event, i) => {
        const address = addressOf(event) ?? '';
        return (
          <span key={address}>
            {i > 0 && ', '}
            <a href={eventLink(address)}>
              {event.tags.find((t) => t[0] === 'title')?.[1] ?? address}
            </a>
          </span>
        );
      })}
    </span>
  );
}

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
  const [elsewhere, setElsewhere] = useState<Map<string, SignedEvent[]>>(new Map());
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setReviewing(undefined);
    setElsewhere(new Map());
    const found = icsToDrafts(await file.text());
    setDrafts(found);
    setElsewhere(await importedElsewhere(found));
  };
  return (
    <>
      <h2>Import from a calendar (.ics)</h2>
      <p className="np-hint">
        E.g. Facebook's export of your events. Each event is checked by you before it's published;
        importing the same file again updates the events instead of adding copies. Events someone
        already imported from the same page are linked, to RSVP there instead.
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
                <button type="button" className="np-button" onClick={() => setReviewing(d)}>
                  Review
                </button>
              )}
              <AlreadyThere events={elsewhere.get(d.uid)} />
            </li>
          ))}
        </ul>
      )}
      {reviewing && <DraftComposer key={reviewing.uid} draft={reviewing} />}
    </>
  );
}

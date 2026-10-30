import { isDryRun } from '@nostr-post/signer';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type GigDraft, unlinkedNames } from '../lib/ai';
import { addressOf, findDuplicates, previewEvent } from '../lib/draft';
import { GIG_MANIFEST } from '../lib/manifests';
import { artistEditLink, artistLink, eventLink } from '../lib/routes';

type Duplicate = Awaited<ReturnType<typeof findDuplicates>>[number];

/** The performers' links as players, so the user sees what the AI found (and from where) */
function PerformerLinks({ draft }: { draft: GigDraft }) {
  const withLinks = draft.performers.filter((p) => p.links.length);
  if (!withLinks.length) return null;
  return (
    <>
      <p className="hint">Performers' links:</p>
      {withLinks.map((p) => (
        <div className="performer" key={p.name}>
          <strong>{p.name}</strong>
          {p.links.map((link) => (
            <div key={link}>
              <np-embed url={link} />
              {draft.fromPoster.includes(link) && (
                <span className="warning">Read from the poster, not in the text: check it</span>
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

/**
 * Pages that lack links from the post can get them; performers without a page are picked in the
 * form, where "Create page" makes one
 */
function PerformerHints({ draft }: { draft: GigDraft }) {
  const updates = (draft.suggestions.performers ?? []).filter((s) => s.action === 'update');
  const withoutPage = unlinkedNames(draft.formData);
  return (
    <p className="hint">
      {updates.length > 0 && 'New links for '}
      {updates.map((s, i) => {
        const dTag = s.address?.split(':').slice(2).join(':') ?? '';
        return (
          <span key={s.address}>
            {i > 0 && '; '}
            <a href={artistLink(dTag)} target="_blank" rel="noreferrer">
              {s.label}
            </a>{' '}
            ({Object.values(s.prefill).flat().join(', ')}):{' '}
            <a href={artistEditLink(dTag, s.prefill)} target="_blank" rel="noreferrer">
              add them to the page
            </a>
          </span>
        );
      })}
      {updates.length > 0 && withoutPage.length > 0 && <br />}
      {withoutPage.length > 0 && (
        <>
          No artist page yet for <strong>{withoutPage.join(', ')}</strong>: "Create page" next to
          them under Performers below makes one, with their links.
        </>
      )}
    </p>
  );
}

/** Gigs that may be this one: RSVP there instead of adding it again */
function Duplicates({ draft }: { draft: GigDraft }) {
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  useEffect(() => {
    let current = true;
    void findDuplicates(draft.formData).then((found) => current && setDuplicates(found));
    return () => {
      current = false;
    };
  }, [draft]);
  if (!duplicates.length) return null;
  return (
    <div className="warning">
      Maybe already on Nostr:{' '}
      {duplicates.map(({ event }, i) => {
        const address = addressOf(event) ?? '';
        const title = event.tags.find((t) => t[0] === 'title')?.[1] ?? address;
        return (
          <span key={address}>
            {i > 0 && ', '}
            <a href={eventLink(address)}>{title}</a>
          </span>
        );
      })}
      . RSVP there instead of adding it again?
    </div>
  );
}

/** How the draft will look */
function Preview({ draft }: { draft: GigDraft }) {
  const preview = useMemo(() => {
    try {
      return { event: previewEvent(draft.formData, draft.formatId) };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }, [draft]);
  return (
    <>
      <p className="hint">How it will look:</p>
      {preview.event ? (
        <nostr-post-view manifest={GIG_MANIFEST} event={preview.event} />
      ) : (
        <p className="hint">Preview: {preview.error}</p>
      )}
    </>
  );
}

const EMPTY_FORM = {};

/**
 * Checking a draft (preview, duplicates, the performers' links) and correcting it in the
 * composer before publishing; without a draft, the empty form
 */
export function DraftReview({ draft }: { draft?: GigDraft }) {
  const [published, setPublished] = useState<string>();
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!draft) section.current?.scrollIntoView({ behavior: 'smooth' });
  }, [draft]);
  const onPublished = (e: CustomEvent) => {
    const event = (
      e.detail as { kind: number; pubkey: string; tags: string[][] }[] | undefined
    )?.[0];
    setPublished(event && addressOf(event));
  };
  return (
    <section className="step" ref={section}>
      {draft && (
        <>
          <h3>3. Check it</h3>
          <Duplicates draft={draft} />
          <Preview draft={draft} />
          <PerformerLinks draft={draft} />
          <PerformerHints draft={draft} />
        </>
      )}
      <h3>{draft ? '4. Correct and publish' : 'Fill in the gig'}</h3>
      <nostr-post-composer
        manifest={GIG_MANIFEST}
        defaultFormatId={draft?.formatId}
        prefill={draft?.formData ?? EMPTY_FORM}
        autoPublish
        onnostr-post-published={onPublished}
      />
      {published && (
        <p className="hint">
          Published{isDryRun() ? ' (test mode: not sent to relays)' : ''}:{' '}
          <a href={eventLink(published)}>open the gig</a>
        </p>
      )}
    </section>
  );
}

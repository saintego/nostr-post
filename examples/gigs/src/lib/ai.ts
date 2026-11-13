/**
 * Turning a post about a gig (text, a poster) into the gig form's values, with AI: either
 * Claude or Gemini with the user's own API key (`aiProviders.ts`, called from the browser; the
 * key stays in this browser) or a prompt the user copies to any AI, pasting the answer back. The result is
 * only ever a draft: the app shows it as a preview and in the composer before anything is
 * published.
 */

import { findJsonObject } from '@nostr-post/core/formJson';
import { keepKnownLinks } from '@nostr-post/plugin-embed';
import type { WikiEntityData } from '@nostr-post/plugin-wiki-entity';
import { formJsonSchema, parseFormJson } from '@nostr-post/plugins/formJson';
import type { FormJsonSuggestion } from '@nostr-post/plugins/types';
import { ensurePluginsForManifest } from '@nostr-post/web';
import { performersOf } from './links';
import { GIG_MANIFEST } from './manifests';

/**
 * The gig form's schema: built from the gig manifest (its fields' labels and descriptions),
 * with what each field plugin asks for, e.g. the date's `{ start, end, tzid }` and the
 * performers' names (looked up as artist pages afterwards).
 */
export const gigSchema = () => formJsonSchema(GIG_MANIFEST);

/**
 * Loads the gig form's field plugins: the schema and reading the answer need them (their
 * `jsonSchema` and `parseJson`), before any composer has loaded them
 */
export const loadGigPlugins = () => ensurePluginsForManifest(GIG_MANIFEST);

/**
 * Asks for the page the gig comes from (the `source` field: NIP-48, marks it as imported from
 * there), so the gig credits where it was published first
 */
const ASK_SOURCE = `
Give the gig's source: the page it was published on first, e.g. a Facebook event, the venue's or
promoter's event page, a Resident Advisor, Gancio or ticket page. Take it from the post when it has
a URL of the event or of the post itself; when it doesn't but names where it's from and you know
that page, give it (it's checked before use). null when there's none.`;

/** Asks the AI for performers' links the post doesn't have; they're checked before use */
const SUGGEST_LINKS = `
Performers' media may also have links you know for them that the post doesn't: every page about
them you know, from any site, e.g. their own website, Bandcamp, Spotify, SoundCloud, YouTube
channel or videos, Instagram, Facebook, Metal Archives, Discogs, Wikipedia. Give all you know;
each is checked, or confirmed by the user, before it's used.`;

/**
 * The prompt for a gig's text (and, sent separately, its poster). `suggestLinks`: also ask for
 * performers' links the post doesn't have, from any site (`suggestedLinks` checks them, or the
 * user confirms them).
 */
export const gigPrompt = (
  text: string,
  { today = new Date().toISOString().slice(0, 10), suggestLinks = false } = {}
): string =>
  `Extract the event from this post about a concert or party. Today is ${today}: a date without a
year is the next one. Use only what the post says; null when it doesn't say. The time zone is
the venue's, from its city or country, even when the post doesn't name it.${ASK_SOURCE}${suggestLinks ? SUGGEST_LINKS : ''}
Answer with JSON only, no other text, valid against this JSON Schema:
${JSON.stringify(gigSchema())}

Post:
${text || '(see the poster image)'}`;

/** A performer as the AI read them: name and links */
export interface ReadPerformer {
  name: string;
  links: string[];
}

/** The draft read from the AI's answer */
export interface GigDraft {
  formatId: string;
  formData: Record<string, unknown>;
  suggestions: Record<string, FormJsonSuggestion[]>;
  performers: ReadPerformer[];
  fromPoster: string[];
  /** The venue as the AI named it, when OpenStreetMap found no place for it */
  venueNotFound?: string;
}

const textOf = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** The venue's name in the answer, `{ name }` or text */
const venueName = (value: unknown): string => {
  const location = (value as Record<string, unknown> | null)?.location;
  return textOf((location as { name?: unknown } | null)?.name) || textOf(location);
};

/**
 * The venue with the gig's address (`place`) when it has none, so a venue OpenStreetMap doesn't
 * have is placed at its address (also for answers giving `location` as text)
 */
const withVenueAddress = (value: unknown): unknown => {
  const answer = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const name = venueName(answer);
  const own = (answer.location as { address?: unknown } | null)?.address;
  const address = textOf(own) || textOf(answer.place);
  return name && address ? { ...answer, location: { name, address } } : value;
};

/**
 * The gig form's values and publish format from the AI's answer (text with JSON, as any AI
 * gives it): performers become their musician pages, found by their profile links or names;
 * those without a page stay unlinked (their links still tag the gig) and are named in the
 * description, so the gig says who plays. Only links the post's `text` has are used (with a
 * poster, others are kept as `fromPoster`, for the user to check), and those the user `confirmed`
 * (from `suggestedLinks`). A start with a time is published as a timed event, whatever format
 * the AI chose. Throws when the answer has no usable JSON.
 */
export const readAnswer = async (
  answer: string,
  { text = '', hasPoster = false, confirmed = [] as string[] } = {}
): Promise<GigDraft> => {
  const json = findJsonObject(answer);
  if (!json.success) throw json.error;
  await loadGigPlugins();
  const { value, fromImage: fromPoster } = keepKnownLinks(json.data, text, {
    hasImage: hasPoster,
    confirmed,
  });
  const parsed = await parseFormJson(GIG_MANIFEST, withVenueAddress(value));
  if (!parsed.success) throw parsed.error;
  const { formatId, formData, suggestions } = parsed.data;
  const performers = performersOf(value).flatMap((p) =>
    typeof p.title === 'string' && p.title
      ? [{ name: p.title, links: Array.isArray(p.media) ? p.media.map(String) : [] }]
      : []
  );
  const start = (formData.when as { start?: string } | undefined)?.start ?? '';
  return {
    formatId: /T\d\d:\d\d/.test(start) ? 'timed' : (formatId ?? 'all-day'),
    formData: withUnlinkedNames(formData),
    suggestions,
    performers,
    fromPoster,
    venueNotFound: formData.location ? undefined : venueName(value) || undefined,
  };
};

/** The performers picked in form data */
export const pickedPerformers = (formData: Record<string, unknown>): WikiEntityData[] =>
  Array.isArray(formData.performers) ? (formData.performers as WikiEntityData[]) : [];

/** Performers without a page (yet), by name */
export const unlinkedNames = (formData: Record<string, unknown>): string[] =>
  pickedPerformers(formData).flatMap((p) => (p.unlinked && p.displayName ? [p.displayName] : []));

/** The description with the names of performers without a page, unless it has them already */
const withUnlinkedNames = (formData: Record<string, unknown>): Record<string, unknown> => {
  const description = typeof formData.description === 'string' ? formData.description : '';
  const missing = unlinkedNames(formData).filter(
    (name) => !description.toLowerCase().includes(name.toLowerCase())
  );
  if (!missing.length) return formData;
  const line = `With: ${missing.join(', ')}`;
  return { ...formData, description: description ? `${description}\n\n${line}` : line };
};

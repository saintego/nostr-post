/**
 * Turning a post about a gig (text, a poster) into the gig form's values, with AI: either
 * Claude with the user's own API key (the official SDK, called from the browser; the key stays
 * in this browser) or a prompt the user copies to any AI, pasting the answer back. The result is
 * only ever a draft: the app shows it as a preview and in the composer before anything is
 * published.
 */

import { findJsonObject } from '@nostr-post/core/formJson';
import type { WikiEntityData } from '@nostr-post/plugin-wiki-entity';
import { formJsonSchema, parseFormJson } from '@nostr-post/plugins/formJson';
import type { FormJsonSuggestion } from '@nostr-post/plugins/types';
import { checkLinks, performersOf } from './links';
import { GIG_MANIFEST } from './manifests';

/**
 * The gig form's schema: built from the gig manifest (its fields' labels and descriptions),
 * with what each field plugin asks for, e.g. the date's `{ start, end, tzid }` and the
 * performers' names (looked up as artist pages afterwards).
 */
export const gigSchema = () => formJsonSchema(GIG_MANIFEST);

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
year is the next one. Use only what the post says; null when it doesn't say.${suggestLinks ? SUGGEST_LINKS : ''}
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
}

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
  const { value, fromPoster } = checkLinks(json.data, text, hasPoster, confirmed);
  const parsed = await parseFormJson(GIG_MANIFEST, value);
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

/** A file as base64 without its data-URL prefix */
const base64Of = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

type ImageType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
const IMAGE_TYPES: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Asks Claude with the user's own API key, from the browser (`dangerouslyAllowBrowser`: the key
 * is the user's and stays in their browser). The SDK is loaded only when someone asks. The answer
 * is the gig as JSON, valid against gigSchema(). On a safety decline the API retries on
 * Anthropic's recommended fallback model (`fallbacks: "default"`); a refusal of the whole chain
 * throws.
 */
export async function askClaude({
  apiKey,
  model = 'claude-opus-5-5',
  text,
  poster,
  suggestLinks = false,
}: {
  apiKey: string;
  model?: string;
  text: string;
  poster?: File;
  suggestLinks?: boolean;
}): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  if (poster && !IMAGE_TYPES.includes(poster.type)) {
    throw new Error('The poster must be a JPEG, PNG, GIF or WebP image');
  }
  const image = poster
    ? [
        {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: poster.type as ImageType,
            data: await base64Of(poster),
          },
        },
      ]
    : [];
  const response = await client.beta.messages.create({
    model,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // A short extraction: low effort is enough
    output_config: { effort: 'low', format: { type: 'json_schema', schema: gigSchema() } },
    messages: [
      {
        role: 'user',
        content: [...image, { type: 'text', text: gigPrompt(text, { suggestLinks }) }],
      },
    ],
  });
  if (response.stop_reason === 'refusal') {
    throw new Error(response.stop_details?.explanation ?? 'Claude declined this request');
  }
  return response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
}

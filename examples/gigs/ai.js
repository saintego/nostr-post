/**
 * Turning a post about a gig (text, a poster) into the gig form's values, with AI: either
 * Claude with the user's own API key (the official SDK, called from the browser; the key stays
 * in this browser) or a prompt the user copies to any AI, pasting the answer back. The result is only ever a
 * draft: the app shows it as a preview and in the composer before anything is published.
 */

import { findJsonObject, formJsonSchema, parseFormJson } from '../../nostr-post.js';
import { checkLinks } from './links.js';
import { GIG_MANIFEST } from './manifests.js';

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
  text,
  { today = new Date().toISOString().slice(0, 10), suggestLinks = false } = {}
) =>
  `Extract the event from this post about a concert or party. Today is ${today}: a date without a
year is the next one. Use only what the post says; null when it doesn't say.${suggestLinks ? SUGGEST_LINKS : ''}
Answer with JSON only, no other text, valid against this JSON Schema:
${JSON.stringify(gigSchema())}

Post:
${text || '(see the poster image)'}`;

/**
 * The gig form's values and publish format from the AI's answer (text with JSON, as any AI
 * gives it): performers become their musician pages, found by their profile links or names;
 * those without a page stay unlinked (their links still tag the gig) and are named in the
 * description, so the gig says who plays. Only links the post's `text` has are used (with a
 * poster, others are kept as `fromPoster`, for the user to check), and those the user `confirmed`
 * (from `suggestedLinks`). A start with a time is
 * published as a timed event, whatever format the AI chose. `performers`: each performer's name
 * and links, as the AI read them. Throws when the answer has no usable JSON.
 */
export const readAnswer = async (answer, { text = '', poster, confirmed = [] } = {}) => {
  const json = findJsonObject(answer);
  if (!json.success) throw json.error;
  const { value, fromPoster } = checkLinks(json.data, text, Boolean(poster), confirmed);
  const parsed = await parseFormJson(GIG_MANIFEST, value);
  if (!parsed.success) throw parsed.error;
  const { formatId, formData, suggestions } = parsed.data;
  const performers = (Array.isArray(value.performers) ? value.performers : []).flatMap((p) =>
    p?.title ? [{ name: p.title, links: Array.isArray(p.media) ? p.media : [] }] : []
  );
  const timed = /T\d\d:\d\d/.test(formData.when?.start ?? '');
  return {
    formatId: timed ? 'timed' : (formatId ?? 'all-day'),
    formData: withUnlinkedNames(formData),
    suggestions,
    performers,
    fromPoster,
  };
};

/** The description with the names of performers without a page, unless it has them already */
const withUnlinkedNames = (formData) => {
  const names = (formData.performers ?? [])
    .filter((p) => p.unlinked && p.displayName)
    .map((p) => p.displayName);
  const description = formData.description ?? '';
  const missing = names.filter((name) => !description.toLowerCase().includes(name.toLowerCase()));
  if (!missing.length) return formData;
  const line = `With: ${missing.join(', ')}`;
  return { ...formData, description: description ? `${description}\n\n${line}` : line };
};

/** The official SDK, loaded only when someone asks Claude (pinned; ESM from jsDelivr) */
const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.133.0/+esm';

/** A file as base64 without its data-URL prefix */
const base64Of = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/**
 * Asks Claude with the user's own API key, from the browser (`dangerouslyAllowBrowser`: the key
 * is the user's and stays in their browser). The answer is the gig as JSON, valid against
 * gigSchema(). On a safety decline the API retries on Anthropic's recommended fallback model
 * (`fallbacks: "default"`); a refusal of the whole chain throws.
 */
export async function askClaude({
  apiKey,
  model = 'claude-opus-5-5',
  text,
  poster,
  suggestLinks = false,
}) {
  const { default: Anthropic } = await import(SDK_URL);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const content = [];
  if (poster) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: poster.type, data: await base64Of(poster) },
    });
  }
  content.push({ type: 'text', text: gigPrompt(text, { suggestLinks }) });
  const response = await client.beta.messages.create({
    model,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    // A short extraction: low effort is enough
    output_config: { effort: 'low', format: { type: 'json_schema', schema: gigSchema() } },
    messages: [{ role: 'user', content }],
  });
  if (response.stop_reason === 'refusal') {
    throw new Error(response.stop_details?.explanation ?? 'Claude declined this request');
  }
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

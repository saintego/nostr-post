/**
 * Turning a post about a gig (text, a poster) into the gig form's values, with AI: either
 * Claude with the user's own API key (the official SDK, called from the browser; the key stays
 * in this browser) or a prompt the user copies to any AI, pasting the answer back. The result is only ever a
 * draft: the app shows it as a preview and in the composer before anything is published.
 */

import { answerSchema, answerToFormData } from '../../nostr-post.js';
import { GIG_MANIFEST } from './manifests.js';

/**
 * The gig form's schema: built from the gig manifest (its fields' labels and descriptions),
 * with what each field plugin asks for, e.g. the date's `{ start, end, tzid }` and the
 * performers' names (looked up as artist pages afterwards).
 */
export const gigSchema = () => answerSchema(GIG_MANIFEST);

/** The prompt for a gig's text (and, sent separately, its poster) */
export const gigPrompt = (text, today = new Date().toISOString().slice(0, 10)) =>
  `Extract the event from this post about a concert or party. Today is ${today}: a date without a
year is the next one. Use only what the post says; null when it doesn't say. Answer with JSON only,
no other text, valid against this JSON Schema:
${JSON.stringify(gigSchema())}

Post:
${text || '(see the poster image)'}`;

/** The first JSON object in an answer (AIs sometimes wrap it in text or code fences) */
export const parseAnswer = (answer) => {
  const start = answer.indexOf('{');
  const end = answer.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in the answer');
  return JSON.parse(answer.slice(start, end + 1));
};

/**
 * The gig form's values and publish format from the AI's JSON: performers become their artist
 * pages (`unresolved.performers`: names without a page yet). A start with a time is published
 * as a timed event, whatever format the answer chose.
 */
export const toFormData = async (gig) => {
  const { formatId, formData, unresolved } = await answerToFormData(GIG_MANIFEST, gig);
  const timed = /T\d\d:\d\d/.test(formData.when?.start ?? '');
  return { formatId: timed ? 'timed' : (formatId ?? 'all-day'), formData, unresolved };
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
export async function askClaude({ apiKey, model = 'claude-opus-5-5', text, poster }) {
  const { default: Anthropic } = await import(SDK_URL);
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const content = [];
  if (poster) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: poster.type, data: await base64Of(poster) },
    });
  }
  content.push({ type: 'text', text: gigPrompt(text) });
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

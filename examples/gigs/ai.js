/**
 * Turning a post about a gig (text, a poster) into the gig form's values, with AI: either
 * Claude with the user's own API key (the official SDK, called from the browser; the key stays
 * in this browser) or a prompt the user copies to any AI, pasting the answer back. The result is only ever a
 * draft: the app shows it as a preview and in the composer before anything is published.
 */

/** The JSON the AI is asked for */
const SHAPE = `{
  "title": string,
  "allDay": boolean,            // true when no start time is known
  "start": "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" (local time at the venue),
  "end": same form or null,
  "timeZone": IANA zone of the venue, e.g. "America/Bogota", or null,
  "place": venue name and address as written, or null,
  "link": ticket or event page URL, or null,
  "description": short description, or null,
  "genres": [lowercase words],
  "performers": [artist or band names]
}`;

/** The prompt for a gig's text (and, sent separately, its poster) */
export const gigPrompt = (text, today = new Date().toISOString().slice(0, 10)) =>
  `Extract the event from this post about a concert or party. Today is ${today}: a date without a
year is the next one. Answer with JSON only, no other text, in this shape:
${SHAPE}

Post:
${text || '(see the poster image)'}`;

/** The first JSON object in an answer (AIs sometimes wrap it in text or code fences) */
export const parseAnswer = (answer) => {
  const start = answer.indexOf('{');
  const end = answer.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in the answer');
  return JSON.parse(answer.slice(start, end + 1));
};

/** The gig form's values and publish format from the AI's JSON */
export const toFormData = (gig) => {
  const allDay = gig.allDay || !/T\d\d:\d\d/.test(gig.start ?? '');
  const day = (value) => (value ? String(value).slice(0, allDay ? 10 : 16) : undefined);
  const when = { start: day(gig.start) };
  if (gig.end) when.end = day(gig.end);
  if (!allDay && gig.timeZone) when.tzid = gig.timeZone;
  const formData = { title: gig.title, when };
  if (gig.place) formData.place = gig.place;
  if (gig.link) formData.link = gig.link;
  if (gig.description) formData.description = gig.description;
  if (gig.genres?.length) formData.tags = gig.genres.map((g) => String(g).toLowerCase());
  return {
    formatId: allDay ? 'all-day' : 'timed',
    formData,
    performers: Array.isArray(gig.performers) ? gig.performers : [],
  };
};

/** The JSON Schema of the answer (structured outputs: Claude's answer is valid against it) */
const nullable = (type) => ({ anyOf: [{ type }, { type: 'null' }] });
export const GIG_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    allDay: { type: 'boolean' },
    start: { type: 'string' },
    end: nullable('string'),
    timeZone: nullable('string'),
    place: nullable('string'),
    link: nullable('string'),
    description: nullable('string'),
    genres: { type: 'array', items: { type: 'string' } },
    performers: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'title',
    'allDay',
    'start',
    'end',
    'timeZone',
    'place',
    'link',
    'description',
    'genres',
    'performers',
  ],
  additionalProperties: false,
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
 * GIG_SCHEMA. On a safety decline the API retries on Anthropic's recommended fallback model
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
    output_config: { effort: 'low', format: { type: 'json_schema', schema: GIG_SCHEMA } },
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

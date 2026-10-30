/**
 * Adding a gig: the post's text and poster, read by AI (Claude with the user's key, or any AI
 * through a copied prompt), checked as a preview and corrected in the composer before publishing;
 * or the empty form, filled in by hand.
 */

import { findJsonObject } from '@nostr-post/core/formJson';
import { useEffect, useRef, useState } from 'react';
import { askClaude, type GigDraft, gigPrompt, loadGigPlugins, readAnswer } from '../lib/ai';
import { type SuggestedLink, suggestedLinks } from '../lib/links';
import { store } from '../lib/store';
import { DraftReview } from './DraftReview';
import { SuggestedLinks } from './SuggestedLinks';

const messageOf = (error: unknown) => (error as Error | undefined)?.message ?? String(error);

/** The prompt to copy to any AI, with a copy button */
function PromptCopy({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied('Copied: paste it into any AI.');
    } catch {
      textarea.current?.select();
      setCopied("Couldn't copy: it's selected, copy it with Ctrl+C or ⌘C.");
    }
  };
  return (
    <details>
      <summary>No key? Use any AI</summary>
      <p className="hint">
        Copy this prompt to any AI (with the poster, if you have one), then paste its answer below.
      </p>
      {/* Clicking the prompt selects it all, for copying by hand where the clipboard is blocked */}
      <textarea
        ref={textarea}
        rows={6}
        readOnly
        value={prompt}
        onFocus={(e) => e.target.select()}
      />
      <div className="row">
        <button type="button" onClick={copy}>
          Copy prompt
        </button>
        <span className="hint" role="status">
          {copied}
        </span>
      </div>
    </details>
  );
}

/** What the page shows after step 2: links to confirm, or the draft (none: the empty form) */
type Next =
  | { step: 'links'; answer: string; suggestions: SuggestedLink[] }
  | { step: 'review'; draft?: GigDraft; id: number };

export function AddGig() {
  const [text, setText] = useState('');
  const [poster, setPoster] = useState<File>();
  const [apiKey, setApiKey] = useState(() => store.get('gigs:api-key') ?? '');
  const [rememberKey, setRememberKey] = useState(() => Boolean(store.get('gigs:api-key')));
  const [suggestLinks, setSuggestLinks] = useState(() => store.get('gigs:suggest-links') !== '0');
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState('');
  const [next, setNext] = useState<Next>();
  // The prompt's schema comes from the form's plugins
  const [pluginsLoaded, setPluginsLoaded] = useState(false);
  useEffect(() => {
    void loadGigPlugins().then(() => setPluginsLoaded(true));
  }, []);

  const review = (draft?: GigDraft) => setNext({ step: 'review', draft, id: Date.now() });

  const showDraft = async (answerText: string, confirmed: string[]) => {
    try {
      setStatus('Reading the answer…');
      const draft = await readAnswer(answerText, { text, hasPoster: Boolean(poster), confirmed });
      setStatus('');
      review(draft);
    } catch (error) {
      setStatus(`Couldn't read the answer: ${messageOf(error)}`);
    }
  };

  // Links the post doesn't have, suggested by the AI, are offered to confirm before the preview
  const preview = async (answerText: string) => {
    setNext(undefined);
    const json = findJsonObject(answerText);
    if (!json.success) return setStatus(`Couldn't read the answer: ${json.error.message}`);
    setStatus('Checking the links the AI suggested…');
    const suggestions = await suggestedLinks(json.data, text, Boolean(poster));
    setStatus('');
    if (!suggestions.length) return showDraft(answerText, []);
    setNext({ step: 'links', answer: answerText, suggestions });
  };

  const ask = async () => {
    const key = apiKey.trim();
    if (!key) return setStatus('Enter your API key, or use the prompt with any AI.');
    store.set('gigs:api-key', rememberKey ? key : null);
    setStatus('Asking Claude…');
    try {
      const reply = await askClaude({ apiKey: key, text, poster, suggestLinks });
      setAnswer(reply);
      setStatus('Done: check the preview below.');
      await preview(reply);
    } catch (error) {
      setStatus(`Claude: ${messageOf(error)}`);
    }
  };

  return (
    <>
      <h2>Add a gig</h2>
      <p className="hint">
        Have AI read a post about it, or{' '}
        <button type="button" onClick={() => review()}>
          fill in the form yourself
        </button>
      </p>
      <section className="step">
        <h3>1. The post</h3>
        <p className="hint">
          Copy the text of the post (Facebook, Instagram, a website) and save its poster.
        </p>
        <textarea
          rows={6}
          placeholder="Paste the post's text"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <label>
          Poster{' '}
          <input type="file" accept="image/*" onChange={(e) => setPoster(e.target.files?.[0])} />
        </label>
      </section>
      <section className="step">
        <h3>2. Read it with AI</h3>
        <div className="row">
          <label>
            Your Anthropic API key{' '}
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={rememberKey}
              onChange={(e) => setRememberKey(e.target.checked)}
            />{' '}
            Remember in this browser
          </label>
          <button type="button" onClick={ask}>
            Ask Claude
          </button>
        </div>
        {pluginsLoaded && <PromptCopy prompt={gigPrompt(text, { suggestLinks })} />}
        <label>
          <input
            type="checkbox"
            checked={suggestLinks}
            onChange={(e) => {
              setSuggestLinks(e.target.checked);
              store.set('gigs:suggest-links', e.target.checked ? '1' : '0');
            }}
          />{' '}
          Let the AI suggest performers' links the post doesn't have (you confirm them)
        </label>
        <textarea
          rows={6}
          placeholder="The AI's answer (JSON)"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <button type="button" onClick={() => preview(answer)}>
          Preview
        </button>
        <p className="hint" role="status">
          {status}
        </p>
      </section>
      {next?.step === 'links' && (
        <SuggestedLinks
          suggestions={next.suggestions}
          onContinue={(confirmed) => showDraft(next.answer, confirmed)}
        />
      )}
      {next?.step === 'review' && <DraftReview key={next.id} draft={next.draft} />}
    </>
  );
}

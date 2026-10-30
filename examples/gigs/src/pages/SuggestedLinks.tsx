import { useState } from 'react';
import type { SuggestedLink } from '../lib/links';

/**
 * The links the AI suggested, as players (or links) with "It's them" to confirm each: those their
 * site knows by the performer's name are ticked, the ones no site could be asked about are left
 * for the user to open. `onContinue` gets the confirmed links
 */
export function SuggestedLinks({
  suggestions,
  onContinue,
}: {
  suggestions: SuggestedLink[];
  onContinue: (confirmed: string[]) => void;
}) {
  const [ticked, setTicked] = useState(
    () => new Set(suggestions.filter((s) => s.checked).map((s) => s.link))
  );
  const toggle = (link: string, on: boolean) =>
    setTicked((current) => {
      const next = new Set(current);
      if (on) next.add(link);
      else next.delete(link);
      return next;
    });
  return (
    <section className="step">
      <h3>Links the AI suggested</h3>
      <p className="hint">
        Not in the post: check each one. Ticked ones exist under the performer's name, but may be
        someone else's with the same name: play them. The others couldn't be checked: open them.
        Keep ticked only those that are really them.
      </p>
      {suggestions.map((s) => (
        <div className="performer" key={`${s.name} ${s.link}`}>
          <strong>{s.name}</strong>
          <np-embed url={s.link} />
          <label>
            <input
              type="checkbox"
              checked={ticked.has(s.link)}
              onChange={(e) => toggle(s.link, e.target.checked)}
            />{' '}
            It's them{' '}
            {s.checked
              ? `(checked: ${s.names.join(' · ')})`
              : "(couldn't be checked: open the link)"}
          </label>
        </div>
      ))}
      <button type="button" onClick={() => onContinue([...ticked])}>
        Continue
      </button>
    </section>
  );
}

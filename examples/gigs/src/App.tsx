/**
 * The app's frame: the header with its pages and the test mode switch, and the page the link
 * shows. Test mode signs events but publishes nothing (the signer's dry run).
 */

import { ensureOutboxRunner } from '@nostr-post/outbox/web';
import { setEntityPageHref } from '@nostr-post/plugin-wiki-entity';
import { setDryRun } from '@nostr-post/signer';
import { type ColorScheme, colorSchemes, parseColorScheme } from '@nostr-post/ui';
import { followColorScheme } from '@nostr-post/ui/web';
import { setComposerDefaults } from '@nostr-post/web';
import { useEffect, useState } from 'react';
import { ARTIST_MANIFEST } from './lib/manifests';
import { artistLink, routeOf } from './lib/routes';
import { store } from './lib/store';
import { AddGig } from './pages/AddGig';
import { ArtistComposer } from './pages/ArtistComposer';
import { ArtistPage } from './pages/ArtistPage';
import { Browse } from './pages/Browse';
import { EventPage } from './pages/EventPage';
import { ImportIcs } from './pages/ImportIcs';
import { MyGigs } from './pages/MyGigs';
import { Outbox } from './pages/Outbox';

// Timed posts and photos waiting for wifi go while the app is open, whatever page it shows
ensureOutboxRunner();
// Every composer, also an event's "Add: Photos and videos", offers Upload later and Publish at;
// Save draft only the gig's (the outbox opens drafts in Add a gig)
setComposerDefaults({ schedule: true, uploadLater: true });
// A gig's performers link to their musician page (its gigs, photos and videos)
setEntityPageHref((entity, manifest) =>
  manifest?.id === ARTIST_MANIFEST.id ? artistLink(entity.dTag) : undefined
);

/** The link's hash, following its changes */
const useHash = (): string => {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const onChange = () => setHash(location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
};

/** Test mode: on by default, so nothing reaches relays until the user turns it off */
const useTestMode = (): [boolean, (on: boolean) => void] => {
  const [on, setOn] = useState(() => store.get('gigs:test-mode') !== '0');
  useEffect(() => {
    setDryRun(on);
    store.set('gigs:test-mode', on ? '1' : '0');
  }, [on]);
  return [on, setOn];
};

function Page({ hash }: { hash: string }) {
  const route = routeOf(hash);
  switch (route.page) {
    case 'event':
      return <EventPage address={route.address} />;
    case 'artist':
      return <ArtistPage dTag={route.dTag} />;
    case 'artist-new':
      return <ArtistComposer name={route.name} />;
    case 'artist-edit':
      return <ArtistComposer dTag={route.dTag} additions={route.additions} />;
    case 'add':
      return <AddGig draftId={route.draftId} />;
    case 'outbox':
      return <Outbox />;
    case 'mine':
      return <MyGigs />;
    case 'import':
      return <ImportIcs />;
    case 'browse':
      return <Browse query={route.query} />;
  }
}

/** Light, dark or the system's: remembered, applied to the page (the components follow it) */
const useColorScheme = (): [ColorScheme, (scheme: ColorScheme) => void] => {
  const [scheme, setScheme] = useState(() => parseColorScheme(store.get('gigs:theme')));
  useEffect(() => {
    store.set('gigs:theme', scheme);
    return followColorScheme(scheme);
  }, [scheme]);
  return [scheme, setScheme];
};

const SCHEME_LABELS: Record<ColorScheme, string> = { system: 'Auto', light: 'Light', dark: 'Dark' };

export function App() {
  const hash = useHash();
  const [testMode, setTestMode] = useTestMode();
  const [scheme, setScheme] = useColorScheme();
  return (
    <>
      <header>
        <h1>🎸 Gigs</h1>
        <nav>
          <a href="#/">Browse</a>
          <a href="#/mine">My gigs</a>
          <a href="#/add">Add a gig</a>
          <a href="#/import">Import .ics</a>
          <a href="#/outbox">Outbox</a>
          <a href="#/artist-new">Add an artist</a>
        </nav>
        <label className="np-checkbox">
          <input
            type="checkbox"
            checked={testMode}
            onChange={(e) => setTestMode(e.target.checked)}
          />
          Test mode
        </label>
        <fieldset className="np-segmented" aria-label="Theme">
          {colorSchemes.map((s) => (
            <button
              key={s}
              type="button"
              className="np-segment"
              aria-pressed={scheme === s}
              onClick={() => setScheme(s)}
            >
              {SCHEME_LABELS[s]}
            </button>
          ))}
        </fieldset>
      </header>
      {testMode && (
        <div className="banner" role="status">
          Test mode: sign in (bottom-right) to try adding gigs. Events are signed and shown, but
          nothing is sent to relays. Turn it off to publish.
        </div>
      )}
      <main>
        {/* A new page for each link: pages keep no state across links */}
        <Page key={hash.split('?')[0]} hash={hash} />
      </main>
    </>
  );
}

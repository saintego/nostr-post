/**
 * The app's frame: the header with its pages and the test mode switch, and the page the link
 * shows. Test mode signs events but publishes nothing (the signer's dry run).
 */

import { setDryRun } from '@nostr-post/signer';
import { useEffect, useState } from 'react';
import { routeOf } from './lib/routes';
import { store } from './lib/store';
import { AddGig } from './pages/AddGig';
import { ArtistComposer } from './pages/ArtistComposer';
import { ArtistPage } from './pages/ArtistPage';
import { Browse } from './pages/Browse';
import { EventPage } from './pages/EventPage';
import { ImportIcs } from './pages/ImportIcs';

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
      return <AddGig />;
    case 'import':
      return <ImportIcs />;
    case 'browse':
      return <Browse query={route.query} />;
  }
}

export function App() {
  const hash = useHash();
  const [testMode, setTestMode] = useTestMode();
  return (
    <>
      <header>
        <h1>🎸 Gigs</h1>
        <nav>
          <a href="#/">Browse</a>
          <a href="#/add">Add a gig</a>
          <a href="#/import">Import .ics</a>
          <a href="#/artist-new">Add an artist</a>
        </nav>
        <label className="switch">
          <input
            type="checkbox"
            checked={testMode}
            onChange={(e) => setTestMode(e.target.checked)}
          />{' '}
          Test mode
        </label>
      </header>
      {testMode && (
        <div className="banner">
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

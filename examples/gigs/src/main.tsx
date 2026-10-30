/**
 * Gigs: concerts and parties on Nostr (NIP-52), a thin React app on nostr-post's packages.
 * The packages' web entries define the custom elements it uses; the field plugins they don't
 * import are loaded on demand (`@nostr-post/web`'s plugin autoload).
 */

import '@nostr-post/web';
import '@nostr-post/calendar/web';
import '@nostr-post/wiki/web';
import '@nostr-post/plugin-wiki-entity/web';
import '@nostr-post/plugin-embed/web';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// The components turn dark with a `dark` class on an ancestor; follow the system setting
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const syncDark = () => document.body.classList.toggle('dark', darkQuery.matches);
syncDark();
darkQuery.addEventListener('change', syncDark);

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

/**
 * Gigs: concerts and parties on Nostr (NIP-52), a thin React app on nostr-post's packages.
 * The packages' web entries define the custom elements it uses; the field plugins they don't
 * import are loaded on demand (`@nostr-post/web`'s plugin autoload).
 */

import '@nostr-post/ui/ui.css';
import './gigs.css';
import '@nostr-post/web';
import '@nostr-post/calendar/web';
import '@nostr-post/wiki/web';
import '@nostr-post/plugin-wiki-entity/web';
import '@nostr-post/plugin-embed/web';
import { onSignInNeeded } from '@nostr-post/plugins/signIn';
import { setKnownPublicKey } from '@nostr-post/signer';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

// Sign-in: start the bridge here instead of relying on its script tag (init() is safe to call
// again). It installs window.nostr and its sign-in widget in the bottom-right corner
window.NostrBridge?.init({ layout: 'floating' }).catch((err: unknown) => {
  console.error('nostr-bridge: sign-in could not start', err);
});
// Who is signed in, for views that mark the user's own answers (RSVPs) without asking the signer
window.NostrBridge?.onAuthChange((state) => setKnownPublicKey(state.pubkey ?? undefined));
// An upload or a publish without a signed-in user opens the sign-in
onSignInNeeded(() => {
  window.NostrBridge?.login().catch((err: unknown) => console.error('nostr-bridge: sign-in', err));
});

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

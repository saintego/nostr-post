/**
 * @nostr-post/web - <nostr-post-composer>'s tag in TypeScript's element map, as the other elements
 * have it (`document.querySelector('nostr-post-composer')`, JSX types). Its own module: composer.ts
 * is near the file size limit.
 */

import type { NostrPostComposer } from './composer';

declare global {
  interface HTMLElementTagNameMap {
    'nostr-post-composer': NostrPostComposer;
  }
}

/**
 * nostr-post's custom elements in JSX: React 19 sets each prop as the element's property when it
 * has one (objects and functions too), and `on<event-name>` listens to that event, e.g.
 * `onnostr-post-published`. The elements' own types come from the packages
 * (`HTMLElementTagNameMap`).
 */

import type { HTMLAttributes, Ref } from 'react';

type ElementProps<E extends HTMLElement> = Partial<Omit<E, keyof HTMLElement>> &
  HTMLAttributes<E> & {
    ref?: Ref<E>;
    [event: `on${string}-${string}`]: ((event: CustomEvent) => void) | undefined;
  };

type Tags =
  | 'nostr-calendar-agenda'
  | 'nostr-calendar-event'
  | 'nostr-post-composer'
  | 'nostr-post-feed'
  | 'nostr-post-view'
  | 'nostr-wiki-composer'
  | 'nostr-wiki-view'
  | 'np-embed';

type NostrPostElements = { [Tag in Tags]: ElementProps<HTMLElementTagNameMap[Tag]> };

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends NostrPostElements {}
  }
}

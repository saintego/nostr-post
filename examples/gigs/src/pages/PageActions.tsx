import type { ReactNode } from 'react';

/** A page's way back ("← All gigs") and its actions, as buttons like the event header's */
export function PageActions({ children }: { children?: ReactNode }) {
  return (
    <nav className="np-toolbar page-actions" aria-label="Page">
      <a className="np-button np-small" href="#/">
        ← All gigs
      </a>
      {children}
    </nav>
  );
}

/** A link shown as a button, in PageActions */
export function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="np-button np-small" href={href}>
      {children}
    </a>
  );
}

import { GIG_MANIFEST } from '../lib/manifests';
import { PageActions } from './PageActions';

/** One gig by its address (the link has its naddr: shareable), with its comments and photos */
export function EventPage({ address }: { address: string }) {
  return (
    <>
      <PageActions />
      <nostr-calendar-event manifest={GIG_MANIFEST} address={address} thread editable />
      <p className="share">
        Share:{' '}
        <input
          className="np-input"
          readOnly
          value={location.href}
          onFocus={(e) => e.target.select()}
        />
      </p>
    </>
  );
}

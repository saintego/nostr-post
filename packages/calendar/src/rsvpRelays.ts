/**
 * @nostr-post/plugin-date - reading and publishing RSVPs
 *
 * Through the signer (`fetchEvents`, `signAndPublish`), so test mode (dry run) and the
 * user's relays apply. No DOM dependencies.
 */

import type { Result } from '@nostr-post/core/types';
import {
  DEFAULT_RELAYS,
  fetchEvents,
  getPublicKey,
  getPublishRelays,
  type SignedEvent,
  signAndPublish,
} from '@nostr-post/signer';
import { type RsvpStatus, rsvpEvent, rsvpFilter } from './rsvp';

export interface RsvpRelayOptions {
  /** Relays to read from and publish to besides the user's own; default DEFAULT_RELAYS */
  relays?: string[];
}

/** The RSVPs to calendar events, by their addresses */
export const fetchRsvps = (
  addresses: string[],
  options: RsvpRelayOptions = {}
): Promise<SignedEvent[]> =>
  fetchEvents(rsvpFilter(addresses), options.relays ?? DEFAULT_RELAYS, { waitForAll: true });

/** Signs (asking the signer for the user) and publishes the user's answer to an event */
export async function publishRsvp(
  address: string,
  status: RsvpStatus,
  options: RsvpRelayOptions & { note?: string } = {}
): Promise<Result<SignedEvent>> {
  try {
    const pubkey = await getPublicKey();
    const relays = await getPublishRelays(pubkey, options.relays ?? DEFAULT_RELAYS);
    const event = rsvpEvent(address, status, pubkey, { note: options.note });
    const { signedEvent, publishResults } = await signAndPublish(event, relays);
    if (publishResults.success === 0) {
      return { success: false, error: new Error('No relay accepted the RSVP') };
    }
    return { success: true, data: signedEvent };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

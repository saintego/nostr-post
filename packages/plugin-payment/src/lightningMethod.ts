/**
 * @nostr-post/plugin-payment - Lightning as a payment method: a Lightning address, an LNURL or an
 * npub (its profile's Lightning). Dynamic: <np-lightning> shows its LNURL as a QR and asks for
 * invoices and zaps.
 */

import { parseLightningTarget } from './lnurl';
import type { PaymentMethod } from './methods';

export const lightningMethod: PaymentMethod = {
  id: 'lightning',
  name: 'Lightning',
  icon: '⚡',
  description: 'Instant Bitcoin payment',
  dynamic: true,
  detect: (text) => {
    const target = parseLightningTarget(text);
    if (!target) return undefined;
    if (target.type === 'address') return target.address;
    // An LNURL or a profile as written, without `lightning:` / `nostr:` before it
    return text.trim().replace(/^(lightning|nostr):/i, '');
  },
};

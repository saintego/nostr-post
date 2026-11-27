# @nostr-post/plugin-lightning

Lightning payments for nostr-post: pay a Lightning address (`alice@getalby.com`), an LNURL or an
npub, as a NIP-57 zap or a plain invoice, with the browser's WebLN wallet or a QR code. The
`lightning` field plugin of the support panel (`<nostr-post-support>`, `@nostr-post/web`) and of any
manifest; works without the app registering anything.

## Main entry (no UI)

```ts
import { defaultPayDeps, requestPayment, resolvePayee } from '@nostr-post/plugin-lightning';

const deps = defaultPayDeps();
const payee = await resolvePayee('npub1…', undefined, deps); // the profile's lud16 / lud06
if (payee.success) {
  const payment = await requestPayment(payee.data, { amountSats: 21, comment: 'Thanks', zap: true }, deps);
  if (payment.success) showInvoice(payment.data.pr);
}
```

A payment: find the payee's Lightning (an npub's profile: `lud16`, else `lud06`), the service's
LNURL-pay parameters (LUD-06), then the invoice. It is a **zap** when the service allows Nostr
(`allowsNostr`, `nostrPubkey`), the payee's pubkey is known (an npub, or the `owner` of the text,
e.g. a support page's author) and the payer has a signer: the payer signs a zap request (kind 9734,
not published; it goes to the service), and the service publishes a zap receipt (kind 9735) when the
invoice is paid. Else a plain invoice, with the message as a LUD-12 comment. **Zaps are public**: a
receipt names the payer, the payee, the amount and the message.

| Export | Does |
| --- | --- |
| `parseLightningTarget(text)` | A Lightning address, LNURL (`lightning:` before them allowed) or npub/nprofile (`nostr:` allowed) as `LightningTarget`; undefined otherwise |
| `profileLightning(profile)` | A profile's Lightning: `lud16`, else `lud06` |
| `lightningAddressUrl(address)`, `payUrl(target)` | The LNURL-pay URL (`https://<domain>/.well-known/lnurlp/<user>`) |
| `payUri(url)` | `lightning:LNURL1…` of a pay URL: a QR any wallet pays without an amount set here |
| `fetchPayParams(url, fetchJson?)`, `parsePayParams(json)` | The service's parameters (`PayParams`: callback, range in msat, `commentAllowed`, `allowsNostr`, `nostrPubkey`); errors for `status: ERROR` and bad answers |
| `requestInvoice(params, amountMsat, { comment?, zapRequest?, lnurl?, fetchJson? })`, `invoiceUrl(…)`, `amountAllowed(…)` | An invoice (`{ pr, verify? }`); the amount checked against the range first |
| `checkSettled(verify, fetchJson?)` | Whether a LUD-21 verify link says the invoice was paid |
| `resolvePayee(text, owner, deps)`, `canZap(payee)` | A payee ready to pay (`Payee`: target, URL, parameters, pubkey, Lightning address) and whether it can be zapped |
| `requestPayment(payee, { amountSats, comment?, zap, address? }, deps)` | The invoice (`Payment`), with the signed zap request and the relays the receipt goes to (up to 6 of the payee's) for a zap. `address`: what is zapped besides the payee (`a` tag), e.g. the support page |
| `findZapReceipt(payee, payment, deps)` | The payment's zap receipt, if published yet |
| `buildZapRequest(options)`, `isZapReceiptFor(receipt, check)`, `zapReceiptFilter(recipient, since)` | NIP-57 pieces: the request to sign, the receipt checks (signed by the service's key, for the payee, invoice, request and amount) and the filter |
| `bolt11AmountMsat(invoice)` | An invoice's amount in msat, from its prefix |
| `hasWebln()`, `payWithWebln(invoice)` | The browser's WebLN wallet (e.g. Alby): pays and returns the preimage |
| `defaultPayDeps()`, `PayDeps` | Requests (`fetch`), profiles, relays, signing (only with a NIP-07/NIP-46 signer) and receipts from `@nostr-post/signer`; replace them for tests or other apps |
| `lightningPlugin`, `presetAmounts(field)`, `DEFAULT_AMOUNTS` | The field plugin and its preset amounts (`metadata.amounts`, default 21, 100, 1000, 5000 sats) |

Results are `Result` values; errors (`LightningError`) have a `code`: `invalid-target`,
`no-lightning`, `network`, `service`, `amount`, `bad-response`.

## `/web`

```ts
import '@nostr-post/plugin-lightning/web';

html`<np-lightning target="alice@getalby.com" .recipient=${ownerPubkey}></np-lightning>`;
```

- `<np-lightning>`: a card with the payee's LNURL as a QR code right away (`payUri(url)`:
  `lightning:LNURL1…`; any wallet pays it and asks for the amount; tap for full screen), then
  "Pay or zap a set amount": preset amounts and another amount, a message, "Send as a zap" (when possible),
  then the invoice: paid with WebLN when the browser has a wallet, else a QR code with "Open in
  wallet" (`@nostr-post/plugin-qr`), and "Waiting for the payment…" until the zap receipt (or the
  LUD-21 verify link) says it was paid. Properties: `target`, `recipient` (hex pubkey the target
  belongs to, so an address can be zapped), `address` (what is zapped, e.g. a page), `amounts`,
  `private-context` (in a private conversation: says the zap's receipt shows who paid whom),
  `messages`, `deps`. Parts: `card`, `button`, `input`.
- `<np-lightning-view>`, `<np-lightning-input>`: the `lightning` field (`.value`, `.field`;
  `metadata.multiple`, `metadata.amounts`). The view's cards are a grid; with `grid-items` they
  become items of the parent's grid. A page showing the field passes `.recipient` and
  `.address` to the view.
- Messages (`LightningMessages`, defaults `DEFAULT_LIGHTNING_MESSAGES`).

Paying from a wallet connected with NWC (Nostr Wallet Connect) is not here yet.

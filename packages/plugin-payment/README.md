# @nostr-post/plugin-payment

Payments for nostr-post: ways to pay as a **registry of payment methods**. Built in:
- **Lightning**: a Lightning address (`alice@getalby.com`), an LNURL or an npub, paid as a NIP-57
  zap or a plain invoice, with the browser's WebLN wallet or a QR code.
- **On-chain Bitcoin**: an address, as a QR code, with an amount when the payer sets one.

Apps add methods (`registerPaymentMethod`), e.g. Czech QR payments, SEPA EPC QR or Monero. Fields
use it with `uiPlugin: 'payment'`; `'lightning'` is the same plugin under its former name. It works
without the app registering anything.

## Payment methods

```ts
import { detectPayment, registerPaymentMethod } from '@nostr-post/plugin-payment';

detectPayment('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');
// { method: bitcoinMethod, value: 'bitcoin:bc1qw508…' }
detectPayment('Alice@GetAlby.com'); // { method: lightningMethod, value: 'alice@getalby.com' }
```

A method (`PaymentMethod`):
- `id`, a default `name`, `icon` and `description`;
- `detect(text)`: recognises its own form, also without a scheme, and gives the stored form;
- `display(value)`: what shows and copies, e.g. the bare address;
- for static methods, `qr(value, amountSats?)`: the QR payload, with the amount when the method
  takes one;
- `dynamic: true` for methods with their own flow (Lightning).

`detectPayment` tries the methods in order (Lightning, Bitcoin, then the ones apps add, or first
with `{ first: true }`), so `alice@getalby.com` in a payment field is a Lightning address.

| Export | Does |
| --- | --- |
| `detectPayment(text)`, `paymentMethods()`, `registerPaymentMethod(method, { first? })` | The method that recognises a value and its stored form; the methods in order; adding one (an id given again replaces it) |
| `bitcoinMethod`, `bitcoinAddress(text)`, `bitcoinUri(address, amountSats?)`, `btcAmount(sats)` | On-chain Bitcoin: stored as `bitcoin:<address>`. Segwit and taproot (`bc1…`) are checked fully (bech32/bech32m checksum), legacy (`1…`, `3…`) by format. BIP-21 URIs give the amount in BTC |
| `lightningMethod` | Lightning: a Lightning address, an LNURL or an npub (below) |
| `paymentPlugin`, `lightningPlugin`, `paymentTexts(value)`, `presetAmounts(field)`, `DEFAULT_AMOUNTS` | The field plugin (`payment`, and `lightning` under its former id): `validate` takes what a method recognises; preset amounts (`metadata.amounts`, default 21, 100, 1000, 5000 sats) |

## Lightning (no UI)

```ts
import { defaultPayDeps, requestPayment, resolvePayee } from '@nostr-post/plugin-payment';

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

Results are `Result` values; errors (`LightningError`) have a `code`: `invalid-target`,
`no-lightning`, `network`, `service`, `amount`, `bad-response`.

## `/web`

```ts
import '@nostr-post/plugin-payment/web';
```

Defines the elements below and registers the plugin as `payment` and `lightning` with
`<np-payment-input>` and `<np-payment-view>`. The composer and view load it by themselves.

- `<np-payment-view>`: each value as a card of its method, with the field's preset amounts.
  - A view passes the event's author (`.author`; also `.recipient`) and address (`.address`), so a
    Lightning address on someone's page zaps them.
  - The cards are a grid; with `grid-items` they become items of the parent's grid (a view's
    `viewLayout: 'cards'`).
- `<np-lightning>`: a Lightning card.
  - It shows the payee's LNURL as a QR code right away (`payUri(url)`: `lightning:LNURL1…`; any
    wallet pays it and asks for the amount; tap for full screen).
  - "Pay or zap a set amount" offers preset amounts and another amount, a message, and "Send as a
    zap" when possible.
  - Then the invoice: paid with WebLN when the browser has a wallet, else a QR code with "Open in
    wallet" (`@nostr-post/plugin-qr`), and "Waiting for the payment…" until the zap receipt (or the
    LUD-21 verify link) says it was paid.
  - Properties: `target`, `recipient`, `address`, `amounts`, `private-context` (in a private
    conversation: says the zap's receipt shows who paid whom), `messages`, `deps`.
  - Parts: `card`, `button`, `input`.
- `<np-payment-qr>`: a static method's card: its QR (the address under it, Copy, Open in wallet),
  and "Set an amount" for methods whose QR takes one. `.value`: a stored value.
- `<np-payment-input>`: one box per value ("Add" with `metadata.multiple`). Each box says what it
  recognised ("₿ Bitcoin ✓") and is stored in its method's form.
- Messages: `PaymentMessages` (defaults `DEFAULT_PAYMENT_MESSAGES`) includes Lightning's
  `LightningMessages`, and `methods` renames a method's name and line by id.

Paying from a wallet connected with NWC (Nostr Wallet Connect) is #445.

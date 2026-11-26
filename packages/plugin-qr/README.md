# @nostr-post/plugin-qr

QR codes for nostr-post: a `lightning:` invoice, a `bitcoin:` address, a `nostr:` link or an
`https:` link as a QR code, made locally (no requests, no image service). Used by
`@nostr-post/plugin-lightning` (invoices) and `@nostr-post/plugin-links` (Bitcoin addresses), and as
the `qr` field plugin.

## Main entry (no UI)

```ts
import { isQrPayload, qrSvg } from '@nostr-post/plugin-qr';

const svg = qrSvg('lightning:lnbc1…', { label: 'Invoice' });
if (svg.success) container.innerHTML = svg.data;
```

| Export | Does |
| --- | --- |
| `qrSvg(text, options?)` | The QR code as an SVG string (`Result`): one path of dark modules on a light square, scaled to any size. Options: `ecc` (`L`, `M` default, `Q`, `H`), `border` (light modules around it, default 2), `label` (accessible name), `dark` / `light` colors (default black on white: codes scan best that way, also in dark themes). Fails with `empty` or `too-long` |
| `qrMatrix(text, options?)` | The modules (`{ size, data: boolean[][] }`), to draw it yourself |
| `isQrPayload(text)`, `qrScheme(text)` | Whether text is a URI with one of `QR_SCHEMES` (`lightning:`, `bitcoin:`, `nostr:`, `https:`), and which |
| `qrPlugin`, `qrTexts(value)` | The field plugin (`validate`: text that fits in a QR code) and the texts of a field's value |

Encoding uses [`uqr`](https://github.com/unjs/uqr) (MIT, no dependencies).

## `/web`

```ts
import '@nostr-post/plugin-qr/web';

html`<np-qr .text=${'bitcoin:bc1q…'}></np-qr>`;
```

- `<np-qr>`: the code, the text under it (long ones, like invoices, shortened in the middle; Copy
  copies all of it), Copy (`<np-copy>` of `@nostr-post/ui`) and a link that opens it: "Open in
  wallet" for `lightning:`, `bitcoin:` and `nostr:` URIs, "Open link" for `https:` (new tab,
  `rel="noopener noreferrer"`). Properties: `text`, `show-text`, `show-link` (default true),
  `messages`. The image is a quarter rem a module, at least 12rem, so long invoices stay scannable.
  Parts: `image`, `text`, `button`, `link`.
- `<np-qr-view>`, `<np-qr-input>`: the `qr` field (`.value`, `.field`; `metadata.multiple` for
  several codes). The input shows each code under its text box.
- Messages (`QrMessages`, defaults `DEFAULT_QR_MESSAGES`): `qrCode`, `openInApp`, `openLink`,
  `tooLong`, `placeholder`, `add`, `remove`.

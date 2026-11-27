# @nostr-post/plugin-links

Support links for nostr-post, for people without Lightning or Nostr: links to tip pages (Buy Me a
Coffee and its `coff.ee` short links, GitHub Sponsors, Ko-fi, any `https:` link), on-chain Bitcoin
addresses and notes. The `links` field plugin of the support panel (`<nostr-post-support>`,
`@nostr-post/web`) and of any manifest.

## Main entry (no UI)

```ts
import { bitcoinAddress, supportLinks, supportSite } from '@nostr-post/plugin-links';

supportLinks([
  { type: 'link', value: 'https://ko-fi.com/alice' },
  { type: 'bitcoin', value: 'bitcoin:bc1q…?amount=0.001' },
  { type: 'link', value: 'http://insecure.example' }, // left out: only https
]);
supportSite('https://github.com/sponsors/alice'); // { label: 'GitHub Sponsors', icon: '💜' }
```

An entry (`SupportLink`) is `{ type: 'link' | 'bitcoin' | 'note', value, label?, icon?, description? }`
(`description`: the line under its name). Known sites (`SupportSite`) have a `label`, an `icon` and
their `brand` colours (`{ background, color }`), so their buttons look like the site's own.

| Export | Does |
| --- | --- |
| `supportLinks(value)` | The valid entries of a field's value (objects, their JSON, or plain links), in order |
| `checkSupportLink(entry)` | Checks an entry (`Result`): `https:` links only (no `http:`, `javascript:`…), a Bitcoin address, a note with text; `bitcoin:` URIs become their address |
| `parseSupportLink(raw)` | An entry from stored data, without checking its value |
| `bitcoinAddress(text)` | The address of text or a `bitcoin:` URI: segwit and taproot (`bc1…`) checked fully (bech32/bech32m checksum), legacy (`1…`, `3…`) by format; undefined otherwise |
| `bitcoinUri(address)` | `bitcoin:<address>`, for QR codes and wallets |
| `supportSite(link, sites?)`, `KNOWN_SUPPORT_SITES` | The tip site of a link (name and icon) by host, or host and the path's first part (`github.com/sponsors`) |
| `httpsUrl(link)`, `linkHost(link)` | A link as a URL when it's `https:`; its host without `www.` |
| `linksPlugin` | The plugin (field `type: 'object'`): `validate` names the first bad entry; a tag holds one entry as JSON |

Store the list in a NIP-78 post's content (`mapTo: { kind: 30078, target: 'content', path: 'links' }`),
where it stays a list of objects. Field metadata: `sites` adds tip sites (`{ "<host>": { label, icon } }`).

## `/web`

- `<np-links-view>`: the entries as cards of one shape (icon, name, a line under it):
  - a link: a button to the site in its own colours for known tip sites (Buy Me a Coffee's yellow,
    …), opened in a new tab with `rel="noopener noreferrer"`;
  - a Bitcoin address: its QR code right away (tap for full screen), the address, Copy and Open in
    wallet (`@nostr-post/plugin-qr`);
  - a note: its text.

  The cards are a grid; with `grid-items` they become items of the parent's grid (the support
  panel puts them next to the Lightning cards). Parts: `card`, `link`.
- `<np-links-input>`: each entry's type, value, icon, label and description, with Add and Remove;
  invalid entries are marked and left out of the value. Parts: `card`, `input`, `button`, `error`.
- Messages (`LinksMessages`, defaults `DEFAULT_LINKS_MESSAGES`).

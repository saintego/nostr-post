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

An entry (`SupportLink`) is `{ type: 'link' | 'bitcoin' | 'note', value, label?, icon? }`.

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

- `<np-links-view>`: links as buttons with the site's icon, name and host (new tab,
  `rel="noopener noreferrer"`), Bitcoin addresses with Copy and a QR code on request
  (`@nostr-post/plugin-qr`), notes as text. Parts: `list`, `link`, `text`, `button`.
- `<np-links-input>`: each entry's type, value, icon and label, with Add and Remove; invalid entries
  are marked and left out of the value. Parts: `card`, `input`, `button`, `error`.
- Messages (`LinksMessages`, defaults `DEFAULT_LINKS_MESSAGES`).

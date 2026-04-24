## 🎯 Roadmap

### Phase 1: Core Engine

- [x] Type definitions
- [x] allow user to choose between kind1 and nip-78 event if manifest allows that
- [x] allow updating NIP-78 (or any editable-event) posts created by a manifest when content changes; right now they use an empty `d` tag and overwrite each other
- [x] allow kind 1 comments to update the content of the main event, so users can edit a review inside our view while it still appears as a normal comment in other clients. Use a human-readable content format such as `update: {field}: {new value}` and parse it in our view to apply the change while preserving compatibility with existing clients.
- [x] manifest creator or feed should show the latest version of a user's manifest after updates, even when some relays still return older versions. Filter out stale manifests, and consider using our feed components for the user-manifest list so the logic and UI stay consistent.
- [x] manifest can inherit from other manifest
- [ ] add kind:30818 for objects that are used for review (beer, product, map venue detail)
- [ ] add multi-language support (i18n) for built-in plugins UI components(maybe Lingui.js style)
- [ ] add multi-language support (i18n) for manifest via NIP-78 or kind:30818, d = "{manifestId}:i18n:{locale}", we would need to address version in translations
- [ ] add style customization options for web components (CSS custom properties, theming)
- [ ] fix pwa example share image
- [ ] fix list plugin to use lists(nip-51?) instead of manifests
- [ ] User mention support: mention autocomplete, user tagging, and profile
- [ ] add link to library in web component footers for better discoverability
- [ ] Publish npm packages for each package (packages/\*) with CI, semantic
      versioning, and automated releases to the npm registry
      resolution (NIP-73 identity tags)
- [ ] add integrity check for bundle integrity="sha384-Base64EncodedHashOfYourFileHere"
- [ ] photo view(see photos of venue)
- [ ] search web component
- [ ] allow to share NIP-78 data to Kind 1 events (for better compatibility with existing clients)
- [ ] manifest definition in manifest, manifest UI editing tool as plugins

### Phase 2: Domain Scenarios (Planned)

- [x] Comments support (kind 1) with manifest presets, examples, and protocol-standard reply tags
- [ ] pool plugin
- [ ] Calendar events support (NIP-52) with agenda-oriented rendering
- [ ] calendar view
- [ ] P2P offers support (NIP-69) with filtered feed presets/views
- [ ] Zap support (NIP-57): zap requests/receipts with amount + payer views and filtering
- [ ] Add scenario manifests for:
  - offer creation (NIP-69)
  - offer confirmation messages (NIP-17 formatted payload)
  - deal closing flow events
  - review snapshots

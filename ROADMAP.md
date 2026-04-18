## 🎯 Roadmap

### Phase 1: Core Engine

- [x] Type definitions
- [x] allow user to choose between kind1 and nip-78 event if manifest allows that
- [ ] allow updating nip-78 events when content changes (currently they have empty d tag and override each other)
- [ ] manifest can inherit from other manifest
- [ ] add kind:30818 for object that are used for review(beer, product, map venue detail)
- [ ] add multi-language support (i18n) for built-in plugins UI components and manifest
- [ ] manifest creator should show latest version of user manifest when updated
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
- [ ] allow kind 1 comments to update content of main event (so user can update review in case they are using our view; in other clients it'd look like a comment)

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

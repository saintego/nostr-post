## 🎯 Roadmap

### Phase 1: Core Engine

- [x] Type definitions
- [x] allow user to choose between kind1 and nip-78 event if manifest allows that
- [ ] manifest can inherit from other manifest
- [ ] add multi-language support (i18n) for built-in plugins UI components and manifest
- [ ] allow updating nip-78 events when content changes (currently they are immutable after creation)
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

### Phase 2: Domain Scenarios (Planned)

- [x] Comments support (kind 1) with manifest presets, examples, and protocol-standard reply tags
- [ ] pool plugin
- [ ] Calendar events support (NIP-52) with agenda-oriented rendering
- [ ] P2P offers support (NIP-69) with filtered feed presets/views
- [ ] Zap support (NIP-57): zap requests/receipts with amount + payer views and filtering
- [ ] Add scenario manifests for:
  - offer creation (NIP-69)
  - offer confirmation messages (NIP-17 formatted payload)
  - deal closing flow events
  - review snapshots

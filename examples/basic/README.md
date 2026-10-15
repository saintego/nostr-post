# nostr-post Basic Example

A simple demo showing how to create Kind 1 Nostr posts using `@nostr-post/web` components with [nostr-shard-signer](https://github.com/saintego/nostr-shard-signer) sign-in.

## 🚀 Quick Start

```bash
# From the monorepo root
cd examples/basic

# Start the development server
pnpm dev   # optional: VITE_WEB3AUTH_CLIENT_ID=<your client id> pnpm dev
```

User sign-in uses [nostr-shard-signer](https://github.com/saintego/nostr-shard-signer).
Without a client ID it offers Nostr-only sign-in (NIP-07 extension or NIP-46 bunker such as Amber).
We recommend setting `VITE_WEB3AUTH_CLIENT_ID` to a Web3Auth client ID: it adds Google/Apple/X sign-in, so people
without a Nostr key can start too. Register it for your origin in the
[portal](https://saintego.github.io/nostr-shard-signer/portal/) (localhost cannot be registered).

The app will be available at `http://localhost:3000`

## 📱 Features

This example demonstrates:

- **Authentication** using [nostr-shard-signer](https://github.com/saintego/nostr-shard-signer) (Web3Auth social login, NIP-07 extension or NIP-46 bunker)
- **Post Creation** with `<nostr-post-composer>` Web Component
- **Post Viewing** with `<nostr-post-view>` Web Component
- **Search & Filter** functionality
- **Live Updates** when creating posts

**Try it:**

1. Click "Sign in" in the bottom-right corner
2. Write your post in the composer
3. Submit and see your post appear in the feed
4. Search through your posts
5. See the live preview update
6. Export your manifest JSON

## 🏗️ Architecture

### Web Components Used

```typescript
import '@nostr-post/web';

// Composer for creating posts
<nostr-post-composer
  manifest={myManifest}
  pubkey="..."
/>

// Viewer for displaying posts
<nostr-post-view
  event={nostrEvent}
  showTags={true}
  showKind={true}
/>
```

### Integration with nostr-shard-signer

```html
<script src="https://saintego.github.io/nostr-shard-signer/nostr-bridge.js"></script>
<script type="module">
  // Listen for auth events (replays the current state to new subscribers)
  NostrBridge.onAuthChange(({ loggedIn, pubkey }) => {
    if (loggedIn) {
      // User logged in: pubkey
    }
  });

  // Installs window.nostr, which the nostr-post components use for signing
  // clientId is optional: it adds Google/Apple/X sign-in
  await NostrBridge.init({ clientId: "YOUR_WEB3AUTH_CLIENT_ID" });
</script>
```

## 📝 Manifest Examples

### Simple Post (Kind 1)

```json
{
  "id": "simple-post-v1",
  "version": "1.0.0",
  "publishFormats": [
    { "id": "note", "label": "Note", "kinds": [1], "default": true }
  ],
  "fields": [
    {
      "id": "content",
      "type": "string",
      "uiPlugin": "textarea",
      "mapTo": { "kind": 1, "target": "content" },
      "required": true
    }
  ]
}
```

### Restaurant Review (Kind 1 + Kind 30078)

```json
{
  "id": "restaurant-review-v1",
  "version": "1.0.0",
  "publishFormats": [
    { "id": "hybrid", "label": "Hybrid", "kinds": [1, 30078], "default": true }
  ],
  "fields": [
    {
      "id": "reviewText",
      "type": "string",
      "uiPlugin": "markdown",
      "mapTo": { "kind": 1, "target": "content" },
      "required": true
    },
    {
      "id": "rating",
      "type": "number",
      "uiPlugin": "stars",
      "mapTo": { "kind": 1, "target": "tag", "tagName": "r" },
      "required": true
    },
    {
      "id": "venueName",
      "type": "string",
      "uiPlugin": "text",
      "mapTo": { "kind": 30078, "target": "content", "path": "venue.name" },
      "required": true
    }
  ]
}
```

## 🛠️ Development

### File Structure

```
examples/basic/
├── index.html              # Main app
├── manifest-creator.html   # Manifest creator tool
├── src/
│   ├── main.ts            # Main app logic
│   └── manifest-creator.ts # Manifest creator logic
├── package.json
└── vite.config.ts
```

### Adding Custom Manifests

1. Create your manifest JSON
2. Import it in `main.ts`
3. Set it on the composer:

```typescript
import myManifest from "./manifests/my-manifest.json";

const composer = document.getElementById("composer");
composer.manifest = myManifest;
```

### Customizing Styles

The Web Components use CSS variables for theming:

```css
nostr-post-composer {
  --nostr-post-primary: #8b5cf6;
  --nostr-post-primary-hover: #7c3aed;
  --nostr-post-bg: white;
  --nostr-post-border: #e5e7eb;
}
```

## 🔧 Troubleshooting

### Build Errors

Make sure to build the packages first:

```bash
# From monorepo root
pnpm build
```

### Sign-in Issues

If the sign-in widget doesn't load, check:

- If you set `VITE_WEB3AUTH_CLIENT_ID`: it is registered for this origin in the
  [portal](https://saintego.github.io/nostr-shard-signer/portal/) (localhost cannot be registered)
- Browser console for nostr-bridge errors
- Your internet connection

### Manifest Validation Errors

Common issues:

- Missing required fields (`id`, `version`, `fields`)
- Missing at least one `mapTo` target in field mappings
- Invalid kind numbers
- Missing `mapTo` configuration

Use the Manifest Creator tool to validate your manifests!

## 📚 Learn More

- [nostr-post Documentation](../../README.md)
- [Development Guide](../../DEVELOPMENT_GUIDE.md)
- [Manifest Examples](../../EXAMPLES.md)
- [nostr-shard-signer Docs](https://github.com/saintego/nostr-shard-signer)
- [Nostr NIPs](https://github.com/nostr-protocol/nips)

## 🤝 Contributing

Found a bug or want to add a feature? Check the main project's [Contributing Guidelines](../../DEVELOPMENT_GUIDE.md).

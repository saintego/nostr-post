# nostr-post Example App

This is a demo application showcasing the nostr-post ecosystem with two main features:

## 🚀 Quick Start

```bash
# From the monorepo root
cd examples/basic

# Install dependencies (if not already done)
pnpm install

# Start the development server
pnpm dev
```

The app will be available at `http://localhost:3000`

## 📱 Features

### 1. Main App (`/`)

A fully functional Nostr client that demonstrates:

- **Authentication** using [nostr-login](https://github.com/nostrband/nostr-login)
- **Post Creation** with `<nostr-post-composer>` Web Component
- **Post Viewing** with `<nostr-post-view>` Web Component
- **Search & Filter** functionality
- **Live Updates** when creating posts

**Try it:**
1. Click "Connect with Nostr" and sign in
2. Create a post using the composer
3. See your post appear in the feed
4. Search through your posts

### 2. Manifest Creator (`/manifest-creator.html`)

An interactive tool for designing and testing manifests:

- **Visual Builder** - Create manifests with a GUI
- **JSON Editor** - Edit manifest JSON directly
- **Examples** - Pre-built manifest templates
- **Live Preview** - See your form render in real-time
- **Export** - Download or copy your manifest

**Try it:**
1. Start with an example (Simple Post, Review, Article)
2. Customize fields and settings
3. See the live preview update
4. Export your manifest JSON

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

### Integration with nostr-login

```typescript
import 'nostr-login';

// Simple authentication
<nl-auth bunkers="nsec.app"></nl-auth>

// Listen for auth events
element.addEventListener('nlAuth', (e) => {
  if (e.detail.type === 'login') {
    // User logged in
  }
});
```

## 📝 Manifest Examples

### Simple Post (Kind 1)

```json
{
  "id": "simple-post-v1",
  "version": "1.0.0",
  "requiredKinds": [1],
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
  "requiredKinds": [1, 30078],
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
import myManifest from './manifests/my-manifest.json';

const composer = document.getElementById('composer');
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

### nostr-login Issues

If nostr-login doesn't load, check:
- Your internet connection
- Browser console for errors
- Try refreshing the page

### Manifest Validation Errors

Common issues:
- Missing required fields (`id`, `version`, `requiredKinds`)
- Invalid kind numbers
- Missing `mapTo` configuration

Use the Manifest Creator tool to validate your manifests!

## 📚 Learn More

- [nostr-post Documentation](../../README.md)
- [Development Guide](../../DEVELOPMENT_GUIDE.md)
- [Manifest Examples](../../EXAMPLES.md)
- [nostr-login Docs](https://github.com/nostrband/nostr-login)
- [Nostr NIPs](https://github.com/nostr-protocol/nips)

## 🤝 Contributing

Found a bug or want to add a feature? Check the main project's [Contributing Guidelines](../../DEVELOPMENT_GUIDE.md).

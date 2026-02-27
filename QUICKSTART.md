# Quick Start Guide

This guide will get you up and running with nostr-post in minutes. Choose your path based on your project setup.

## Table of Contents

1. [Web Components (HTML/Vanilla JS)](#1-web-components-htmlvanilla-js)
2. [React Project](#2-react-project)
3. [Next.js Project](#3-nextjs-project)
4. [Headless Usage (Core Only)](#4-headless-usage-core-only)
5. [Running Example Projects](#5-running-example-projects)

---

## 1. Web Components (HTML/Vanilla JS)

Perfect for any HTML page, works with any framework or no framework at all.

### Installation

```bash
npm install @nostr-post/web
# or
pnpm add @nostr-post/web

# Optional: install plugins
npm install @nostr-post/plugin-geo @nostr-post/plugin-media @nostr-post/plugin-markdown
```

### Important: Import Plugins

Plugins register when imported. Add them at the top of your script:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Nostr Post Example</title>
  <script type="module">
    // Import plugins FIRST
    import '@nostr-post/plugin-geo';
    import '@nostr-post/plugin-media';
    import '@nostr-post/plugin-markdown';
    import '@nostr-post/plugin-hashtag';
    import '@nostr-post/plugin-stars';
    
    // Then import components
    import '@nostr-post/web';
  </script>
</head>
<body>
  <h1>My Nostr App</h1>
  
  <!-- Composer for creating posts -->
  <nostr-post-composer></nostr-post-composer>
  
  <!-- Feed for viewing posts -->
  <nostr-post-feed kinds="1" limit="20"></nostr-post-feed>

  <script>
    const composer = document.querySelector('nostr-post-composer');
    composer.addEventListener('nostr-post-submit', (e) => {
      console.log('Published:', e.detail.events);
    });
  </script>
</body>
</html>
```

**See the full example:** [examples/basic](./examples/basic)

---

## 2. React Project

For React apps using Vite, Create React App, or similar setups.

### Installation

```bash
npm install @nostr-post/react
# or
pnpm add @nostr-post/react

# Install plugins
npm install @nostr-post/plugin-geo @nostr-post/plugin-media @nostr-post/plugin-markdown @nostr-post/plugin-hashtag @nostr-post/plugin-stars
```

### Important: Import Plugins

Plugins must be imported to register. Add at the top of your App:

```tsx
// App.tsx
import { NostrPostComposer, NostrPostFeed, useNostrAuth } from '@nostr-post/react';

// REQUIRED: Import plugins you want to use
import '@nostr-post/plugin-geo';
import '@nostr-post/plugin-media';
import '@nostr-post/plugin-markdown';
import '@nostr-post/plugin-hashtag';
import '@nostr-post/plugin-stars';

function App() {
  const { pubkey, login, logout, isLoading } = useNostrAuth();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>My Nostr App</h1>
      
      {!pubkey ? (
        <button onClick={login}>Login with Nostr</button>
      ) : (
        <>
          <button onClick={logout}>Logout</button>
          <p>Connected: {pubkey.slice(0, 8)}...</p>
          
          <NostrPostComposer 
            pubkey={pubkey}
            onPublish={(events) => console.log('Published!', events)}
          />
          
          <NostrPostFeed 
            authors={[pubkey]}
            kinds={[1]}
            limit={20}
          />
        </>
      )}
    </div>
  );
}

export default App;
```

### With Custom Manifest

```tsx
import { NostrPostComposer } from '@nostr-post/react';
import type { NostrPostManifest } from '@nostr-post/core/types';
import '@nostr-post/plugin-markdown';
import '@nostr-post/plugin-geo';
import '@nostr-post/plugin-media';

const articleManifest: NostrPostManifest = {
  id: "article-v1",
  version: "1.0.0",
  requiredKinds: [30023],  // Long-form article
  fields: [
    {
      id: "title",
      type: "string",
      mapTo: { kind: 30023, target: "title" },
      required: true,
      defaultValue: "Untitled Article",
    },
    {
      id: "content",
      type: "string",
      uiPlugin: "markdown",
      mapTo: { kind: 30023, target: "content" },
      required: true,
    },
    {
      id: "coverImage",
      type: "string",
      uiPlugin: "media",
      mapTo: { kind: 30023, target: "image" },
    },
    {
      id: "location",
      type: "string",
      uiPlugin: "geo",
      mapTo: { kind: 30023, target: "location-tag" },
    },
    {
      id: "draftNotes",
      type: "string",
      visibility: {
        edit: "visible",
        view: "hidden"  // Hidden from viewers
      },
      mapTo: { kind: 30023, target: "draft" },
    },
  ],
};

function ArticlePublisher({ pubkey }: { pubkey: string }) {
  return (
    <NostrPostComposer
      pubkey={pubkey}
      manifest={articleManifest}
      onPublish={(events) => alert('Article published!')}
    />
  );
}

export default ArticlePublisher;
```

### With Field Controls

```tsx
<NostrPostComposer
  pubkey={pubkey}
  manifest={manifest}
  excludeFields={["internal-notes", "admin-tag"]}  // Hide these fields
  readonlyFields={["author-name"]}                 // Allow view but not edit
  prefill={{
    "author-name": "Alice",
    "date-created": new Date().toISOString()
  }}
/>
```

**See the full example:** [examples/react-demo](./examples/react-demo)

---

## 3. Next.js Project

For Next.js apps using the App Router or Pages Router.

### Installation

```bash
npm install @nostr-post/react
npm install @nostr-post/plugin-geo @nostr-post/plugin-media @nostr-post/plugin-markdown @nostr-post/plugin-hashtag @nostr-post/plugin-stars
```

### App Router Setup (Next.js 13+)

```tsx
// app/layout.tsx
'use client';

import { ReactNode } from 'react';

// Import plugins ONCE at top level
import '@nostr-post/plugin-geo';
import '@nostr-post/plugin-media';
import '@nostr-post/plugin-markdown';
import '@nostr-post/plugin-hashtag';
import '@nostr-post/plugin-stars';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// app/page.tsx
'use client';

import { NostrPostComposer, NostrPostFeed, useNostrAuth } from '@nostr-post/react';

export default function Home() {
  const { pubkey, login, logout, isLoading } = useNostrAuth();

  if (isLoading) return <div>Loading...</div>;

  return (
    <main className="container mx-auto p-4">
      <h1>Nostr Post Demo</h1>
      
      {!pubkey ? (
        <button onClick={login}>Login with Nostr</button>
      ) : (
        <>
          <button onClick={logout}>Logout</button>
          
          <section className="my-8">
            <h2>Create a Post</h2>
            <NostrPostComposer pubkey={pubkey} />
          </section>
          
          <section className="my-8">
            <h2>Your Posts</h2>
            <NostrPostFeed authors={[pubkey]} kinds={[1]} limit={20} />
          </section>
        </>
      )}
    </main>
  );
}
```

**See the full example:** [examples/nextjs-demo](./examples/nextjs-demo)

---

## 4. Headless Usage (Core Only)

For server-side processing, custom UI, or non-browser environments.

### Installation

```bash
npm install @nostr-post/core
# or
pnpm add @nostr-post/core
```

### Basic Usage

```typescript
import { coordinateEvents, validateManifest } from "@nostr-post/core";
import type { NostrPostManifest } from "@nostr-post/core/types";

// 1. Define your manifest
const manifest: NostrPostManifest = {
  id: "simple-post-v1",
  version: "1.0.0",
  requiredKinds: [1],
  fields: [
    {
      id: "content",
      type: "string",
      mapTo: { kind: 1, target: "content" },
      required: true,
      defaultValue: "Type your post...",
    },
  ],
};

// 2. Validate manifest
const validation = validateManifest(manifest);
if (!validation.success) {
  throw new Error(`Invalid manifest: ${validation.error}`);
}

// 3. Coordinate events from form data
const result = coordinateEvents(manifest, {
  content: "Hello, Nostr!"
}, {
  pubkey: "your-public-key-hex",
  createdAt: Math.floor(Date.now() / 1000),
});

if (result.success) {
  const { events } = result.data;
  console.log("Generated events:", events);
  
  // Now sign and publish with your preferred library
  // (NDK, nostr-tools, etc.)
}
```

### With NIP-78 Manifest Linking

```typescript
const result = coordinateEvents(
  manifest,
  formData,
  {
    pubkey,
    createdAt: Math.floor(Date.now() / 1000),
    manifestRef: {
      kind: 30078,
      dTag: "my-manifest-v1"
    }
  }
);

if (result.success) {
  // events[0]: Kind 1 (social post)
  // events[1]: Kind 30078 (manifest definition)
  const [socialEvent, manifestEvent] = result.data.events;
}
```

---

## 5. Running Example Projects

### Build All Packages

```bash
# From the root directory
pnpm install
pnpm -r build
```

### Run in Watch Mode

```bash
pnpm -r dev

# Then visit:
# - http://localhost:5173 (basic example)
# - http://localhost:5174 (react-demo)
# - http://localhost:3000 (nextjs-demo)
# - http://localhost:3001 (manifest-creator tool)
```

### Building Individual Examples

```bash
# Basic example
cd examples/basic
pnpm dev

# React example
cd examples/react-demo
pnpm dev

# Next.js example
cd examples/nextjs-demo
pnpm dev

# Manifest Creator tool
cd tools/manifest-creator
pnpm dev
```

---

## 🚀 Common Patterns

### Pattern 1: Feed with Auto-Refresh

```tsx
import { useRef } from 'react';
import { NostrPostFeed } from '@nostr-post/react';

function MyFeed() {
  const feedRef = useRef<any>(null);

  const handlePublished = () => {
    feedRef.current?.refresh?.();
  };

  return (
    <div>
      <NostrPostComposer onPublish={handlePublished} />
      <NostrPostFeed ref={feedRef} authors={[pubkey]} />
    </div>
  );
}
```

### Pattern 2: Save Draft to LocalStorage

```tsx
const [draft, setDraft] = useState(() => {
  const saved = localStorage.getItem('draft');
  return saved ? JSON.parse(saved) : {};
});

<NostrPostComposer
  pubkey={pubkey}
  prefill={draft}
  onChange={(data) => {
    setDraft(data);
    localStorage.setItem('draft', JSON.stringify(data));
  }}
  onPublish={() => {
    localStorage.removeItem('draft');
  }}
/>
```

### Pattern 3: Field Visibility Controls

```tsx
const manifest: NostrPostManifest = {
  id: "post-v1",
  version: "1.0.0",
  requiredKinds: [1],
  fields: [
    {
      id: "public-content",
      type: "string",
      visibility: { edit: "visible", view: "visible" }
    },
    {
      id: "private-notes",
      type: "string",
      visibility: { edit: "visible", view: "hidden" }  // ← Hidden from viewers
    },
    {
      id: "author",
      type: "string",
      visibility: { edit: "readonly", view: "visible" } // ← Can't edit
    }
  ]
};
```

---

## 📚 Next Steps

- **[USAGE_GUIDE.md](./USAGE_GUIDE.md)** - Complete API reference
- **[EXAMPLES.md](./EXAMPLES.md)** - More code examples
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Design decisions
- **[PLUGINS.md](./PLUGINS.md)** - Create custom plugins

## 💡 Tips

1. **Always import plugins** - They register on import
2. **Use defaultValue** - Set field defaults in manifest
3. **Leverage visibility** - Control what users can see/edit
4. **Enable dark mode** - Use `dark` prop or `class="dark"` wrapper
5. **Check relays** - Ensure relay URLs are accessible
6. **Save drafts** - Use localStorage to prevent data loss

---

**Need help?** Check out the [examples](./examples) or open an issue on GitHub.

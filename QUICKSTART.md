# Quick Start Guide

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd nostr-post

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## Development

### Run the Example App

```bash
cd examples/basic
pnpm dev
```

Visit http://localhost:3000/ to see the demo with:

- **Main app**: Composer and viewer with nostr-login authentication
- **Manifest creator**: http://localhost:3000/manifest-creator.html for building manifests

### Build Individual Packages

```bash
# Build core (must be first)
cd packages/core
pnpm build

# Build web components
cd packages/web
pnpm build

# Build plugins
cd packages/plugins
pnpm build
```

### Development Workflow

```bash
# Watch mode for development
cd packages/core
pnpm dev  # TypeScript watch mode

# In another terminal, run the example
cd examples/basic
pnpm dev
```

## Project Structure

```
nostr-post/
├── packages/
│   ├── core/        # Headless logic (zero dependencies)
│   ├── web/         # Web Components (Lit)
│   └── plugins/     # Plugin system
├── examples/
│   └── basic/       # Demo app with nostr-login
├── pnpm-workspace.yaml
└── tsconfig.json
```

## TypeScript Configuration Note

The build system uses a specific order:

1. **@nostr-post/core** builds first, generating `.d.ts` files in `dist/`
2. **@nostr-post/web** references core's types via paths in `tsconfig.json`
3. **@nostr-post/plugins** also references core's built types

This ensures proper TypeScript module resolution across the monorepo.

## Common Commands

```bash
# Clean all build artifacts
pnpm clean

# Type check all packages
pnpm typecheck

# Format code with Biome
pnpm format

# Lint code
pnpm lint

# Build everything
pnpm build
```

## Testing the Components

Once the dev server is running, open your browser console and try:

```javascript
// Get the composer element
const composer = document.querySelector("nostr-post-composer");

// Listen for submit events
composer.addEventListener("nostr-post-submit", (e) => {
  console.log("Published events:", e.detail.events);
});
```

## Next Steps

- Explore the manifest creator at http://localhost:3000/manifest-creator.html
- Check out the [README.md](./README.md) for architecture details
- Look at [examples/basic/src/](./examples/basic/src/) for usage examples
- Build your own manifests and plugins!

# Tests

This directory contains the test suite for the nostr-post project, including unit tests and end-to-end (E2E) tests.

## Structure

```
tests/
├── e2e/                      # End-to-end integration tests
│   ├── manifest-workflow.test.ts  # Tests for manifest publishing and retrieval
│   └── plugin-integration.test.ts # Tests for plugin integration
├── helpers/                  # Test utilities and mocks
│   └── mock-relay.ts         # Mock Nostr relay for testing
├── vitest.config.ts          # Vitest configuration for E2E tests
└── tsconfig.json             # TypeScript configuration for tests
```

## Running Tests

### All Tests
```bash
pnpm test:all
```

### Unit Tests Only
```bash
# Run all package unit tests
pnpm test

# Run specific package tests
pnpm --filter @nostr-post/core test

# Watch mode
pnpm test:watch
```

### E2E Tests Only
```bash
# Run E2E tests
pnpm test:e2e

# Watch mode
pnpm test:e2e:watch
```

### Individual Package Tests
```bash
# Core package
cd packages/core && pnpm test

# Hashtag plugin
cd packages/plugin-hashtag && pnpm test

# Geo plugin
cd packages/plugin-geo && pnpm test
```

## Test Coverage

### Unit Tests

Each package has its own unit tests:

- **@nostr-post/core**: Tests for manifest validation, event coordination, NIP-78 utilities
  - `manifest.test.ts`: Manifest validation and utility functions
  - `coordinator.test.ts`: Event coordination and form data validation
  - `nip78.test.ts`: NIP-78 manifest storage utilities

- **@nostr-post/plugin-hashtag**: Tests for hashtag plugin
  - `core.test.ts`: Hashtag normalization, extraction, validation, serialization

- **@nostr-post/plugin-geo**: Tests for geo location plugin
  - `core.test.ts`: Geohash encoding/decoding, validation, formatting

### E2E Tests

End-to-end tests use a mock Nostr relay to simulate real-world workflows:

- **manifest-workflow.test.ts**: Full workflow tests
  - Publishing manifests to relay
  - Creating posts with manifest references
  - Multi-kind event bundles
  - Geohash prefix queries (NIP-52)
  - Hashtag queries
  - Parameterized replaceable events

- **plugin-integration.test.ts**: Plugin integration tests
  - Plugin validation workflows
  - Hashtag normalization in real posts
  - Geo coordinate encoding
  - Complex multi-plugin posts
  - Auto-extraction of hashtags from content
  - Plugin serialize/deserialize round-trips

## Mock Relay

The mock Nostr relay (`helpers/mock-relay.ts`) provides:

- Event storage and retrieval
- Filter-based queries
- Support for all NIPs implemented in the project
- Parameterized replaceable event handling
- Tag-based filtering (hashtags, geohash, etc.)

Example usage:
```typescript
import { MockNostrRelay, generateMockKeypair, mockSignEvent } from '../helpers/mock-relay';

const relay = new MockNostrRelay();
const keypair = generateMockKeypair();

// Publish an event
const unsignedEvent = { /* ... */ };
const signedEvent = mockSignEvent(unsignedEvent, keypair.privkey);
await relay.publish(signedEvent);

// Query events
const events = await relay.query([
  { kinds: [1], authors: [keypair.pubkey] }
]);
```

## Writing Tests

### Unit Tests

Unit tests should be colocated with the source files:

```typescript
// packages/core/src/example.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from './example';

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe('expected');
  });
});
```

### E2E Tests

E2E tests go in the `tests/e2e/` directory:

```typescript
// tests/e2e/my-workflow.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MockNostrRelay, generateMockKeypair } from '../helpers/mock-relay';

describe('My Workflow', () => {
  let relay: MockNostrRelay;
  let keypair: ReturnType<typeof generateMockKeypair>;

  beforeEach(() => {
    relay = new MockNostrRelay();
    keypair = generateMockKeypair();
  });

  it('should handle the workflow', async () => {
    // Test implementation
  });
});
```

## CI Integration

Tests are run automatically on:
- Pre-commit (via lefthook)
- Pull requests
- Main branch pushes

## Test Philosophy

1. **Unit tests** focus on individual functions and modules in isolation
2. **E2E tests** verify complete workflows with mocked external dependencies
3. Nostr relay interactions are always mocked for deterministic, fast tests
4. Tests should be independent and not rely on shared state
5. Use descriptive test names that explain the expected behavior

# Manifest Creator Tool

A visual tool for creating and testing nostr-post manifests.

**🌐 Live Demo:** https://saintego.github.io/nostr-post/manifest-creator/

## Features

- 📝 Visual manifest builder with form UI
- 🔍 Real-time JSON preview
- ✅ Manifest validation
- 💾 Import/Export manifests as JSON
- 🎨 Live field configuration
- 🔗 Automatic event coordination testing

## Usage

### Online

Visit the live demo at https://saintego.github.io/nostr-post/manifest-creator/

### Local Development

```bash
cd tools/manifest-creator
pnpm dev
```

Visit http://localhost:3000/ to access the tool.

## Testing

The manifest-creator includes comprehensive testing:

### Run Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Generate coverage report
pnpm test:coverage
```

### Test Structure

- **Unit Tests**: Located in `tests/unit/`
  - `examples.test.ts` - Validates example manifests
  - `FieldEditor.test.tsx` - Component tests for field editor

- **E2E Tests**: Located in `tests/e2e/`
  - `manifest-workflow.test.ts` - Complete manifest creation workflows
  - `nostr-publishing.test.ts` - Mock Nostr integration tests

All tests use mocked Nostr functionality to avoid requiring a real Nostr extension or relay connections.

## Creating a Manifest

1. **Add Fields**: Click "Add Field" and configure:
   - Field ID and type
   - UI plugin to use
   - Target event kind and location (content/tag)
   - Validation rules (required, options)

2. **Configure Metadata**: Set field-specific options like:
   - Star ratings: min/max values
   - Enums: available options
   - Geo: default location

3. **Preview**: See live JSON output as you build

4. **Export**: Copy the JSON manifest for use in your app

5. **Test**: The tool validates your manifest structure

## Example Manifests

The tool includes example manifests for:

- Simple text posts (Kind 1)
- Reviews with ratings
- Location-based posts
- Media posts with images

## Manifest Structure

```json
{
  "id": "my-manifest",
  "name": "My Post Type",
  "description": "Description of what this creates",
  "version": "1.0.0",
  "fields": [
    {
      "id": "title",
      "type": "string",
      "uiPlugin": "text",
      "mapTo": {
        "kind": 1,
        "target": "tag",
        "tagName": "title"
      },
      "required": true
    }
  ]
}
```

## Integration

Export your manifest and use it with `@nostr-post/web`:

```html
<nostr-post-composer></nostr-post-composer>
<script>
  const composer = document.querySelector("nostr-post-composer");
  composer.manifest = yourManifestJson;
</script>
```

/**
 * Manifest Creator Tool
 *
 * Interactive tool for creating and testing nostr-post manifests
 */

import '@nostr-post/web';
import type { NostrPostComposer } from '@nostr-post/web';
import type { NostrPostManifest, PostField, FieldType } from '@nostr-post/core/types';

// Example manifests
const examples: Record<string, NostrPostManifest> = {
  simple: {
    id: 'simple-post-v1',
    version: '1.0.0',
    requiredKinds: [1],
    fields: [
      {
        id: 'content',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 1, target: 'content' },
        required: true,
      },
    ],
    metadata: {
      name: 'Simple Post',
      description: 'A basic Nostr note (Kind 1)',
    },
  },
  review: {
    id: 'restaurant-review-v1',
    version: '1.0.0',
    requiredKinds: [1, 30078],
    fields: [
      {
        id: 'reviewText',
        type: 'string',
        uiPlugin: 'markdown',
        mapTo: { kind: 1, target: 'content' },
        required: true,
      },
      {
        id: 'rating',
        type: 'number',
        uiPlugin: 'stars',
        mapTo: { kind: 1, target: 'tag', tagName: 'r' },
        required: true,
      },
      {
        id: 'venueName',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30078, target: 'content', path: 'venue.name' },
        required: true,
      },
      {
        id: 'venueAddress',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30078, target: 'content', path: 'venue.address' },
      },
    ],
    metadata: {
      name: 'Restaurant Review',
      description: 'Structured restaurant reviews with ratings and venue data',
    },
  },
  article: {
    id: 'article-v1',
    version: '1.0.0',
    requiredKinds: [30023],
    fields: [
      {
        id: 'title',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 30023, target: 'tag', tagName: 'title' },
        required: true,
      },
      {
        id: 'summary',
        type: 'string',
        uiPlugin: 'textarea',
        mapTo: { kind: 30023, target: 'tag', tagName: 'summary' },
      },
      {
        id: 'content',
        type: 'string',
        uiPlugin: 'markdown',
        mapTo: { kind: 30023, target: 'content' },
        required: true,
      },
    ],
    metadata: {
      name: 'Article',
      description: 'Long-form content using NIP-23',
    },
  },
};

// Current manifest state
let currentManifest: Partial<NostrPostManifest> = {
  id: '',
  version: '1.0.0',
  requiredKinds: [1],
  fields: [],
  metadata: {},
};

/**
 * Initialize the application
 */
function init() {
  initTabs();
  initExamples();
  initFormInputs();
  initButtons();
  updatePreview();
}

/**
 * Initialize tab switching
 */
function initTabs() {
  // Editor tabs
  document.querySelectorAll('.tab[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      if (!tabName) return;

      // Update active state
      document.querySelectorAll('.tab[data-tab]').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      // Show corresponding content
      document.querySelectorAll('.tab-content').forEach((content) => {
        (content as HTMLElement).style.display = 'none';
      });
      const content = document.getElementById(`${tabName}-tab`);
      if (content) content.style.display = 'block';

      // Sync JSON editor
      if (tabName === 'json') {
        syncToJSONEditor();
      }
    });
  });

  // Preview tabs
  document.querySelectorAll('.tab[data-preview]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const previewName = tab.getAttribute('data-preview');
      if (!previewName) return;

      // Update active state
      document.querySelectorAll('.tab[data-preview]').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      // Show corresponding preview
      const formPreview = document.getElementById('form-preview');
      const codePreview = document.getElementById('code-preview');
      if (formPreview && codePreview) {
        formPreview.style.display = previewName === 'form' ? 'block' : 'none';
        codePreview.style.display = previewName === 'code' ? 'block' : 'none';
      }
    });
  });
}

/**
 * Initialize examples list
 */
function initExamples() {
  const examplesList = document.getElementById('examples-list');
  if (!examplesList) return;

  const examplesData = [
    { key: 'simple', title: 'Simple Post', desc: 'Basic Kind 1 note' },
    { key: 'review', title: 'Restaurant Review', desc: 'Multi-event review with ratings' },
    { key: 'article', title: 'Article', desc: 'Long-form content (NIP-23)' },
  ];

  for (const { key, title, desc } of examplesData) {
    const div = document.createElement('div');
    div.className = 'example-item';
    div.innerHTML = `
      <div class="example-title">${title}</div>
      <div class="example-desc">${desc}</div>
    `;
    div.addEventListener('click', () => loadExample(key));
    examplesList.appendChild(div);
  }
}

/**
 * Load an example manifest
 */
function loadExample(key: string) {
  const example = examples[key];
  if (!example) return;

  currentManifest = JSON.parse(JSON.stringify(example));
  syncFromManifest();
  updatePreview();

  // Switch to builder tab
  const builderTab = document.querySelector('.tab[data-tab="builder"]') as HTMLElement;
  if (builderTab) builderTab.click();
}

/**
 * Initialize form inputs
 */
function initFormInputs() {
  const inputs = {
    'manifest-id': (val: string) => {
      currentManifest.id = val;
    },
    'manifest-version': (val: string) => {
      currentManifest.version = val;
    },
    'manifest-name': (val: string) => {
      if (!currentManifest.metadata) currentManifest.metadata = {};
      currentManifest.metadata.name = val;
    },
    'manifest-description': (val: string) => {
      if (!currentManifest.metadata) currentManifest.metadata = {};
      currentManifest.metadata.description = val;
    },
    'manifest-kinds': (val: string) => {
      currentManifest.requiredKinds = val.split(',').map((k) => Number.parseInt(k.trim()));
    },
  };

  for (const [id, handler] of Object.entries(inputs)) {
    const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement;
    if (el) {
      el.addEventListener('input', () => {
        handler(el.value);
        updatePreview();
      });
    }
  }

  // Add field button
  const addFieldBtn = document.getElementById('add-field-btn');
  if (addFieldBtn) {
    addFieldBtn.addEventListener('click', (e) => {
      e.preventDefault();
      addField();
    });
  }
}

/**
 * Add a new field
 */
function addField() {
  const newField: PostField = {
    id: `field${(currentManifest.fields?.length || 0) + 1}`,
    type: 'string',
    uiPlugin: 'text',
    mapTo: { kind: 1, target: 'content' },
  };

  if (!currentManifest.fields) currentManifest.fields = [];
  currentManifest.fields.push(newField);
  renderFields();
  updatePreview();
}

/**
 * Render fields list
 */
function renderFields() {
  const fieldsList = document.getElementById('fields-list');
  if (!fieldsList) return;

  fieldsList.innerHTML = '';

  for (const [index, field] of (currentManifest.fields || []).entries()) {
    const div = document.createElement('div');
    div.className = 'field-item';
    div.innerHTML = `
      <div class="field-item-header">
        <span class="field-item-title">${field.id}</span>
        <button class="danger" data-index="${index}">Remove</button>
      </div>
      <div class="field-item-details">
        <div><strong>Type:</strong> ${field.type}</div>
        <div><strong>Plugin:</strong> ${field.uiPlugin}</div>
        <div><strong>Kind:</strong> ${field.mapTo.kind}</div>
        <div><strong>Target:</strong> ${field.mapTo.target}</div>
      </div>
    `;

    const removeBtn = div.querySelector('button');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        if (currentManifest.fields) {
          currentManifest.fields.splice(index, 1);
          renderFields();
          updatePreview();
        }
      });
    }

    fieldsList.appendChild(div);
  }
}

/**
 * Sync form inputs from current manifest
 */
function syncFromManifest() {
  (document.getElementById('manifest-id') as HTMLInputElement).value = currentManifest.id || '';
  (document.getElementById('manifest-version') as HTMLInputElement).value =
    currentManifest.version || '1.0.0';
  (document.getElementById('manifest-name') as HTMLInputElement).value =
    currentManifest.metadata?.name || '';
  (document.getElementById('manifest-description') as HTMLTextAreaElement).value =
    currentManifest.metadata?.description || '';
  (document.getElementById('manifest-kinds') as HTMLInputElement).value =
    currentManifest.requiredKinds?.join(', ') || '1';

  renderFields();
}

/**
 * Sync to JSON editor
 */
function syncToJSONEditor() {
  const jsonEditor = document.getElementById('json-editor') as HTMLTextAreaElement;
  if (jsonEditor) {
    jsonEditor.value = JSON.stringify(currentManifest, null, 2);
  }
}

/**
 * Initialize buttons
 */
function initButtons() {
  document.getElementById('clear-btn')?.addEventListener('click', () => {
    currentManifest = {
      id: '',
      version: '1.0.0',
      requiredKinds: [1],
      fields: [],
      metadata: {},
    };
    syncFromManifest();
    updatePreview();
  });

  document.getElementById('copy-btn')?.addEventListener('click', () => {
    const json = JSON.stringify(currentManifest, null, 2);
    navigator.clipboard.writeText(json);
    alert('Manifest JSON copied to clipboard!');
  });

  document.getElementById('download-btn')?.addEventListener('click', () => {
    const json = JSON.stringify(currentManifest, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentManifest.id || 'manifest'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('json-apply-btn')?.addEventListener('click', () => {
    const jsonEditor = document.getElementById('json-editor') as HTMLTextAreaElement;
    if (!jsonEditor) return;

    try {
      currentManifest = JSON.parse(jsonEditor.value);
      syncFromManifest();
      updatePreview();
      alert('Manifest applied successfully!');
    } catch (error) {
      alert('Invalid JSON: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  });
}

/**
 * Update the preview
 */
function updatePreview() {
  // Update form preview
  const composer = document.getElementById('preview-composer') as NostrPostComposer;
  if (composer && currentManifest.id && currentManifest.fields) {
    composer.manifest = currentManifest as NostrPostManifest;
  }

  // Update code preview
  const codeOutput = document.getElementById('code-output');
  if (codeOutput) {
    codeOutput.textContent = JSON.stringify(currentManifest, null, 2);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

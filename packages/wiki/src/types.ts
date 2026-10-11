import type { NostrPostManifest } from '@nostr-post/core/types';

/**
 * Template configuration for auto-generating the wiki event's title tag and
 * d-tag from form field values.
 *
 * Solves the NIP-54 namespace collision problem: a beer called "Bitcoin" and
 * a wiki article about Bitcoin would otherwise both produce d="bitcoin".
 * Using templates like `"{name}-(beer)"` the scoped d-tag becomes
 * "bitcoin-beer", which is unambiguous.
 *
 * Template syntax: `{fieldId}` is replaced with the field's current value.
 * Static text (prefixes, suffixes, parenthesised qualifiers) is preserved and
 * normalized alongside field values into the final d-tag.
 */
export interface WikiConfig {
  /**
   * Template for the `["title", ...]` tag.
   *
   * e.g. `"{name} (Beer)"` → title tag becomes "Bitcoin (Beer)"
   *
   * The {fieldId} tokens must match field IDs in the manifest. The raw value
   * the user types feeds this template; the rendered result is what is stored
   * on the Nostr event. When this is set, no field should have
   * `mapTo: { tagName: 'title' }` — the template is the sole source of the
   * title tag.
   */
  titleTemplate?: string;

  /**
   * Template for the `["d", ...]` tag.
   *
   * e.g. `"{name}-(beer)"` → normalized to "bitcoin-beer"
   *
   * If omitted but `titleTemplate` is present, the d-tag is derived from the
   * computed title via normalizeDTag (so "Bitcoin (Beer)" → "bitcoin-beer").
   * If neither template is present the existing field-based / manifest-id
   * fallback applies.
   */
  dTagTemplate?: string;

  /**
   * Links to external pages derived from the entity's data, shown next to the
   * links from its `i` tags. Derived when shown, never stored on the event.
   */
  links?: WikiLinkTemplate[];
}

/**
 * A link derived from an entity, e.g. a venue's BTC Map page:
 * `{ label: 'BTC Map', url: 'https://btcmap.org/merchant/{i:osm}', when: { field: 'bitcoin', equals: 'yes' } }`
 */
export interface WikiLinkTemplate {
  /** Link text, e.g. the site's name */
  label: string;
  /**
   * URL template: `{i:<namespace>}` is the entity's `i` tag value without that
   * prefix (`i:osm` → `node:123`), `{fieldId}` a field's value. The link is
   * left out when a placeholder has no value.
   */
  url: string;
  /** Show only when this field's value equals `equals` (case-insensitive) */
  when?: { field: string; equals: string };
}

/**
 * A `NostrPostManifest` extended with wiki-specific identity generation config.
 *
 * Use this type instead of `NostrPostManifest` for kind:30818 entity manifests
 * that need scoped d-tags to prevent naming collisions across entity categories.
 */
export interface WikiManifest extends NostrPostManifest {
  wikiConfig?: WikiConfig;
}

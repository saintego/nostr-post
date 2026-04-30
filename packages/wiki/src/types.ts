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

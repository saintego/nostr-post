/**
 * Lets plugins resolve entity manifests (`@nostr-post/plugins/entities`) without depending
 * on this package, e.g. the list field finding the lists of the venue it saves
 */

import { provideEntityManifests } from '@nostr-post/plugins/entities';
import { type EntityManifestRef, resolveEntityManifest } from './registry';

provideEntityManifests({ resolve: (ref) => resolveEntityManifest(ref as EntityManifestRef) });

/**
 * @nostr-post/core - Manifest validation and parsing
 *
 * Pure functions for validating and working with NostrPostManifest structures.
 * All functions are immutable and side-effect free.
 */
import type { NostrPostManifest, NostrTarget, PostField, Result, ValidationError } from './types';
/**
 * Validates that a NostrTarget is properly configured.
 */
export declare const validateNostrTarget: (target: NostrTarget) => Result<void, ValidationError>;
/**
 * Validates a single PostField definition.
 */
export declare const validatePostField: (field: PostField) => Result<void, ValidationError>;
/**
 * Validates an entire NostrPostManifest.
 */
export declare const validateManifest: (manifest: NostrPostManifest) => Result<void, ValidationError[]>;
/**
 * Gets all fields that map to a specific Nostr kind.
 */
export declare const getFieldsByKind: (manifest: NostrPostManifest, kind: number) => PostField[];
/**
 * Gets all unique Nostr kinds used in the manifest.
 */
export declare const getUsedKinds: (manifest: NostrPostManifest) => number[];
/**
 * Finds a field by its ID.
 */
export declare const findFieldById: (manifest: NostrPostManifest, fieldId: string) => PostField | undefined;
/**
 * Gets all required fields from the manifest.
 */
export declare const getRequiredFields: (manifest: NostrPostManifest) => PostField[];
//# sourceMappingURL=manifest.d.ts.map
/**
 * @nostr-post/core - EventCoordinator
 *
 * The EventCoordinator takes a Manifest and Form Data, then produces a Bundle
 * of unsigned events with cross-linking tags. This is the heart of the
 * "split-storage" system.
 *
 * Architecture: Pure functional approach using data transformation pipelines.
 */
import type { EventBundle, FormData, NostrPostManifest, Result, ValidationError } from './types';
/**
 * Configuration for event coordination.
 */
export interface CoordinatorConfig {
    pubkey?: string;
    createdAt?: number;
}
/**
 * Validates form data against a manifest.
 */
export declare const validateFormData: (manifest: NostrPostManifest, formData: FormData) => Result<void, ValidationError[]>;
/**
 * Coordinates the creation of a bundle of Nostr events from form data.
 *
 * This is the main entry point for the EventCoordinator.
 */
export declare const coordinateEvents: (manifest: NostrPostManifest, formData: FormData, config?: CoordinatorConfig) => Result<EventBundle, ValidationError[]>;
//# sourceMappingURL=coordinator.d.ts.map
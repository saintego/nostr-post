/**
 * Mock Nostr relay for E2E testing
 *
 * Simulates a Nostr relay with event storage, querying, and subscription support.
 */
import type { UnsignedNostrEvent } from '@nostr-post/core/types';

export interface SignedNostrEvent extends UnsignedNostrEvent {
  id: string;
  sig: string;
}

export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  '#d'?: string[];
  '#a'?: string[];
  '#t'?: string[];
  '#g'?: string[];
  since?: number;
  until?: number;
  limit?: number;
}

export type NostrRelayMessage =
  | ['EVENT', string, SignedNostrEvent]
  | ['EOSE', string]
  | ['OK', string, boolean, string]
  | ['NOTICE', string];

/**
 * Mock Nostr relay that stores events in memory
 */
export class MockNostrRelay {
  private events: Map<string, SignedNostrEvent> = new Map();
  private subscriptions: Map<string, NostrFilter[]> = new Map();

  /**
   * Publish an event to the relay
   */
  async publish(
    event: UnsignedNostrEvent
  ): Promise<{ success: boolean; id: string; message?: string }> {
    // Generate a mock event ID and signature
    const signedEvent: SignedNostrEvent = {
      ...event,
      id: this.generateEventId(event),
      sig: this.generateSignature(),
    };

    // Validate basic event structure
    if (!signedEvent.kind || signedEvent.kind < 0) {
      return { success: false, id: signedEvent.id, message: 'Invalid event kind' };
    }

    // Handle replaceable events (kinds 10000-19999 and 30000-39999)
    if (
      (signedEvent.kind >= 10000 && signedEvent.kind < 20000) ||
      (signedEvent.kind >= 30000 && signedEvent.kind < 40000)
    ) {
      // For parameterized replaceable events, check d-tag
      if (signedEvent.kind >= 30000 && signedEvent.kind < 40000) {
        const dTag = signedEvent.tags.find((t) => t[0] === 'd')?.[1] || '';
        const replaceKey = `${signedEvent.kind}:${signedEvent.pubkey}:${dTag}`;

        // Remove old event with same coordinates
        for (const [id, evt] of this.events.entries()) {
          if (evt.kind === signedEvent.kind && evt.pubkey === signedEvent.pubkey) {
            const existingDTag = evt.tags.find((t) => t[0] === 'd')?.[1] || '';
            if (existingDTag === dTag) {
              this.events.delete(id);
            }
          }
        }
      }
    }

    this.events.set(signedEvent.id, signedEvent);
    return { success: true, id: signedEvent.id };
  }

  /**
   * Query events matching filters
   */
  async query(filters: NostrFilter[]): Promise<SignedNostrEvent[]> {
    const results: SignedNostrEvent[] = [];

    for (const event of this.events.values()) {
      if (this.matchesFilters(event, filters)) {
        results.push(event);
      }
    }

    // Apply limit from first filter
    const limit = filters[0]?.limit;
    if (limit && results.length > limit) {
      return results.slice(0, limit);
    }

    return results;
  }

  /**
   * Create a subscription (returns matching events immediately)
   */
  async subscribe(subId: string, filters: NostrFilter[]): Promise<SignedNostrEvent[]> {
    this.subscriptions.set(subId, filters);
    return this.query(filters);
  }

  /**
   * Close a subscription
   */
  unsubscribe(subId: string): void {
    this.subscriptions.delete(subId);
  }

  /**
   * Clear all stored events
   */
  clear(): void {
    this.events.clear();
    this.subscriptions.clear();
  }

  /**
   * Get all stored events
   */
  getAllEvents(): SignedNostrEvent[] {
    return Array.from(this.events.values());
  }

  /**
   * Get event by ID
   */
  getEvent(id: string): SignedNostrEvent | undefined {
    return this.events.get(id);
  }

  /**
   * Check if event matches filters
   */
  private matchesFilters(event: SignedNostrEvent, filters: NostrFilter[]): boolean {
    return filters.some((filter) => this.matchesFilter(event, filter));
  }

  /**
   * Check if event matches a single filter
   */
  private matchesFilter(event: SignedNostrEvent, filter: NostrFilter): boolean {
    // Check IDs
    if (filter.ids && !filter.ids.includes(event.id)) {
      return false;
    }

    // Check authors
    if (filter.authors && !filter.authors.includes(event.pubkey)) {
      return false;
    }

    // Check kinds
    if (filter.kinds && !filter.kinds.includes(event.kind)) {
      return false;
    }

    // Check timestamps
    if (filter.since && event.created_at < filter.since) {
      return false;
    }

    if (filter.until && event.created_at > filter.until) {
      return false;
    }

    // Check tag filters
    for (const [key, values] of Object.entries(filter)) {
      if (key.startsWith('#')) {
        const tagName = key.slice(1);
        const eventTags = event.tags.filter((t) => t[0] === tagName).map((t) => t[1]);
        if (!values?.some((v) => eventTags.includes(v))) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Generate a mock event ID
   */
  private generateEventId(event: UnsignedNostrEvent): string {
    // Simple hash-like mock ID
    const str = JSON.stringify(event);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  /**
   * Generate a mock signature
   */
  private generateSignature(): string {
    return 'mock_signature_' + Math.random().toString(36).substring(2);
  }
}

/**
 * Helper to sign events (mock implementation)
 */
export function mockSignEvent(event: UnsignedNostrEvent, privateKey: string): SignedNostrEvent {
  const relay = new MockNostrRelay();
  return {
    ...event,
    id: (relay as any).generateEventId(event),
    sig: `sig_${privateKey.slice(0, 8)}`,
  };
}

/**
 * Helper to generate mock keypair
 */
export function generateMockKeypair(): { pubkey: string; privkey: string } {
  const rand = Math.random().toString(36).substring(2);
  return {
    pubkey: 'pubkey_' + rand.padEnd(56, '0'),
    privkey: 'privkey_' + rand.padEnd(56, '0'),
  };
}

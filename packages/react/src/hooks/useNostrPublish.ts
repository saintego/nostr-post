/**
 * @nostr-post/react - useNostrPublish hook
 *
 * Handles signing and publishing Nostr events
 */

import { coordinateEvents } from '@nostr-post/core/coordinator';
import {
  DEFAULT_KIND1_MANIFEST,
  type FormData,
  type NostrPostManifest,
} from '@nostr-post/core/types';
import { useCallback, useState } from 'react';
import { DEFAULT_RELAYS, type SignedEvent, getPublicKey, signAndPublish } from '../signer';

export interface UseNostrPublishOptions {
  manifest?: NostrPostManifest;
  relays?: string[];
  onSuccess?: (events: SignedEvent[]) => void;
  onError?: (error: Error) => void;
}

export interface UseNostrPublishReturn {
  publish: (formData: FormData) => Promise<SignedEvent[]>;
  publishContent: (content: string) => Promise<SignedEvent>;
  isPublishing: boolean;
  error: string | null;
}

/**
 * Hook for publishing Nostr events
 *
 * @example
 * ```tsx
 * function Composer() {
 *   const { publishContent, isPublishing } = useNostrPublish();
 *   const [content, setContent] = useState('');
 *
 *   const handleSubmit = async () => {
 *     await publishContent(content);
 *     setContent('');
 *   };
 *
 *   return (
 *     <div>
 *       <textarea value={content} onChange={e => setContent(e.target.value)} />
 *       <button onClick={handleSubmit} disabled={isPublishing}>
 *         {isPublishing ? 'Publishing...' : 'Post'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useNostrPublish(options: UseNostrPublishOptions = {}): UseNostrPublishReturn {
  const {
    manifest = DEFAULT_KIND1_MANIFEST,
    relays = DEFAULT_RELAYS,
    onSuccess,
    onError,
  } = options;

  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publish = useCallback(
    async (formData: FormData): Promise<SignedEvent[]> => {
      setIsPublishing(true);
      setError(null);

      try {
        const pubkey = await getPublicKey();

        const result = coordinateEvents(manifest, formData, {
          pubkey,
          createdAt: Math.floor(Date.now() / 1000),
        });

        if (!result.success) {
          const errorMsg = result.error.map((e) => e.message).join(', ');
          throw new Error(errorMsg);
        }

        const signedEvents: SignedEvent[] = [];

        for (const unsignedEvent of result.data.events) {
          const { signedEvent, publishResults } = await signAndPublish(unsignedEvent, relays);

          if (publishResults.success === 0) {
            throw new Error('Failed to publish to any relay');
          }

          signedEvents.push(signedEvent);
        }

        onSuccess?.(signedEvents);
        return signedEvents;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Unknown error');
        setError(errorObj.message);
        onError?.(errorObj);
        throw errorObj;
      } finally {
        setIsPublishing(false);
      }
    },
    [manifest, relays, onSuccess, onError]
  );

  const publishContent = useCallback(
    async (content: string): Promise<SignedEvent> => {
      const events = await publish({ content });
      return events[0];
    },
    [publish]
  );

  return {
    publish,
    publishContent,
    isPublishing,
    error,
  };
}

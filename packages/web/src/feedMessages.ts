/**
 * User-facing text of <nostr-post-feed>, with English defaults. Apps override any of it
 * through the feed's `messages` property (e.g. translations).
 */
export interface FeedMessages {
  loading: string;
  empty: string;
}

export const DEFAULT_FEED_MESSAGES: FeedMessages = {
  loading: 'Loading...',
  empty: 'No posts yet',
};

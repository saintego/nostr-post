// @vitest-environment happy-dom
import { html, render } from 'lit';
import { describe, expect, it } from 'vitest';
import { type FeedAgendaOptions, renderFeedAgenda } from './feedAgenda';
import { DEFAULT_FEED_MESSAGES } from './feedMessages';
import type { FeedThread } from './feedStandard';
import type { FeedThreadContext } from './feedThread';

const thread = (d: string, start: string): FeedThread => ({
  root: {
    id: d,
    pubkey: 'pk',
    kind: 31922,
    created_at: 1,
    content: '',
    tags: [
      ['d', d],
      ['start', start],
    ],
    sig: 's',
  },
  replies: [],
  reactions: [],
});

const ctx: FeedThreadContext = {
  displayName: (pubkey) => pubkey,
  renderEventActions: () => html``,
  onCommentPublished: () => {},
};

const october = { from: '2026-10-01', days: 7, tzid: 'UTC' };
const november = { from: '2026-11-01', days: 7, tzid: 'UTC' };

const show = (threads: FeedThread[], options: Partial<FeedAgendaOptions>) => {
  const container = document.createElement('div');
  render(
    renderFeedAgenda(threads, ctx, {
      window: october,
      shownWindow: october,
      loading: false,
      messages: DEFAULT_FEED_MESSAGES,
      onMove: () => {},
      ...options,
    }),
    container
  );
  return {
    range: container.querySelector('.agenda-range')?.textContent ?? '',
    status: container.querySelector('.agenda-loading')?.textContent?.trim(),
    days: [...container.querySelectorAll('.agenda-date')].length,
    stale: container.querySelector('.agenda-days')?.classList.contains('stale'),
    busy: container.querySelector('.agenda-days')?.getAttribute('aria-busy'),
    empty: container.querySelector('.empty')?.textContent,
  };
};

describe('renderFeedAgenda', () => {
  it("keeps the shown window's days while the next window loads", () => {
    const loaded = show([thread('a', '2026-10-02')], {});
    const moving = show([thread('a', '2026-10-02')], { window: november, loading: true });

    expect(loaded).toMatchObject({ days: 1, stale: false, busy: 'false', status: '' });
    expect(moving).toMatchObject({ days: 1, stale: true, busy: 'true', status: 'Loading...' });
    // The buttons already show the window being loaded
    expect(moving.range).not.toBe(loaded.range);
  });

  it('shows the empty message only once the window has loaded', () => {
    expect(show([], { shownWindow: undefined, loading: true })).toMatchObject({
      days: 0,
      empty: undefined,
      status: 'Loading...',
    });
    expect(show([], {}).empty).toBe(DEFAULT_FEED_MESSAGES.emptyAgenda);
  });
});

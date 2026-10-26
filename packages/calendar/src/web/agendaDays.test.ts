// @vitest-environment happy-dom
import type { FeedThread, FeedThreadContext } from '@nostr-post/web';
import { html } from 'lit';
import { describe, expect, it } from 'vitest';
import './agendaDays';
import { DEFAULT_AGENDA_MESSAGES } from './agendaMessages';

const thread = (d: string, start: string): FeedThread => ({
  root: {
    id: d,
    pubkey: 'pk',
    kind: 31922,
    created_at: 1,
    content: '',
    tags: [
      ['d', d],
      ['title', d],
      ['start', start],
    ],
    sig: 's',
  },
  replies: [],
  reactions: [],
});

// Only a built-in field: the views have no plugins to load
const ctx: FeedThreadContext = {
  manifest: {
    id: 'test',
    version: '1',
    fields: [
      {
        id: 'title',
        type: 'string',
        uiPlugin: 'text',
        mapTo: { kind: 31922, target: 'tag', tagName: 'title' },
      },
    ],
  },
  displayName: (pubkey) => pubkey,
  renderEventActions: () => html``,
  onCommentPublished: () => {},
};

const october = { from: '2026-10-01', days: 31, tzid: 'UTC' };

const show = async (threads: FeedThread[], props: Record<string, unknown> = {}) => {
  const days = document.createElement('nostr-calendar-days');
  Object.assign(days, { threads, ctx, window: october, ...props });
  document.body.appendChild(days);
  await days.updateComplete;
  const root = days.shadowRoot;
  return {
    status: root?.querySelector('.agenda-loading')?.textContent?.trim(),
    days: [...(root?.querySelectorAll('.agenda-day') ?? [])].map(
      (d) => (d as HTMLElement).dataset.date
    ),
    stale: root?.querySelector('.agenda-days')?.classList.contains('stale'),
    busy: root?.querySelector('.agenda-days')?.getAttribute('aria-busy'),
    empty: root?.querySelector('.empty')?.textContent,
    gridDays: [...(root?.querySelectorAll('.month-grid .day') ?? [])].length,
  };
};

describe('<nostr-calendar-days>', () => {
  it('groups the posts by day', async () => {
    const shown = await show([thread('b', '2026-10-05'), thread('a', '2026-10-02')]);
    expect(shown).toMatchObject({
      days: ['2026-10-02', '2026-10-05'],
      stale: false,
      busy: 'false',
      status: '',
    });
  });

  it("keeps the loaded window's days, dimmed, while the next window loads", async () => {
    expect(await show([thread('a', '2026-10-02')], { loading: true })).toMatchObject({
      days: ['2026-10-02'],
      stale: true,
      busy: 'true',
      status: 'Loading...',
    });
  });

  it('shows the empty message only once the window has loaded', async () => {
    expect((await show([], { loading: true })).empty).toBeUndefined();
    expect((await show([])).empty).toBe(DEFAULT_AGENDA_MESSAGES.empty);
  });

  it('shows the month grid in month view', async () => {
    expect((await show([thread('a', '2026-10-02')], { month: true })).gridDays).toBe(1);
  });
});

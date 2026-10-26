/**
 * @nostr-post/plugin-date - <np-calendar-save>
 *
 * "Add to calendar" for a calendar event (`target`: its address): the signed-in user's
 * calendars (kind 31924), to add it to or remove it from each, or to start a new calendar
 * with it. It is plugin-list's <np-list-save> with calendars instead of bookmark lists.
 */

import { CALENDAR_LISTS } from '@nostr-post/plugin-list';
import { DEFAULT_LIST_MESSAGES, type ListMessages, NpListSave } from '@nostr-post/plugin-list/web';
import { customElement } from 'lit/decorators.js';
import { DEFAULT_CALENDAR_SAVE_MESSAGES } from './calendarMessages';

@customElement('np-calendar-save')
export class NpCalendarSave extends NpListSave {
  constructor() {
    super();
    this.listKind = CALENDAR_LISTS;
  }

  override get _m(): ListMessages {
    return { ...DEFAULT_LIST_MESSAGES, ...DEFAULT_CALENDAR_SAVE_MESSAGES, ...this.messages };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-calendar-save': NpCalendarSave;
  }
}

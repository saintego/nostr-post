/**
 * @nostr-post/plugin-date - NIP-52 calendar event manifest
 *
 * One manifest for both calendar event kinds: its publish formats pick all-day (31922)
 * or timed (31923), and the date field writes the matching `start`/`end` tags.
 */

import type { NostrPostManifest, NostrTarget } from '@nostr-post/core/types';
import { ALL_DAY_EVENT_KIND, TIMED_EVENT_KIND } from '@nostr-post/plugin-date';

const bothKinds = (target: Omit<NostrTarget, 'kind'>): NostrTarget[] => [
  { kind: ALL_DAY_EVENT_KIND, ...target },
  { kind: TIMED_EVENT_KIND, ...target },
];

export const CALENDAR_EVENT_MANIFEST: NostrPostManifest = {
  id: 'calendar-event-v1',
  version: '1.0.0',
  publishFormats: [
    {
      id: 'all-day',
      label: 'All-day',
      description: 'Takes whole days, e.g. a festival or a holiday (kind 31922)',
      kinds: [ALL_DAY_EVENT_KIND],
      default: true,
      userSelectable: true,
    },
    {
      id: 'timed',
      label: 'Timed',
      description: 'Starts at a time of day, in a time zone (kind 31923)',
      kinds: [TIMED_EVENT_KIND],
      userSelectable: true,
    },
  ],
  fields: [
    {
      id: 'title',
      type: 'string',
      uiPlugin: 'text',
      mapTo: bothKinds({ target: 'tag', tagName: 'title' }),
      required: true,
      metadata: { label: 'Title', description: 'Name of the event' },
    },
    {
      id: 'when',
      type: 'date',
      uiPlugin: 'date',
      mapTo: bothKinds({ target: 'tag', tagName: 'start' }),
      required: true,
      metadata: {
        label: 'When',
        description: 'Start, and optionally end; all-day events take the last day as the end',
      },
    },
    {
      id: 'location',
      type: 'geo',
      uiPlugin: 'venue',
      // The venue's geohash (`g`) plus its address as `location`, as NIP-52 has them
      mapTo: bothKinds({ target: 'tag', tagName: 'g' }),
      metadata: {
        label: 'Location',
        description: 'Where it takes place: search OpenStreetMap',
        providers: ['osm'],
      },
    },
    {
      id: 'place',
      type: 'string',
      uiPlugin: 'text',
      // NIP-52 `location` is free text: a room, an address without an OpenStreetMap place, "Online"
      mapTo: bothKinds({ target: 'tag', tagName: 'location' }),
      metadata: {
        label: 'Place details',
        description: 'A room or address, or "Online"; with or without a location above',
      },
    },
    {
      id: 'link',
      type: 'string',
      uiPlugin: 'text',
      // NIP-52 `r`: links to web pages, video calls, recordings
      mapTo: bothKinds({ target: 'tag', tagName: 'r' }),
      metadata: {
        label: 'Link',
        description: 'A video call for online events, tickets or the event page',
        placeholder: 'https://',
      },
    },
    {
      id: 'participants',
      type: 'profile',
      uiPlugin: 'profile',
      // NIP-52: `["p", <pubkey>, <relay>, <role>]`
      mapTo: bothKinds({ target: 'tag', tagName: 'p' }),
      metadata: {
        label: 'Participants',
        description: 'People taking part, e.g. hosts and speakers: search by name or paste an npub',
        roles: ['host', 'speaker', 'organizer', 'performer', 'participant'],
        expandable: true,
      },
    },
    {
      id: 'description',
      type: 'string',
      uiPlugin: 'textarea',
      mapTo: bothKinds({ target: 'content' }),
      metadata: { label: 'Description', description: 'What the event is about' },
    },
    {
      id: 'summary',
      type: 'string',
      uiPlugin: 'text',
      mapTo: bothKinds({ target: 'tag', tagName: 'summary' }),
      metadata: {
        label: 'Summary',
        description: 'One line about the event, shown in lists',
        expandable: true,
      },
    },
    {
      id: 'image',
      type: 'string',
      uiPlugin: 'media',
      mapTo: bothKinds({ target: 'tag', tagName: 'image' }),
      metadata: {
        label: 'Image',
        description: 'A picture for the event',
        accept: ['image/*'],
        maxFiles: 1,
        expandable: true,
      },
    },
    {
      id: 'tags',
      type: 'string',
      uiPlugin: 'hashtag',
      attachTo: 'description',
      mapTo: bothKinds({ target: 'tag', tagName: 't' }),
      metadata: { label: 'Tags', description: 'Topics, so people find the event' },
    },
  ],
  metadata: {
    name: 'Calendar event',
    description:
      'A NIP-52 calendar event: all-day (kind 31922) or at a time (kind 31923), with location, description, image and tags',
  },
};

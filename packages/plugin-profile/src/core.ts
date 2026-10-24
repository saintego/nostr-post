/**
 * @nostr-post/plugin-profile - Core
 *
 * A people field: who takes part, each with an optional role. Written as `p` tags,
 * `["p", <pubkey>, <relay hint>, <role>]` (NIP-52 event participants; without a role, a plain
 * mention). No DOM dependencies — safe for SSR/Node.
 */

import { decodeProfile, encodeNpub } from '@nostr-post/core/nip19';
import type {
  NostrUIPlugin,
  PostField,
  Result,
  TextCompletion,
  ValidationError,
} from '@nostr-post/plugins/types';
import { profileName, searchProfiles } from './search';

/** A person in a people field */
export interface Person {
  /** Hex public key */
  pubkey: string;
  /** What they do, e.g. `speaker` or `host` */
  role?: string;
  /** A relay that has their profile */
  relay?: string;
}

const HEX_PUBKEY = /^[0-9a-f]{64}$/;

const isPerson = (value: unknown): value is Person =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'pubkey') === 'string' &&
  HEX_PUBKEY.test(Reflect.get(value, 'pubkey'));

/** The people in a field's value (a person or a list); anything else is left out */
export const peopleOf = (value: unknown): Person[] =>
  (Array.isArray(value) ? value : [value]).filter(isPerson);

/**
 * The person someone typed or pasted: an `npub`, an `nprofile` (with its first relay hint), a
 * hex key, or one of those after `nostr:`; undefined for anything else (e.g. a name to search)
 */
export const personFromText = (text: string): Person | undefined => {
  const trimmed = text.trim().replace(/^nostr:/, '');
  if (HEX_PUBKEY.test(trimmed.toLowerCase())) return { pubkey: trimmed.toLowerCase() };
  const pointer = decodeProfile(trimmed);
  if (!pointer) return undefined;
  const [relay] = pointer.relays;
  return relay ? { pubkey: pointer.pubkey, relay } : { pubkey: pointer.pubkey };
};

/** The roles a field offers (`metadata.roles`), e.g. `['host', 'speaker']` */
export const fieldRoles = (field: PostField | undefined): string[] => {
  const roles = field?.metadata?.roles;
  return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === 'string') : [];
};

/** A person's `p` tag: relay and role only as far as needed */
export const personTag = (person: Person): [string, ...string[]] => {
  if (person.role) return ['p', person.pubkey, person.relay ?? '', person.role];
  return person.relay ? ['p', person.pubkey, person.relay] : ['p', person.pubkey];
};

/** The people in an event's `p` tags, each once (its first tag) */
export const peopleFromTags = (tags: string[][], tagName = 'p'): Person[] => {
  const seen = new Set<string>();
  const people: Person[] = [];
  for (const [name, pubkey, relay, role] of tags) {
    if (name !== tagName || !pubkey || !HEX_PUBKEY.test(pubkey) || seen.has(pubkey)) continue;
    seen.add(pubkey);
    people.push({ pubkey, ...(relay ? { relay } : {}), ...(role ? { role } : {}) });
  }
  return people;
};

/** `people` with `person` added (or its role updated, when they're already there) */
export const withPerson = (people: Person[], person: Person): Person[] =>
  people.some((p) => p.pubkey === person.pubkey)
    ? people.map((p) => (p.pubkey === person.pubkey ? { ...p, ...person } : p))
    : [...people, person];

export const withoutPerson = (people: Person[], pubkey: string): Person[] =>
  people.filter((p) => p.pubkey !== pubkey);

/** The people mentioned in a text: its `nostr:npub…` and `nostr:nprofile…` references */
export const mentionsIn = (text: string): Person[] => {
  const people: Person[] = [];
  for (const [, entity = ''] of text.matchAll(/nostr:((?:npub1|nprofile1)[02-9ac-hj-np-z]+)/gi)) {
    const person = personFromText(entity);
    if (person && !people.some((p) => p.pubkey === person.pubkey)) people.push(person);
  }
  return people;
};

/** A mention completion: the profile's name, inserting its `nostr:npub…` */
export const mentionCompletion = (
  pubkey: string,
  profile: { name?: string; display_name?: string; picture?: string; nip05?: string }
): TextCompletion | undefined => {
  const npub = encodeNpub(pubkey);
  if (!npub) return undefined;
  return {
    label: profileName(pubkey, profile),
    insert: `nostr:${npub}`,
    ...(profile.nip05 ? { detail: profile.nip05 } : {}),
    ...(profile.picture ? { image: profile.picture } : {}),
  };
};

const searchRelaysOf = (field: PostField): string[] | undefined => {
  const relays = field.metadata?.searchRelays;
  return Array.isArray(relays)
    ? relays.filter((r): r is string => typeof r === 'string')
    : undefined;
};

const invalid = (field: PostField, message: string, code: string) => ({
  success: false as const,
  error: { field: field.id, message, code },
});

// ── Plugin definition ───────────────────────────────────────────────

export const profilePlugin: NostrUIPlugin = {
  id: 'profile',
  type: 'profile',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    const items = Array.isArray(value) ? value : [value];
    if (!items.every(isPerson))
      return invalid(field, 'Pick people from the list', 'INVALID_PERSON');
    const max = field.metadata?.max;
    if (typeof max === 'number' && items.length > max) {
      return invalid(field, `At most ${max} people`, 'TOO_MANY_PEOPLE');
    }
    return { success: true, data: undefined };
  },

  formatValue: (value: unknown): string =>
    peopleOf(value)
      .map((p) => (p.role ? `${p.pubkey.slice(0, 8)} (${p.role})` : p.pubkey.slice(0, 8)))
      .join(', '),

  /** The tags come whole from extraTags (relay and role need more than a value) */
  serializeValue: (): string => '',

  extraTags: (value: unknown): [string, ...string[]][] => peopleOf(value).map(personTag),

  /**
   * Attached to a text field (`attachTo`): typing `@` and a name searches profiles and
   * inserts the picked one as `nostr:npub…` (NIP-27)
   */
  textareaCompletion: {
    trigger: '@',
    search: async (query: string, field: PostField): Promise<TextCompletion[]> => {
      const found = await searchProfiles(query, { relays: searchRelaysOf(field) });
      return found.flatMap(({ pubkey, profile }) => mentionCompletion(pubkey, profile) ?? []);
    },
  },

  /** Attached to a text field: the people mentioned in it, besides those picked */
  enrichFormData: (formData: Record<string, unknown>, field: PostField) => {
    const text = field.attachTo ? formData[field.attachTo] : undefined;
    if (typeof text !== 'string') return {};
    const people = mentionsIn(text).reduce(withPerson, peopleOf(formData[field.id]));
    return people.length > 0 ? { [field.id]: people } : {};
  },

  resolveFromTags: (tags: string[][], field: PostField): unknown => {
    const target = Array.isArray(field.mapTo) ? field.mapTo[0] : field.mapTo;
    return peopleFromTags(tags, target?.tagName ?? 'p');
  },
};

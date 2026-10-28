/**
 * @nostr-post/plugin-profile - People in form JSON
 *
 * A people field asks for each person's name (or npub) and role. A name becomes a person only
 * when one profile is called exactly that (NIP-50 search): tagging someone notifies them, so an
 * unsure match is left out, for the user to add in the composer. No DOM dependencies.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { fieldRoles, type Person, personFromText } from './core';
import { profileName, searchProfiles } from './search';

/** The people as `{ name, role }`: a name or npub, and one of the field's roles */
export const profileJsonSchema = (field: PostField): Record<string, unknown> => {
  const roles = fieldRoles(field);
  return {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Their name or npub on Nostr' },
        role: roles.length ? { anyOf: [{ enum: roles }, { type: 'null' }] } : { type: 'null' },
      },
      required: ['name', 'role'],
      additionalProperties: false,
    },
  };
};

const normalize = (name: string): string => name.trim().toLowerCase();

/** The person a name or npub stands for: an npub's, or the one profile called exactly that */
const findPerson = async (name: string, relays?: string[]): Promise<Person | undefined> => {
  const pasted = personFromText(name);
  if (pasted) return pasted;
  const wanted = normalize(name);
  const found = (await searchProfiles(name, { relays }).catch(() => [])).filter(
    (f) =>
      normalize(profileName(f.pubkey, f.profile)) === wanted ||
      normalize(f.profile.name ?? '') === wanted
  );
  return found.length === 1 && found[0] ? { pubkey: found[0].pubkey } : undefined;
};

/** An item's name and role: `{ name, role }`, or a plain name */
const nameAndRole = (item: unknown): { name?: string; role?: unknown } => {
  if (typeof item === 'string') return { name: item };
  const { name, role } = (item ?? {}) as { name?: unknown; role?: unknown };
  return typeof name === 'string' && name.trim() ? { name, role } : {};
};

/** The field's search relays (`metadata.searchRelays`), if set */
const searchRelaysOf = (field: PostField): string[] | undefined => {
  const relays = field.metadata?.searchRelays;
  return Array.isArray(relays) && relays.length ? (relays as string[]) : undefined;
};

/** `{ name, role }` items as people; names without exactly one profile are left out */
export const parseProfileJson = async (
  value: unknown,
  field: PostField
): Promise<{ value?: unknown }> => {
  const roles = fieldRoles(field);
  const relays = searchRelaysOf(field);
  const people: Person[] = [];
  for (const item of Array.isArray(value) ? value : [value]) {
    const { name, role } = nameAndRole(item);
    const person = name ? await findPerson(name, relays) : undefined;
    if (!person || people.some((p) => p.pubkey === person.pubkey)) continue;
    people.push(typeof role === 'string' && roles.includes(role) ? { ...person, role } : person);
  }
  return { value: people.length ? people : undefined };
};

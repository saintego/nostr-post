/**
 * An event's text for calendar apps: its role lines (`Performers: nostr:naddr1…`, links calendar
 * apps can't open) as the names of the pages they link, with a web link of each page, and the
 * lines of one role joined: `Performers: Inspirative (https://…), Faustus, Summer Dress`.
 * No DOM dependencies.
 */

import { roleLineOf } from '@nostr-post/core/postRoles';

/** A linked page as calendar apps show it: its name, and web links (the first is shown) */
export interface IcsRef {
  name: string;
  links?: string[];
}

/** The addresses the text's role lines link */
export const roleAddresses = (content: string): string[] => [
  ...new Set(content.split('\n').flatMap((line) => roleLineOf(line)?.address ?? [])),
];

/** A page's name from its title, without the type in brackets: "Faustus (musician)" → "Faustus" */
export const pageName = (title: string): string => title.replace(/\s*\([^)]*\)\s*$/, '').trim();

const LABELED = /^([^:\n]{1,40}):\s*(\S.*)$/;

/**
 * The text with role lines as names (`refs`, by address; a line whose page isn't known is
 * left out), and consecutive lines of the same role joined into one
 */
export function icsDescription(content: string, refs: ReadonlyMap<string, IcsRef>): string {
  const roleLabels = new Set<string>();
  const lines = content.split('\n').flatMap((line): string[] => {
    const role = roleLineOf(line);
    if (!role) return [line];
    roleLabels.add(role.label);
    const ref = refs.get(role.address);
    if (!ref) return [];
    const link = ref.links?.find((l) => /^https?:\/\//.test(l));
    return [`${role.label}: ${ref.name}${link ? ` (${link})` : ''}`];
  });
  const joined: string[] = [];
  let previous: string | undefined;
  for (const line of lines) {
    const [, label = '', value = ''] = line.trim().match(LABELED) ?? [];
    const last = joined.length - 1;
    if (label && roleLabels.has(label) && label === previous && last >= 0) {
      joined[last] = `${joined[last]}, ${value}`;
      continue;
    }
    previous = label && roleLabels.has(label) ? label : undefined;
    joined.push(line);
  }
  return joined.join('\n').trim();
}

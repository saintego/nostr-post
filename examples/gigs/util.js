/**
 * Helpers shared by the gig app's pages: the page's main element, HTML escaping, remembered
 * settings, links to gigs.
 */

import { encodeNaddr } from '../../nostr-post.js';

export const main = document.getElementById('main');
export const html = (strings, ...values) =>
  strings.reduce((out, s, i) => out + s + (i < values.length ? escapeHtml(values[i]) : ''), '');
export const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/** localStorage, which can be missing or blocked (private windows) */
export const store = {
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // Not remembered
    }
  },
};

/** A gig's page */
export const eventLink = (address) =>
  `#/event/${encodeNaddr(address) ?? encodeURIComponent(address)}`;

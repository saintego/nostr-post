'use client';

import type { NostrPostManifest } from '@nostr-post/core/types';
import {
  type EntitySearchResult,
  entitySnippet,
  searchEntities,
} from '@nostr-post/plugin-wiki-entity';
import { useEffect, useRef, useState } from 'react';
import { styles } from './wikiPanelStyles';

const MIN_QUERY_LENGTH = 2;

interface EntityBrowserProps {
  /** Entity manifest: only entities of its type are listed */
  manifest: NostrPostManifest;
  selectedDTag?: string;
  onSelect: (dTag: string) => void;
  /** Start a new entity; `name` is the current search text */
  onNew: (name: string) => void;
}

const dTagOf = (result: EntitySearchResult) =>
  result.event.tags.find((t) => t[0] === 'd')?.[1] ?? '';

/** Search box + result list that stays open, so switching entities is one click. */
export function EntityBrowser({ manifest, selectedDTag, onSelect, onNew }: EntityBrowserProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EntitySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchId = useRef(0);

  useEffect(() => {
    const id = ++searchId.current;
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      searchEntities(query.trim(), { entityManifest: manifest })
        .catch((): EntitySearchResult[] => [])
        .then((found) => {
          if (id !== searchId.current) return;
          setResults(found);
          setSearching(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, manifest]);

  const hasQuery = query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div>
      <div style={styles.searchRow}>
        <input
          style={styles.input}
          type="search"
          placeholder="Search entities by name or slug…"
          aria-label="Search entities"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" style={styles.button} onClick={() => onNew(query.trim())}>
          + New
        </button>
      </div>

      {hasQuery && (
        <div style={styles.list}>
          {searching && results.length === 0 && <div style={styles.status}>Searching…</div>}
          {!searching && results.length === 0 && (
            <div style={styles.status}>
              No entities found for “{query.trim()}”. Use <strong>+ New</strong> to create one.
            </div>
          )}
          {results.map((result) => {
            const dTag = dTagOf(result);
            const title = result.event.tags.find((t) => t[0] === 'title')?.[1] ?? dTag;
            const snippet = entitySnippet(result.event.tags, result.event.content);
            return (
              <button
                key={dTag}
                type="button"
                style={styles.listItem(dTag === selectedDTag)}
                aria-current={dTag === selectedDTag}
                onClick={() => onSelect(dTag)}
              >
                <div style={styles.itemMain}>
                  <div style={styles.itemTitle}>{title}</div>
                  <div style={styles.itemMeta}>
                    <span style={styles.mono}>{dTag}</span>
                    {snippet && ` · ${snippet}`}
                  </div>
                </div>
                <div style={{ ...styles.itemMeta, textAlign: 'right' }}>
                  {result.versions} version{result.versions === 1 ? '' : 's'}
                  <br />
                  {new Date(result.event.created_at * 1000).toLocaleDateString()}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

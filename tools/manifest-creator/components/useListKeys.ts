'use client';

import { useRef } from 'react';

/**
 * Stable React keys for an editable list whose items have no id of their own (or an id the
 * user edits). Index keys would move inputs to the wrong row when an item is removed.
 * Call `removeKey(index)` together with removing the item; added items get a new key.
 */
export function useListKeys(count: number): { keys: string[]; removeKey: (index: number) => void } {
  const keysRef = useRef<string[]>([]);
  while (keysRef.current.length < count) keysRef.current.push(crypto.randomUUID());
  if (keysRef.current.length > count) keysRef.current = keysRef.current.slice(0, count);
  return {
    keys: keysRef.current,
    removeKey: (index) => {
      keysRef.current = keysRef.current.filter((_, i) => i !== index);
    },
  };
}

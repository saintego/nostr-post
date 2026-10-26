import { describe, expect, it } from 'vitest';
import { foldAccents, nip54DTag, slugify, textWords } from './textNormalize';

describe('nip54DTag', () => {
  it('follows NIP-54', () => {
    expect(nip54DTag('Pliny the Elder')).toBe('pliny-the-elder');
    expect(nip54DTag("What's Up?")).toBe('whats-up');
    expect(nip54DTag('hello  world')).toBe('hello-world');
    expect(nip54DTag('Ñoño')).toBe('ñoño');
    expect(nip54DTag('Paralelná Polis, Košice')).toBe('paralelná-polis-košice');
    expect(nip54DTag('東京 Tower 2')).toBe('東京-tower-2');
    expect(nip54DTag('  -Edge- ')).toBe('edge');
  });
});

describe('slugify', () => {
  it('folds accents and separates on punctuation when asked', () => {
    expect(slugify('Want to go!', { foldAccents: true, punctuation: 'separate' })).toBe(
      'want-to-go'
    );
    expect(slugify('Bières', { foldAccents: true, punctuation: 'separate' })).toBe('bieres');
    expect(slugify('a.b', { punctuation: 'separate' })).toBe('a-b');
    expect(slugify('a.b')).toBe('ab');
    expect(slugify('!!!', { punctuation: 'separate' })).toBe('');
  });
});

describe('textWords / foldAccents', () => {
  it('splits into accent-free lowercase words', () => {
    expect(textWords('DOOMSDAY Ceremony – Medellín!')).toEqual([
      'doomsday',
      'ceremony',
      'medellin',
    ]);
    expect(textWords('')).toEqual([]);
    expect(foldAccents('Bières')).toBe('Bieres');
  });
});

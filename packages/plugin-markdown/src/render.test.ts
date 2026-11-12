import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './render';

describe('renderMarkdown', () => {
  it('formats Markdown', () => {
    const html = renderMarkdown('# Title\n\nSome **bold** and *it*.\n\n1. one\n2. two\n\n> quote');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<ol>');
    expect(html).toContain('<blockquote>');
  });

  it('shows raw HTML as text, so it never runs', () => {
    const html = renderMarkdown('Hi <img src=x onerror=alert(1)> <script>alert(2)</script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it("doesn't link script schemes", () => {
    const html = renderMarkdown('[click](javascript:alert(1)) [data](data:text/html,<b>x</b>)');
    expect(html).not.toContain('href="javascript');
    expect(html).not.toContain('href="data');
  });

  it('opens links in a new tab without the opener, and links bare URLs', () => {
    expect(renderMarkdown('[site](https://example.com)')).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">site</a>'
    );
    expect(renderMarkdown('see https://example.com/a')).toContain('href="https://example.com/a"');
  });

  it('keeps single line breaks and loads images lazily without a referrer', () => {
    expect(renderMarkdown('one\ntwo')).toContain('one<br>\ntwo');
    expect(renderMarkdown('![cover](https://example.com/c.jpg)')).toContain(
      'loading="lazy" referrerpolicy="no-referrer"'
    );
  });

  it('is empty for no text', () => {
    expect(renderMarkdown('')).toBe('');
  });
});

# @nostr-post/article

NIP-23 long-form articles (kind 30023): interviews, reports, essays in Markdown, readable in other
long-form clients (Habla, Yakihonne, …) as normal articles. Comments (NIP-22), reactions and lists
(bookmark sets take `a` tags to 30023) work as on any addressable post.

## Main entry (no DOM)

```ts
import { ARTICLE_MANIFEST, articleFilter, articleCard } from '@nostr-post/article';
```

| Export | Does |
| --- | --- |
| `ARTICLE_MANIFEST` | The article manifest (`article-v1`): `title`, `summary`, `image`, the Markdown text as the content, `t` topics, and `published_at`: the first publishing (the date field's `defaultNow`: empty means when you publish; an edit keeps the date it opened with). The d-tag is generated once and kept, so edits replace the article |
| `ARTICLE_KIND` | 30023 |
| `articleFilter({ authors?, topics?, limit? })` | Relay filter for articles by authors and/or topics (`#t`, lowercased); default limit 20 |
| `articleCard(event)` | What a list shows of an article: `address`, `title`, `summary?`, `image?`, `publishedAt` (`published_at`, else the version's time), `topics` |
| `isArticleAddress(address)` | Whether an address is an article's (`30023:<pubkey>:<d-tag>`) |

Write one with any composer and the manifest:

```html
<nostr-post-composer .manifest=${ARTICLE_MANIFEST}></nostr-post-composer>
```

The text is edited with plugin-markdown's editor (WYSIWYG or raw Markdown) and shown formatted by
its view (`renderMarkdown`: raw HTML is shown as text and script links aren't links, so articles
from anyone are safe to show).

## `/web`

```ts
import '@nostr-post/article/web';
```

Defines `<nostr-article>` and makes it the kind view of 30023: a post linking an article
(`nostr:naddr1…`) shows it.

- `<nostr-article address="30023:<pubkey>:<d-tag>">`: loads the newest version and shows it with
  the article manifest (web's `<nostr-post-address>`): title, image, summary, the formatted text,
  topics, the publishing date. `.manifest` (default `ARTICLE_MANIFEST`), `.relays`, `thread` (the
  article's page: with its comments, reactions and update comments), `editable` (Edit: its author
  republishes it, anyone else suggests changes). Parts are forwarded from `<nostr-post-view>`.

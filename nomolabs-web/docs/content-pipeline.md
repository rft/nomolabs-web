# Content Pipeline

How a markdown note in `rft/public-notes` becomes HTML on the site.

```
┌─────────────────────────────────────────────┐
│  github.ts  (consumer)                      │
│  Lists repo, fetches sources + commit dates,│
│  memoizes the full note set per build       │
├─────────────────────────────────────────────┤
│  pipeline.ts  (orchestrator)                │
│  renderContent(): embeds → wiki links →     │
│  render → media rewrite → heading ids       │
├─────────────────────────────────────────────┤
│  registry.ts  (router)                      │
│  Maps file extensions → renderer instances  │
├──────────────┬──────────────────────────────┤
│ markdown-    │  future-renderer.ts          │
│ renderer.ts  │  (e.g. org-mode, AsciiDoc)   │
│ .md          │  .org, .adoc, ...            │
├──────────────┴──────────────────────────────┤
│  types.ts  (contracts)                      │
│  ContentRenderer, RenderResult, RenderOptions│
└─────────────────────────────────────────────┘
```

## Source conventions (the notes repo)

- Notes are `.md` files in the **root** of `rft/public-notes`; `readme.md` is excluded.
- Media lives in `Assets/`; bare filenames in embeds resolve there.
- A note's **slug** is its filename minus the extension (spaces allowed:
  `Kumiko Lamp Build Log.md` → slug `Kumiko Lamp Build Log`).
- A note's **title** is the filename with underscores turned into spaces
  (`Linux_Setup.md` → "Linux Setup").
- Obsidian syntax is supported: `[[Wiki Links]]`, `[[Target|display text]]`,
  `![[image.png]]`, `![[clip.mp4]]`.
- `#tags` anywhere in prose tag the note. Tagging a note `#incomplete` **unpublishes
  it** — it is dropped before rendering and other notes' wiki links to it degrade to
  plain text.

## Fetching (`src/lib/github.ts`)

`fetchAllNotes()` is the single entry point; `fetchNote(slug)` is just a lookup into
its result.

1. **List** the repo root via the GitHub contents API. Failures **throw** — a build
   must never silently publish an empty site.
2. **First pass** — for every supported file (extension known to the renderer
   registry), fetch in parallel:
   - the raw source (`download_url`), and
   - its last commit date (`/commits?path=...&per_page=1`), used as `mtime`.
     Falls back to the Unix epoch if unavailable.
3. **Filter** out notes tagged `incomplete`, then build the set of published slugs.
4. **Second pass** — render each note with that slug set (see below), plus a
   `previewHtml` rendered from source truncated to ~1200 chars at a paragraph
   boundary (used by the `/blogs` grid tiles so the full article HTML never ships
   to the list page).
5. Sort by `mtime`, newest first.

### Caching

The result is memoized on `globalThis` (survives Vite re-instantiating server
modules in dev):

- **During build** (`building === true`): cached forever. All load functions and the
  prerender `entries` generator in one process share a single fetch cycle.
  Note: `vite build` runs route analysis and prerendering in _separate processes_,
  so a full build performs two fetch cycles total — that's the floor.
- **In dev**: 60-second TTL, so new notes appear without restarting the server.

### Authentication

`GITHUB_TOKEN` (optional) is read via `$env/dynamic/private` and sent as an
`Authorization` header. Without it you get GitHub's 60 requests/hour limit — fine
for small builds, but set it for anything regular. Because the import is
server-private, accidentally importing `github.ts` from client code is a hard build
error rather than a leaked token.

## Rendering (`src/lib/rendering/`)

### The contract (`types.ts`)

```typescript
interface ContentRenderer {
	extensions: string[]; // e.g. ['.md']
	render(source: string): string | Promise<string>;
	extractTags(source: string): string[]; // sorted, lowercased
}
```

`extractTags()` lives on the renderer because tag syntax is format-specific
(`#tag` in Markdown vs `:tag:` in org-mode).

### The pipeline (`pipeline.ts`)

`renderContent(source, renderer, options)` runs these stages in order:

| Stage                  | What it does                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resolveEmbeds`        | `![[file]]` → markdown image or `<video>` tag pointing at `raw.githubusercontent.com`. Runs **before** wiki links so `![[...]]` isn't misread as `[[...]]`.                                                                                                                                                                                                                                                                             |
| `resolveWikiLinks`     | `[[Page]]` → `[Page](/blogs/<slug>)`. With `options.knownSlugs`, targets are matched exactly, then with spaces↔underscores swapped (bridging the two filename conventions). Unmatched targets render as `<span class="broken-wikilink">` instead of a dead link, which is what keeps strict prerendering safe. Misses log a build warning (suppressed via `options.quiet` for preview renders, which may have truncated the link away). |
| `renderer.render`      | Format-specific source → HTML.                                                                                                                                                                                                                                                                                                                                                                                                          |
| `rewriteRelativeMedia` | Relative `<img src>` URLs in the output → GitHub raw URLs (`Assets/` prefixed for bare filenames).                                                                                                                                                                                                                                                                                                                                      |
| `extractHeadings`      | Adds slugified, deduplicated `id`s to `<h1>–<h6>` and returns the heading list that powers the table of contents.                                                                                                                                                                                                                                                                                                                       |

Result: `{ html, tags, headings }`.

### The markdown renderer (`markdown-renderer.ts`)

A dedicated `new Marked()` instance (not the global, to avoid state leakage) with:

- **`marked-highlight` + highlight.js** — fenced code blocks, language hint or
  auto-detect.
- **`marked-katex-extension`** — `$inline$` and `$$display$$` math.
- **A custom `docTag` inline extension** — turns `#tag` in prose into an
  `<a class="doc-tag" href="/blogs?tags=...">` filter link. Because it runs at the
  _tokenizer_ level, code is already tokenized before it looks at anything:
  `#include` in a C block, `#!/bin/sh`, or `` `#fff` `` are never rewritten. Only
  `#word` preceded by whitespace (or at line start) counts, so `C#` and `foo#bar`
  are left alone.

`extractTags()` mirrors that safety by stripping fenced blocks and inline code
before scanning for `#tags`.

Stylesheets (`highlight.js` themes, `katex.min.css`) are imported once in the root
`+layout.svelte`.

### Styling rendered content

`{@html}` output can't use Svelte's scoped styles, so article styles live in
`src/lib/styles/article-content.css`, scoped under the `.article-content` wrapper
class. The `.broken-wikilink` and `.doc-tag` classes are styled there / in the root
layout respectively.

## Adding a new format

1. Create `src/lib/rendering/foo-renderer.ts` implementing `ContentRenderer`.
2. Register it in `src/lib/rendering/index.ts` (`registerRenderer(fooRenderer)`).

`github.ts` discovers supported files through the registry, so nothing else changes.

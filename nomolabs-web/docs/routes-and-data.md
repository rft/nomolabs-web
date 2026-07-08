# Routes & Data Flow

The whole site is prerendered: `src/routes/+layout.ts` sets
`export const prerender = true`, and `@sveltejs/adapter-static` writes the result to
`build/`. Load functions run **only at build time**; in the browser their output is
read from the baked-in `__data.json` payloads.

## Route map

| Route           | Files                                           | Purpose                                                  |
| --------------- | ----------------------------------------------- | -------------------------------------------------------- |
| `/`             | `+page.server.ts`, `+page.svelte`               | Latest posts, one full article at a time with pagination |
| `/blogs`        | `blogs/+layout.server.ts`, `blogs/+page.svelte` | Grid of preview tiles, filterable by tags                |
| `/blogs/[slug]` | `blogs/[slug]/+page.server.ts`, `+page.svelte`  | A single article                                         |
| `/tools`        | `tools/+page.svelte`                            | Placeholder                                              |

## Who loads what

All server loads go through the memoized `fetchAllNotes()` (see
[content-pipeline.md](content-pipeline.md)), so the GitHub API is only hit once per
process regardless of how many routes prerender.

### `/` — `+page.server.ts`

Returns the full `Note[]` (complete article HTML included). The page keeps a
`page` state and renders `docs[page - 1]` — client-side pagination through entire
posts with a fixed `Pagination` bar at the bottom. This is why the home payload
carries every article; it's a deliberate "read posts without leaving home" design.

### `/blogs` — `blogs/+layout.server.ts`

This is a **layout** load, so its data is available to both the grid page _and_
every `[slug]` page (the sidebars need it everywhere). It derives everything from
the note set:

- `docs` — slimmed to `{ slug, title, mtime, tags, previewHtml }`. Full article
  HTML is intentionally **not** shipped to the list page (~7 KB payload instead of
  the whole blog).
- `allTags` — `{ name, count }[]`, sorted by count then name.
- `references` — `slug → outgoing slugs`, built by scanning each note's rendered
  HTML for `href="/blogs/..."` links (i.e. resolved wiki links), keeping only links
  to published notes and dropping self-links.
- `titles` — `slug → display title`, for graph labels and reference lists.

Backlinks are _not_ precomputed; the layout component inverts `references` on the
fly for the current page.

### `/blogs/[slug]` — `blogs/[slug]/+page.server.ts`

Two exports:

- `entries` — an `EntryGenerator` that returns every published slug. This is how
  the prerenderer knows all article pages **up front**, instead of relying on
  crawling anchor tags. It shares the note cache with the loads.
- `load` — `fetchNote(params.slug)`; 404s via `error(404)` if the slug isn't
  published.

Returns a full `Note`: `{ slug, title, mtime, html, previewHtml, tags, headings }`.
`headings` drives the table of contents; `tags` scopes the sidebar tag list to the
current article.

## Prerender strictness

`svelte.config.js` deliberately has **no** `handleHttpError`/`handleUnseenRoutes`
overrides, so SvelteKit's strict defaults apply: any internal link that 404s (or a
prerenderable route that's never reached) **fails the build**. That is safe because:

- `entries` enumerates all article pages explicitly, and
- wiki links to unpublished/missing notes are rendered as plain text spans, not
  links (see the pipeline doc).

If a build fails with a 404, a note genuinely links to something that doesn't
exist — fix the note, don't loosen the config.

## URL state (tag filters)

Filters live in the query string so they're shareable and survive navigation:

- `?tags=a,b` — only show notes with **all** of these tags
- `?ntags=c` — hide notes with **any** of these tags

Parsing is centralized in `src/lib/tag-filters.ts` (`parseTagFilters`). Because
pages are prerendered without query strings, anything reading `page.url.search*`
is guarded with `browser` — during prerender the filters are treated as empty, and
the client applies them after hydration. Filtering itself is pure client-side
array filtering over the already-loaded `docs`.

# Development

## Setup

```sh
npm install
npm run dev
```

The repo ships a Nix flake with direnv (`.envrc` → `use flake ..`) for the ambient
toolchain; plain Node ≥ 20 + npm works too.

### Environment

| Variable       | Required | Purpose                                                                                                           |
| -------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN` | No       | Raises the GitHub API rate limit from 60/hr (anonymous) to 5000/hr. Any token with public-repo read access works. |

Put it in `.env` (gitignored). It is read via `$env/dynamic/private` in
`src/lib/github.ts` — server-only by construction, so it can never end up in the
client bundle. **If you rename or move CI/deploy, remember the variable is
`GITHUB_TOKEN`, not `VITE_GITHUB_TOKEN`.**

## Scripts

| Script                    | What it does                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`             | Vite dev server. Notes are fetched live from GitHub with a 60 s cache, so edits to the notes repo show up within a minute.               |
| `npm run build`           | Full static build → `build/`. Fetches and renders all notes, prerenders every route. Fails loudly on GitHub API errors or internal 404s. |
| `npm run preview`         | Serve the `build/` output locally.                                                                                                       |
| `npm run check`           | `svelte-check` type checking. Must be clean.                                                                                             |
| `npm run test`            | Vitest — unit tests for the rendering pipeline and markdown renderer (`src/lib/rendering/*.test.ts`).                                    |
| `npm run lint` / `format` | Prettier check / write (tabs, single quotes, width 100).                                                                                 |

## Testing notes

The rendering layer is deliberately pure (string in → string/objects out), so it's
tested directly without any SvelteKit or DOM harness:

- `pipeline.test.ts` — embeds, wiki-link resolution (including space/underscore
  bridging and broken-link degradation), heading extraction/dedup.
- `markdown-renderer.test.ts` — the `#tag` extension (prose vs code blocks vs
  inline code vs mid-word `#`), tag extraction.

`github.ts` is not unit-tested; it's thin orchestration over `fetch` and is
exercised end-to-end by every build.

## Gotchas

- **Content is build-time.** A new note in `public-notes` does not appear on the
  deployed site until this project is rebuilt. If deploys feel stale, that's why.
  (A `repository_dispatch` from the notes repo to the deploy pipeline is the
  intended long-term fix.)
- **Build fetch cost**: one build performs two GitHub fetch cycles (route analysis
  and prerendering run in separate processes; each cycle is `1 + 2 × notes`
  requests). Anonymous rate limits can bite once the note count grows — set
  `GITHUB_TOKEN`.
- **Unpublishing**: tag a note `#incomplete` to keep it out of the site entirely.
  Other notes' wiki links to it silently degrade to plain text (with a build-time
  warning).
- **Query params during prerender**: `page.url.search`/`searchParams` cannot be
  read at prerender time. Any code touching them must be guarded with `browser`
  (see `parseTagFilters` call sites) — forgetting the guard breaks the build.
- **`{@html}` styling**: Svelte scoped styles don't reach rendered article HTML.
  Add article styles to `src/lib/styles/article-content.css`, not component
  `<style>` blocks.
- **Known npm audit remainder**: 3 low-severity advisories via SvelteKit's
  transitive `cookie` dependency. The only "fix" npm offers is a breaking
  downgrade of kit itself, and the cookie code path is irrelevant to a static
  site. Ignore until kit bumps the dependency.

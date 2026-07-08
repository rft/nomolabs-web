# Frontend

UI is built on [carbon-components-svelte](https://svelte.carbondesignsystem.com/)
(IBM Carbon) with Svelte 5 runes throughout (`$props`, `$state`, `$derived`,
`$effect`, snippets). Reactive page state comes from `$app/state` (not the
deprecated `$app/stores`).

## Global chrome (`src/routes/+layout.svelte`)

- Carbon `Header` with nav (Blogs / Tools) and a dark-mode toggle; on mobile the
  nav collapses into a hamburger + `SideNav` (hidden on desktop via a media query).
- Sets the tab title for static routes (`Home - NomoLabs` etc.); article pages set
  their own via `<svelte:head>`.
- Imports the global stylesheets: Carbon `all.css`, KaTeX, `article-content.css`,
  and **both** highlight.js themes as URLs — the active one is swapped in
  `<svelte:head>` based on the theme.

## Theming

- Carbon's runtime theming: the `Theme` component sets a `theme` attribute on
  `<html>`; `all.css` contains every theme keyed off that attribute.
- Two themes are used: `g100` (dark, the default) and `white`.
- Choice persists to `localStorage.theme`. An inline script in `src/app.html`
  re-applies the attribute **before first paint**, because the `Theme` component
  only runs after hydration — without it, light-theme users would get a dark flash
  on every load.

## Blogs layout (`src/routes/blogs/+layout.svelte`)

Wraps both the grid and article pages in a three-column shell:

```
┌────────────┬──────────────────────────┬──────────────┐
│ left       │  main content            │ right        │
│ sidebar    │  (grid or article)       │ sidebar      │
│            │                          │              │
│ · Contents │                          │ · References │
│   (TOC,    │                          │ · Referenced │
│   articles │                          │   by         │
│   only)    │                          │ · Connection │
│ · Filter   │                          │   graph      │
│   by tags  │                          │              │
└────────────┴──────────────────────────┴──────────────┘
```

Sidebars are `position: fixed` 250px columns on desktop and stack statically below
672px. Each section is a collapsible `<details>`.

### Table of contents

`page.data.headings` (produced by `extractHeadings` in the pipeline) is folded into
a tree by `buildTocTree` — a stack-based pass that nests each heading under the
nearest shallower one. Rendered with a recursive snippet; branches are collapsible,
links jump to the heading `id`s (which have `scroll-margin-top` to clear the fixed
header).

### Tag filtering

- Every tag row has three actions: **+** (include), **−** (exclude), and the tag
  label itself (filter by just this tag and go to the grid).
- State machine per tag: `none → include → none`, `none → exclude → none`;
  including removes an exclude and vice versa.
- All transitions go through `updateUrl()`, which rewrites `?tags=`/`?ntags=` and
  `goto()`s. On the grid it replaces state in place (no scroll/focus loss); from an
  article page it navigates to the grid, carrying the filter.
- On article pages the tag list is scoped to the current article's tags; the
  search box narrows the list by substring.

### References / backlinks

For the current slug, outgoing references come straight from
`data.references[slug]`; backlinks are computed by inverting `references` in a
`$derived`. Both render as simple link lists; the current slug is parsed from
`page.url.pathname`.

## Connection graph (`src/lib/components/ConnectionGraph.svelte`)

A force-directed graph of the wiki-link structure.

- **Data**: `references` (edges) + `titles` (labels). On the grid page `allSlugs`
  adds unconnected notes as isolated nodes; on article pages only connected notes
  appear and `currentSlug` is highlighted.
- **D3 by submodule** (`d3-force`, `d3-selection`, `d3-zoom`, `d3-drag`,
  `d3-scale`, `d3-array`) — importing the `d3` meta-package would put ~280 KB in
  the client bundle for five modules of actual use.
- Node radius scales with total degree (`scaleSqrt`); edges are directed with
  arrowheads inset to the target's radius on every tick.
- Interactions: zoom/pan (0.3×–4×), drag pins a node while held, hover shows a
  tooltip and dims everything not adjacent, click navigates to the note.
- **Lifecycle**: the SVG is imperative D3, not Svelte-rendered. A top-level
  `$effect` re-runs `render()` whenever the container width or any prop changes
  (Svelte tracks the reads inside `render`), stopping the old simulation and
  clearing old DOM first. A `ResizeObserver` feeds `width` through a 100 ms
  debounce so window-resizing doesn't rebuild the simulation per frame. Cleanup on
  unmount stops the simulation and disconnects the observer.

## Article rendering

Article bodies arrive as prerendered HTML strings and are injected with `{@html}`
inside `.article-content`. Consequences:

- Styles must be global-ish: they live in `src/lib/styles/article-content.css`,
  namespaced under `.article-content` (and `.preview-content` for grid tiles).
- The content is trusted — it's the site owner's own notes repo. If that ever
  changes (e.g. accepting external content), sanitization would need to be added
  to the pipeline.

The `/blogs` grid tiles reuse the same CSS: each tile renders `previewHtml` into a
500px-wide box scaled to 40% inside a square, non-interactive viewport.

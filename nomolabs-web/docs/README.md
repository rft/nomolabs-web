# NomoLabs Web — Documentation

A personal blog / digital garden built with SvelteKit. Content lives as Obsidian-style
markdown notes in a separate GitHub repo ([`rft/public-notes`](https://github.com/rft/public-notes));
this project fetches, renders, and publishes them as a fully static site at build time.

## The big picture

```
┌──────────────────┐   GitHub API    ┌──────────────────────────────┐
│ rft/public-notes │ ──────────────► │  Build (vite build)          │
│  *.md + Assets/  │  (build time)   │                              │
└──────────────────┘                 │  github.ts   fetch + cache   │
                                     │  rendering/  md → HTML       │
                                     │  prerender   every route     │
                                     └──────────────┬───────────────┘
                                                    │
                                                    ▼
                                     ┌──────────────────────────────┐
                                     │  build/  (static HTML/JS)    │
                                     │  served by any static host   │
                                     └──────────────────────────────┘
```

There is no runtime server. Every page is prerendered by `@sveltejs/adapter-static`;
the browser only runs JavaScript for client-side niceties (tag filtering, the
connection graph, theme toggling).

**Consequence:** the site only reflects new notes when it is rebuilt. Publishing a
note means pushing to `public-notes` _and_ rebuilding this project.

## Documentation index

| Document                                   | Covers                                                                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| [content-pipeline.md](content-pipeline.md) | How notes get from GitHub to rendered HTML: fetching, caching, the renderer registry, markdown extensions, wiki links, tags |
| [routes-and-data.md](routes-and-data.md)   | Every route, its load function, what data it ships, and how prerendering discovers pages                                    |
| [frontend.md](frontend.md)                 | Layouts, sidebars, tag filtering, the D3 connection graph, theming                                                          |
| [development.md](development.md)           | Local setup, environment variables, scripts, tests, gotchas                                                                 |

## Directory map

```
src/
├── app.html                    Shell; inline script applies theme pre-paint
├── lib/
│   ├── github.ts               Fetches + caches notes from the GitHub API
│   ├── tag-filters.ts          Shared tags/ntags query-param parsing
│   ├── components/
│   │   └── ConnectionGraph.svelte   D3 force-directed note graph
│   ├── rendering/              Format-agnostic content rendering (see content-pipeline.md)
│   │   ├── types.ts            ContentRenderer / RenderResult / RenderOptions contracts
│   │   ├── registry.ts         extension → renderer lookup
│   │   ├── pipeline.ts         renderContent() orchestration + shared transforms
│   │   ├── markdown-renderer.ts  Marked instance: hljs, KaTeX, #tag extension
│   │   └── index.ts            Barrel export; auto-registers renderers
│   └── styles/
│       └── article-content.css Styles for {@html}-rendered article bodies
└── routes/
    ├── +layout.svelte          Global chrome: header, nav, theme toggle
    ├── +layout.ts              `export const prerender = true` (whole site)
    ├── +page.server.ts/.svelte Home: paginate through full posts
    ├── tools/+page.svelte      Placeholder
    └── blogs/
        ├── +layout.server.ts   Tag counts, reference graph, titles, slim doc list
        ├── +layout.svelte      Sidebars: TOC, tag filter, refs/backlinks, graph
        ├── +page.svelte        Grid of preview tiles
        └── [slug]/
            ├── +page.server.ts Note lookup + prerender `entries`
            └── +page.svelte    Article page
```

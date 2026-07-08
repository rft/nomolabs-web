# nomolabs-web

Personal blog / digital garden. Obsidian-style markdown notes from
[`rft/public-notes`](https://github.com/rft/public-notes) are fetched at build
time, rendered to HTML, and published as a fully static SvelteKit site — with tag
filtering, wiki links, backlinks, and a D3 connection graph.

```sh
npm install
npm run dev      # develop (notes fetched live, 60s cache)
npm run build    # static site → build/
```

**Documentation:** [docs/README.md](docs/README.md) — architecture overview,
content pipeline, routes & data flow, frontend, and development guide.

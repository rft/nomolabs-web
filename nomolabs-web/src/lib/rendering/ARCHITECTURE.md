# Content Rendering Architecture

## Overview

An extensible strategy-pattern rendering system that converts source files (Markdown, etc.) into styled HTML. Designed so new file formats can be added without modifying existing code.

## Layers

```
┌─────────────────────────────────────────────┐
│  github.ts  (consumer)                      │
│  Calls getRenderer(filename) + renderContent│
├─────────────────────────────────────────────┤
│  pipeline.ts  (orchestrator)                │
│  renderContent() → render + transforms      │
│  Shared transforms: styleTagsInHtml()       │
├─────────────────────────────────────────────┤
│  registry.ts  (router)                      │
│  Maps file extensions → renderer instances  │
├──────────────┬──────────────────────────────┤
│ markdown-    │  future-renderer.ts          │
│ renderer.ts  │  (e.g. org-mode, AsciiDoc)  │
│ .md          │  .org, .adoc, ...            │
├──────────────┴──────────────────────────────┤
│  types.ts  (contracts)                      │
│  ContentRenderer interface + RenderResult   │
└─────────────────────────────────────────────┘
```

## Files

| File | Purpose |
|---|---|
| `types.ts` | `ContentRenderer` interface and `RenderResult` type |
| `registry.ts` | `registerRenderer()` / `getRenderer()` — maps extensions to renderer instances |
| `pipeline.ts` | `renderContent()` — runs a renderer then applies shared transforms (tag styling) |
| `markdown-renderer.ts` | Markdown renderer using a dedicated `Marked` instance with highlight.js and KaTeX extensions |
| `index.ts` | Barrel exports + auto-registers built-in renderers on import |

## ContentRenderer Interface

```typescript
interface ContentRenderer {
  extensions: string[];                        // e.g. ['.md']
  render(source: string): string | Promise<string>;  // source → HTML
  extractTags(source: string): string[];       // source → sorted tag list
}
```

`render()` returns `string | Promise<string>` to support both synchronous renderers (like Marked) and future async ones.

`extractTags()` lives on the renderer because tag syntax is format-specific (e.g. `#tag` in Markdown vs `:tag:` in org-mode).

## Markdown Renderer Details

- Uses `new Marked()` (instance, not global) to avoid state leakage
- **Code highlighting**: `marked-highlight` + `highlight.js` — auto-detects language or uses fenced code block language hints
- **LaTeX math**: `marked-katex-extension` + `katex` — supports `$inline$` and `$$display$$` syntax
- Stylesheets (`highlight.js/styles/github.css`, `katex/dist/katex.min.css`) are imported in the root `+layout.svelte`

## Styling

Content rendered via `{@html}` can't be Svelte-scoped, so all article styles live in `src/lib/styles/article-content.css` and are scoped under the `.article-content` CSS class that wraps rendered HTML in `[slug]/+page.svelte`.

## Adding a New Format

1. Create `src/lib/rendering/foo-renderer.ts` implementing `ContentRenderer`
2. Add `registerRenderer(fooRenderer)` in `index.ts`
3. Add the extension to `SUPPORTED_EXTENSIONS` in `src/lib/github.ts`

No pipeline, transform, or UI changes needed.

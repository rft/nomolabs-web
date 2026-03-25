# Notes Integration

The blog pulls content from [rft/public-notes](https://github.com/rft/public-notes) at build time. Markdown files in the root of that repository are rendered as articles on this site. Any push to that repository can trigger a rebuild to keep content in sync.

## How it works

```
Push to public-notes
    → GitHub Action fires
        → POSTs to Cloudflare Pages deploy hook (or self-hosted webhook)
            → Site rebuild is triggered
                → SvelteKit fetches all .md files from public-notes via GitHub API
                    → Site is prerendered as static HTML and deployed
```

## Architecture

All GitHub fetching logic lives in `src/lib/github.ts`. It provides two functions:

- **`fetchAllNotes(fetch)`** — lists all `.md` files in the repo root (excluding `readme.md`), fetches each file's content and most recent commit date, converts markdown to HTML with `marked`, and returns them sorted newest-first.
- **`fetchNote(slug, fetch)`** — fetches a single note by filename (slug = filename without `.md`), returns its content as HTML with metadata, or `null` if not found.

### Routes

| Route | Source | Description |
|-------|--------|-------------|
| `/` | `+page.server.ts` → `+page.svelte` | Displays the latest note |
| `/articles` | `+page.server.ts` → `+page.svelte` | Paginated list of all notes (10 per page) |
| `/articles/[slug]` | `+page.server.ts` → `+page.svelte` | Individual note view |

### Data shape

Each note object returned from the fetch functions:

```ts
{
    slug: string;   // filename without .md (e.g. "Blender Notes")
    title: string;  // extracted from first # heading, or prettified filename
    mtime: string;  // ISO date string from most recent commit
    html: string;   // markdown converted to HTML
}
```

### Static prerendering

The site uses `@sveltejs/adapter-static`. All pages — including dynamic `[slug]` routes — are prerendered at build time. The prerenderer discovers article pages by crawling links from `/articles`. No GitHub API calls happen at runtime.

## GitHub token

A `VITE_GITHUB_TOKEN` environment variable is recommended. Without it, builds are limited to GitHub's unauthenticated rate limit of 60 requests/hour. With a token, the limit is 5,000/hour.

To create a token:

1. Go to https://github.com/settings/tokens?type=beta
2. Generate a new fine-grained token with **Public Repositories (read-only)** access
3. No additional permissions needed
4. Add it to `nomolabs-web/.env` locally:
   ```
   VITE_GITHUB_TOKEN=github_pat_...
   ```
5. For deployment, add it as an environment variable in your hosting platform

## Triggering rebuilds from public-notes

Add this workflow to the `public-notes` repo:

```yaml
# .github/workflows/trigger-deploy.yml
name: Trigger website rebuild
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cloudflare Pages rebuild
        run: curl -X POST "${{ secrets.WEBSITE_DEPLOY_HOOK }}"
```

Then add the Cloudflare Pages deploy hook URL as a secret in `public-notes`:
`Settings → Secrets and variables → Actions → New repository secret`

The deploy hook URL comes from this repo's Cloudflare Pages dashboard:
`Settings → Builds & Deployments → Deploy Hooks`

## Notebooks

For Jupyter (`.ipynb`) and Marimo notebooks in public-notes, either:

- **Pre-export:** store exported HTML alongside notebooks, fetch those directly
- **Build-time conversion:** add to your Cloudflare build command:
  ```sh
  jupyter nbconvert --to html notebook.ipynb && npm run build
  # or for Marimo:
  marimo export html notebook.py && npm run build
  ```

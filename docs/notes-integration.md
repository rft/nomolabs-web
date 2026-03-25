# Notes Integration

The blog pulls content from [rft/public-notes](https://github.com/rft/public-notes) at build time. Any push to that repository automatically triggers a rebuild of this site.

## How it works

```
Push to public-notes
    → GitHub Action fires
        → POSTs to Cloudflare Pages deploy hook
            → Cloudflare triggers a rebuild of this site
                → SvelteKit fetches content from public-notes during build
                    → Site is built and deployed with fresh content
```

## Fetching content in SvelteKit

Pages fetch markdown files from GitHub's raw content API at build time:

```js
// src/routes/blog/+page.js
export async function load({ fetch }) {
    const res = await fetch(
        'https://api.github.com/repos/rft/public-notes/contents/posts',
        { headers: { Authorization: `token ${import.meta.env.VITE_GITHUB_TOKEN}` } }
    );
    const files = await res.json();
    return { posts: files.filter(f => f.name.endsWith('.md')) };
}
```

```js
// src/routes/blog/[slug]/+page.js
export async function load({ params, fetch }) {
    const res = await fetch(
        `https://raw.githubusercontent.com/rft/public-notes/main/posts/${params.slug}.md`
    );
    const markdown = await res.text();
    return { content: markdown };
}
```

> Since public-notes is a public repo, `VITE_GITHUB_TOKEN` is optional but recommended to avoid GitHub's unauthenticated rate limit (60 req/hr).

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

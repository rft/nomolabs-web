import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { getRenderer, renderContent } from './rendering/index.js';
import type { Heading } from './rendering/types.js';

const REPO = 'rft/public-notes';
const EXCLUDED = ['readme.md'];
const HIDDEN_TAG = 'incomplete';
const PREVIEW_MAX_CHARS = 1200;
// In dev, refetch after a minute so new notes show up without a server restart.
const DEV_CACHE_TTL_MS = 60_000;
// Keep the request burst small — CI builders share egress IPs, and both
// api.github.com and raw.githubusercontent.com throttle anonymous bursts.
const MAX_CONCURRENT_FETCHES = 6;
const FETCH_RETRIES = 3;

export interface Note {
	slug: string;
	title: string;
	mtime: string;
	html: string;
	previewHtml: string;
	tags: string[];
	headings: Heading[];
}

function githubHeaders(): Record<string, string> {
	const token = env.GITHUB_TOKEN;
	return token ? { Authorization: `token ${token}` } : {};
}

export function extractTitle(filename: string): string {
	return filename.replace(/\.md$/, '').replace(/_/g, ' ');
}

async function fetchWithRetry(
	fetchFn: typeof fetch,
	url: string,
	init?: RequestInit
): Promise<Response> {
	for (let attempt = 0; ; attempt++) {
		const res = await fetchFn(url, init);
		if ((res.status !== 429 && res.status !== 403) || attempt >= FETCH_RETRIES) return res;
		const retryAfter = Number(res.headers.get('retry-after'));
		const delayMs = retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt;
		await new Promise((resolve) => setTimeout(resolve, delayMs));
	}
}

async function mapWithConcurrency<T, R>(
	items: T[],
	limit: number,
	fn: (item: T) => Promise<R>
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let next = 0;
	await Promise.all(
		Array.from({ length: Math.min(limit, items.length) }, async () => {
			while (next < items.length) {
				const i = next++;
				results[i] = await fn(items[i]);
			}
		})
	);
	return results;
}

/**
 * Truncate markdown source for preview rendering, cutting at a paragraph
 * boundary so the result stays well-formed.
 */
function truncateSource(source: string, maxChars = PREVIEW_MAX_CHARS): string {
	if (source.length <= maxChars) return source;
	const cut = source.slice(0, maxChars);
	const lastBreak = cut.lastIndexOf('\n\n');
	return lastBreak > 200 ? cut.slice(0, lastBreak) : cut;
}

async function loadAllNotes(fetchFn: typeof fetch): Promise<Note[]> {
	const headers = githubHeaders();

	const listRes = await fetchWithRetry(fetchFn, `https://api.github.com/repos/${REPO}/contents/`, {
		headers
	});
	if (!listRes.ok) {
		const hint = env.GITHUB_TOKEN
			? ''
			: ' — GITHUB_TOKEN is not set, so anonymous rate limits apply (see docs/development.md)';
		throw new Error(
			`GitHub API error listing ${REPO}: ${listRes.status} ${listRes.statusText}${hint}`
		);
	}
	const files: { name: string; path: string; download_url: string }[] = await listRes.json();
	if (!Array.isArray(files)) {
		throw new Error(`GitHub API did not return a file listing for ${REPO}`);
	}

	const supportedFiles = files.filter(
		(f) => getRenderer(f.name) !== undefined && !EXCLUDED.includes(f.name.toLowerCase())
	);

	// With a token, fetch file bodies through the API so the request is
	// authenticated — download_url points at raw.githubusercontent.com, which
	// ignores the token and throttles anonymous bursts from shared CI IPs.
	const contentRequest = (f: { path: string; download_url: string }): [string, RequestInit?] =>
		env.GITHUB_TOKEN
			? [
					`https://api.github.com/repos/${REPO}/contents/${f.path.split('/').map(encodeURIComponent).join('/')}`,
					{ headers: { ...headers, Accept: 'application/vnd.github.raw+json' } }
				]
			: [f.download_url, undefined];

	// First pass: fetch sources and commit dates, extract tags so hidden notes
	// can be dropped before rendering (wiki links must only resolve to
	// published notes).
	const sources = await mapWithConcurrency(
		supportedFiles,
		MAX_CONCURRENT_FETCHES,
		async (f) => {
			const [contentRes, commitRes] = await Promise.all([
				fetchWithRetry(fetchFn, ...contentRequest(f)),
				fetchWithRetry(
					fetchFn,
					`https://api.github.com/repos/${REPO}/commits?path=${encodeURIComponent(f.path)}&per_page=1`,
					{ headers }
				)
			]);
			if (!contentRes.ok) {
				throw new Error(`Failed to fetch ${f.path}: ${contentRes.status}`);
			}
			const source = await contentRes.text();
			const commits: { commit: { committer: { date: string } } }[] = commitRes.ok
				? await commitRes.json()
				: [];
			const date = commits[0]?.commit?.committer?.date;
			return {
				name: f.name,
				slug: f.name.replace(/\.[^.]+$/, ''),
				source,
				mtime: date ? new Date(date).toISOString() : new Date(0).toISOString()
			};
		}
	);

	const published = sources.filter((s) => {
		const renderer = getRenderer(s.name)!;
		return !renderer.extractTags(s.source).includes(HIDDEN_TAG);
	});
	const knownSlugs = new Set(published.map((s) => s.slug));

	// Second pass: render with the full slug set so wiki links to missing or
	// hidden notes degrade to plain text instead of dead links.
	const notes = await Promise.all(
		published.map(async (s): Promise<Note> => {
			const renderer = getRenderer(s.name)!;
			const { html, tags, headings } = await renderContent(s.source, renderer, { knownSlugs });
			const { html: previewHtml } = await renderContent(truncateSource(s.source), renderer, {
				knownSlugs,
				quiet: true
			});
			return {
				slug: s.slug,
				title: extractTitle(s.name),
				mtime: s.mtime,
				html,
				previewHtml,
				tags,
				headings
			};
		})
	);

	notes.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
	return notes;
}

interface NotesCache {
	promise: Promise<Note[]>;
	time: number;
}

// Kept on globalThis so the cache survives module re-instantiation (e.g.
// Vite reloading server modules in dev). The build's route-analysis and
// prerender phases run in separate processes, so those still fetch once each.
const globalCache = globalThis as { __notesCache?: NotesCache | null };

/**
 * Fetch and render every published note, memoized so the many load functions
 * that run during a prerender share a single set of GitHub API calls.
 */
export function fetchAllNotes(fetchFn: typeof fetch): Promise<Note[]> {
	const cache = globalCache.__notesCache;
	if (cache && (building || Date.now() - cache.time < DEV_CACHE_TTL_MS)) {
		return cache.promise;
	}
	const promise = loadAllNotes(fetchFn);
	globalCache.__notesCache = { promise, time: Date.now() };
	// Don't cache failures.
	promise.catch(() => {
		globalCache.__notesCache = null;
	});
	return promise;
}

export async function fetchNote(slug: string, fetchFn: typeof fetch): Promise<Note | null> {
	const notes = await fetchAllNotes(fetchFn);
	return notes.find((n) => n.slug === slug) ?? null;
}

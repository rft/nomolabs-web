import type { ContentRenderer, Heading, RenderOptions, RenderResult } from './types.js';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/rft/public-notes/main/';
const ASSETS_PREFIX = 'Assets/';
const VIDEO_EXTS = /\.(mp4|webm|ogg|mov)$/i;

function mediaUrl(filename: string): string {
	const path = filename.includes('/') ? filename : ASSETS_PREFIX + filename;
	return GITHUB_RAW_BASE + path.split('/').map(encodeURIComponent).join('/');
}

/**
 * Convert Obsidian-style embeds (![[file]]) to proper HTML.
 * Images become <img> tags, videos become <video> tags.
 * Must run before resolveWikiLinks to avoid incorrect conversion.
 */
export function resolveEmbeds(source: string): string {
	return source.replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, file, alt) => {
		const trimmed = file.trim();
		const rawUrl = mediaUrl(trimmed);
		const label = (alt || trimmed).trim();
		if (VIDEO_EXTS.test(trimmed)) {
			return `<video controls><source src="${rawUrl}"></video>`;
		}
		return `![${label}](${rawUrl})`;
	});
}

/**
 * Convert Obsidian-style wiki links to markdown links.
 * Supports both [[Page Name]] and [[Page Name|display text]].
 *
 * When `knownSlugs` is provided, targets are resolved against it (trying
 * space/underscore variants, since filenames use both). Links to unknown
 * targets are rendered as plain styled text instead of dead links.
 */
export function resolveWikiLinks(source: string, knownSlugs?: Set<string>, quiet = false): string {
	return source.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, display) => {
		const trimmed = target.trim();
		const label = (display || target).trim();
		let slug = trimmed;
		if (knownSlugs) {
			const candidates = [trimmed, trimmed.replace(/ /g, '_'), trimmed.replace(/_/g, ' ')];
			const resolved = candidates.find((c) => knownSlugs.has(c));
			if (!resolved) {
				if (!quiet) console.warn(`Wiki link target not found, rendering as text: [[${trimmed}]]`);
				return `<span class="broken-wikilink">${label}</span>`;
			}
			slug = resolved;
		}
		return `[${label}](/blogs/${encodeURIComponent(slug)})`;
	});
}

/**
 * Rewrite relative image/video URLs in rendered HTML to GitHub raw URLs.
 */
export function rewriteRelativeMedia(html: string): string {
	return html.replace(
		/<img\s([^>]*?)src="(?!https?:\/\/|\/\/)([^"]+)"([^>]*?)>/g,
		(_match, before, src, after) => {
			return `<img ${before}src="${mediaUrl(decodeURIComponent(src))}"${after}>`;
		}
	);
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/<[^>]+>/g, '')
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.trim();
}

export function extractHeadings(html: string): { html: string; headings: Heading[] } {
	const headings: Heading[] = [];
	const usedIds = new Set<string>();
	const result = html.replace(
		/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi,
		(match, level, attrs, content) => {
			const text = content
				.replace(/<[^>]+>/g, '')
				.replace(/&amp;/g, '&')
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&quot;/g, '"')
				.replace(/&#39;/g, "'")
				.replace(/&nbsp;/g, ' ')
				.trim();
			let id = slugify(text);
			if (usedIds.has(id)) {
				let i = 1;
				while (usedIds.has(`${id}-${i}`)) i++;
				id = `${id}-${i}`;
			}
			usedIds.add(id);
			headings.push({ level: parseInt(level), text, id });
			return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
		}
	);
	return { html: result, headings };
}

export async function renderContent(
	source: string,
	renderer: ContentRenderer,
	options: RenderOptions = {}
): Promise<RenderResult> {
	const withEmbeds = resolveEmbeds(source);
	const resolved = resolveWikiLinks(withEmbeds, options.knownSlugs, options.quiet);
	const rawHtml = await renderer.render(resolved);
	const styledHtml = rewriteRelativeMedia(rawHtml);
	const { html, headings } = extractHeadings(styledHtml);
	const tags = renderer.extractTags(source);
	return { html, tags, headings };
}

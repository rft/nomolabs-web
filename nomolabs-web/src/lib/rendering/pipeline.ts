import type { ContentRenderer, Heading, RenderResult } from './types.js';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/rft/public-notes/main/';
const ASSETS_PREFIX = 'Assets/';
const VIDEO_EXTS = /\.(mp4|webm|ogg|mov)$/i;

export function styleTagsInHtml(html: string): string {
	return html.replace(
		/((?:^|[\s>]))#(\w+)/g,
		(_, prefix, tag) =>
			`${prefix}<a class="doc-tag" href="/blogs?tags=${tag.toLowerCase()}">#${tag}</a>`
	);
}

/**
 * Convert Obsidian-style embeds (![[file]]) to proper HTML.
 * Images become <img> tags, videos become <video> tags.
 * Must run before resolveWikiLinks to avoid incorrect conversion.
 */
function mediaUrl(filename: string): string {
	const path = filename.includes('/') ? filename : ASSETS_PREFIX + filename;
	return GITHUB_RAW_BASE + path.split('/').map(encodeURIComponent).join('/');
}

export function resolveEmbeds(source: string): string {
	return source.replace(
		/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
		(_, file, alt) => {
			const trimmed = file.trim();
			const rawUrl = mediaUrl(trimmed);
			const label = (alt || trimmed).trim();
			if (VIDEO_EXTS.test(trimmed)) {
				return `<video controls><source src="${rawUrl}"></video>`;
			}
			return `![${label}](${rawUrl})`;
		}
	);
}

/**
 * Convert Obsidian-style wiki links to markdown links.
 * Supports both [[Page Name]] and [[Page Name|display text]].
 */
export function resolveWikiLinks(source: string): string {
	return source.replace(
		/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
		(_, target, display) => {
			const slug = encodeURIComponent(target.trim());
			const label = (display || target).trim();
			return `[${label}](/blogs/${slug})`;
		}
	);
}

/**
 * Rewrite relative image/video URLs in rendered HTML to GitHub raw URLs.
 */
export function rewriteRelativeMedia(html: string): string {
	html = html.replace(
		/<img\s([^>]*?)src="(?!https?:\/\/|\/\/)([^"]+)"([^>]*?)>/g,
		(_match, before, src, after) => {
			return `<img ${before}src="${mediaUrl(decodeURIComponent(src))}"${after}>`;
		}
	);
	return html;
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

function extractHeadings(html: string): { html: string; headings: Heading[] } {
	const headings: Heading[] = [];
	const usedIds = new Set<string>();
	const result = html.replace(
		/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi,
		(match, level, attrs, content) => {
			const text = content.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
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

export async function renderContent(source: string, renderer: ContentRenderer): Promise<RenderResult> {
	const withEmbeds = resolveEmbeds(source);
	const resolved = resolveWikiLinks(withEmbeds);
	const rawHtml = await renderer.render(resolved);
	const styledHtml = rewriteRelativeMedia(styleTagsInHtml(rawHtml));
	const { html, headings } = extractHeadings(styledHtml);
	const tags = renderer.extractTags(source);
	return { html, tags, headings };
}

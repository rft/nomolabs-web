import type { ContentRenderer, RenderResult } from './types.js';

export function styleTagsInHtml(html: string): string {
	return html.replace(
		/((?:^|[\s>]))#(\w+)/g,
		(_, prefix, tag) =>
			`${prefix}<a class="doc-tag" href="/blogs?tags=${tag.toLowerCase()}">#${tag}</a>`
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

export async function renderContent(source: string, renderer: ContentRenderer): Promise<RenderResult> {
	const resolved = resolveWikiLinks(source);
	const rawHtml = await renderer.render(resolved);
	const html = styleTagsInHtml(rawHtml);
	const tags = renderer.extractTags(source);
	return { html, tags };
}

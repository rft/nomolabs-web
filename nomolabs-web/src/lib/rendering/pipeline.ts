import type { ContentRenderer, RenderResult } from './types.js';

export function styleTagsInHtml(html: string): string {
	return html.replace(
		/((?:^|[\s>]))#(\w+)/g,
		(_, prefix, tag) =>
			`${prefix}<a class="doc-tag" href="/articles?tags=${tag.toLowerCase()}">#${tag}</a>`
	);
}

export async function renderContent(source: string, renderer: ContentRenderer): Promise<RenderResult> {
	const rawHtml = await renderer.render(source);
	const html = styleTagsInHtml(rawHtml);
	const tags = renderer.extractTags(source);
	return { html, tags };
}

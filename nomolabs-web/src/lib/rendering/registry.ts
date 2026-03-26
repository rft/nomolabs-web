import type { ContentRenderer } from './types.js';

const renderers = new Map<string, ContentRenderer>();

export function registerRenderer(renderer: ContentRenderer): void {
	for (const ext of renderer.extensions) {
		renderers.set(ext, renderer);
	}
}

export function getRenderer(filename: string): ContentRenderer | undefined {
	const ext = filename.slice(filename.lastIndexOf('.'));
	return renderers.get(ext);
}

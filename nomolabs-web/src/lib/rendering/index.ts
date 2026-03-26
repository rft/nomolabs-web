export type { ContentRenderer, RenderResult } from './types.js';
export { registerRenderer, getRenderer } from './registry.js';
export { renderContent, styleTagsInHtml } from './pipeline.js';
export { markdownRenderer } from './markdown-renderer.js';

// Auto-register built-in renderers
import { registerRenderer } from './registry.js';
import { markdownRenderer } from './markdown-renderer.js';

registerRenderer(markdownRenderer);

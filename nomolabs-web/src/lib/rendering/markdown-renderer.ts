import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import markedKatex from 'marked-katex-extension';
import type { ContentRenderer } from './types.js';

const marked = new Marked(
	markedHighlight({
		langPrefix: 'hljs language-',
		highlight(code, lang) {
			if (lang && hljs.getLanguage(lang)) {
				return hljs.highlight(code, { language: lang }).value;
			}
			return hljs.highlightAuto(code).value;
		}
	}),
	markedKatex({ throwOnError: false })
);

export const markdownRenderer: ContentRenderer = {
	extensions: ['.md'],

	render(source: string): string {
		return marked.parse(source) as string;
	},

	extractTags(source: string): string[] {
		const tags = new Set<string>();
		const regex = /(?:^|\s)#(\w+)/gm;
		let match;
		while ((match = regex.exec(source)) !== null) {
			tags.add(match[1].toLowerCase());
		}
		return [...tags].sort();
	}
};

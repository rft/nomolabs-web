import { Marked, type TokenizerAndRendererExtension } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import markedKatex from 'marked-katex-extension';
import type { ContentRenderer } from './types.js';

/**
 * Inline extension turning #tag into a filter link. Running at the tokenizer
 * level means code blocks and inline code are never touched (unlike the old
 * post-render regex, which rewrote things like `#include` inside <pre>).
 */
const docTag: TokenizerAndRendererExtension = {
	name: 'docTag',
	level: 'inline',
	start(src: string) {
		return src.match(/(?:^|\s)#\w/)?.index;
	},
	tokenizer(src: string) {
		const match = /^(\s?)#(\w+)/.exec(src);
		if (!match) return undefined;
		return {
			type: 'docTag',
			raw: match[0],
			prefix: match[1],
			tag: match[2]
		};
	},
	renderer(token) {
		return `${token.prefix}<a class="doc-tag" href="/blogs?tags=${token.tag.toLowerCase()}">#${token.tag}</a>`;
	}
};

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
	markedKatex({ throwOnError: false, nonStandard: true }),
	{ extensions: [docTag] }
);

/** Remove fenced code blocks and inline code so their contents aren't mistaken for tags. */
function stripCode(source: string): string {
	return source.replace(/^(```|~~~).*?^\1/gms, '').replace(/`[^`\n]*`/g, '');
}

export const markdownRenderer: ContentRenderer = {
	extensions: ['.md'],

	render(source: string): string {
		return marked.parse(source) as string;
	},

	extractTags(source: string): string[] {
		const tags = new Set<string>();
		const regex = /(?:^|\s)#(\w+)/gm;
		const searchable = stripCode(source);
		let match;
		while ((match = regex.exec(searchable)) !== null) {
			tags.add(match[1].toLowerCase());
		}
		return [...tags].sort();
	}
};

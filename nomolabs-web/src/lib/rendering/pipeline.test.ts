import { describe, expect, it } from 'vitest';
import { extractHeadings, resolveEmbeds, resolveWikiLinks } from './pipeline.js';

describe('resolveEmbeds', () => {
	it('converts image embeds to markdown images with raw GitHub URLs', () => {
		expect(resolveEmbeds('![[diagram.png]]')).toBe(
			'![diagram.png](https://raw.githubusercontent.com/rft/public-notes/main/Assets/diagram.png)'
		);
	});

	it('uses the alt text after the pipe when present', () => {
		expect(resolveEmbeds('![[diagram.png|My Diagram]]')).toContain('![My Diagram](');
	});

	it('converts video embeds to <video> tags', () => {
		const html = resolveEmbeds('![[clip.mp4]]');
		expect(html).toContain('<video controls>');
		expect(html).toContain('Assets/clip.mp4');
	});

	it('respects explicit paths without prepending Assets/', () => {
		expect(resolveEmbeds('![[img/pic.png]]')).toContain('main/img/pic.png');
	});
});

describe('resolveWikiLinks', () => {
	it('converts wiki links to blog links', () => {
		expect(resolveWikiLinks('See [[Other Page]]')).toBe('See [Other Page](/blogs/Other%20Page)');
	});

	it('supports display text', () => {
		expect(resolveWikiLinks('[[Other Page|click here]]')).toBe('[click here](/blogs/Other%20Page)');
	});

	it('resolves space/underscore variants against known slugs', () => {
		const known = new Set(['Other_Page']);
		expect(resolveWikiLinks('[[Other Page]]', known)).toBe('[Other Page](/blogs/Other_Page)');
	});

	it('renders unknown targets as plain text instead of dead links', () => {
		const known = new Set(['Existing']);
		expect(resolveWikiLinks('[[Missing Page]]', known, true)).toBe(
			'<span class="broken-wikilink">Missing Page</span>'
		);
	});

	it('leaves embeds alone when they were already resolved', () => {
		const source = resolveEmbeds('![[pic.png]]');
		expect(resolveWikiLinks(source, undefined)).toBe(source);
	});
});

describe('extractHeadings', () => {
	it('adds ids and returns the heading list', () => {
		const { html, headings } = extractHeadings('<h2>Hello World</h2>');
		expect(html).toBe('<h2 id="hello-world">Hello World</h2>');
		expect(headings).toEqual([{ level: 2, text: 'Hello World', id: 'hello-world' }]);
	});

	it('deduplicates repeated heading ids', () => {
		const { headings } = extractHeadings('<h2>Setup</h2><h2>Setup</h2>');
		expect(headings.map((h) => h.id)).toEqual(['setup', 'setup-1']);
	});

	it('strips inner tags and entities from heading text', () => {
		const { headings } = extractHeadings('<h3><code>foo &amp; bar</code></h3>');
		expect(headings[0].text).toBe('foo & bar');
	});
});

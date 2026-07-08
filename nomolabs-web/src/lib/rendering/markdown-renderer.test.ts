import { describe, expect, it } from 'vitest';
import { markdownRenderer } from './markdown-renderer.js';

describe('markdownRenderer.render', () => {
	it('renders #tags in prose as filter links', () => {
		const html = markdownRenderer.render('Some text about #Linux setups');
		expect(html).toContain('<a class="doc-tag" href="/blogs?tags=linux">#Linux</a>');
	});

	it('renders a #tag at the start of a line', () => {
		const html = markdownRenderer.render('#linux #setup\n\nContent here');
		expect(html).toContain('href="/blogs?tags=linux"');
		expect(html).toContain('href="/blogs?tags=setup"');
	});

	it('does not rewrite # inside fenced code blocks', () => {
		const html = markdownRenderer.render('```c\n#include <stdio.h>\n```');
		expect(html).not.toContain('doc-tag');
		expect(html).toContain('include');
	});

	it('does not rewrite # inside inline code', () => {
		const html = markdownRenderer.render('Use `#pragma once` here');
		expect(html).not.toContain('doc-tag');
	});

	it('does not treat mid-word # as a tag', () => {
		const html = markdownRenderer.render('C# and foo#bar stay as-is');
		expect(html).not.toContain('doc-tag');
	});

	it('still renders markdown headings normally', () => {
		const html = markdownRenderer.render('# Title');
		expect(html).toContain('<h1>Title</h1>');
	});
});

describe('markdownRenderer.extractTags', () => {
	it('extracts, lowercases, and sorts tags', () => {
		expect(markdownRenderer.extractTags('#Zebra text #apple')).toEqual(['apple', 'zebra']);
	});

	it('ignores tags inside fenced code blocks', () => {
		const source = 'Real #tag\n\n```bash\n#!/bin/sh\necho "#nottag"\n```\n';
		expect(markdownRenderer.extractTags(source)).toEqual(['tag']);
	});

	it('ignores tags inside inline code', () => {
		expect(markdownRenderer.extractTags('Use `#fff` for white')).toEqual([]);
	});

	it('deduplicates tags', () => {
		expect(markdownRenderer.extractTags('#one #one #ONE')).toEqual(['one']);
	});
});

export interface Heading {
	level: number;
	text: string;
	id: string;
}

export interface RenderResult {
	html: string;
	tags: string[];
	headings: Heading[];
}

export interface ContentRenderer {
	/** File extensions this renderer handles (e.g. ['.md']) */
	extensions: string[];

	/** Render source content to HTML */
	render(source: string): string | Promise<string>;

	/** Extract tags from source content */
	extractTags(source: string): string[];
}

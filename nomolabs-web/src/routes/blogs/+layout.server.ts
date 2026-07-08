import { fetchAllNotes } from '$lib/github';

function extractBlogLinks(html: string): string[] {
	const slugs: string[] = [];
	const re = /href="\/blogs\/([^"?#]+)"/g;
	let m;
	while ((m = re.exec(html)) !== null) {
		slugs.push(decodeURIComponent(m[1]));
	}
	return [...new Set(slugs)];
}

export async function load({ fetch }) {
	const notes = await fetchAllNotes(fetch);

	const tagCounts = new Map<string, number>();
	for (const note of notes) {
		for (const tag of note.tags) {
			tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
		}
	}

	const allTags = [...tagCounts.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

	// Build reference graph: slug -> outgoing link slugs
	const slugSet = new Set(notes.map((n) => n.slug));
	const references: Record<string, string[]> = {};
	for (const note of notes) {
		const links = extractBlogLinks(note.html).filter((s) => slugSet.has(s) && s !== note.slug);
		if (links.length > 0) {
			references[note.slug] = links;
		}
	}

	// Build title map for display
	const titles: Record<string, string> = {};
	for (const note of notes) {
		titles[note.slug] = note.title;
	}

	// The grid page only needs metadata and a short preview, not full articles.
	const docs = notes.map(({ slug, title, mtime, tags, previewHtml }) => ({
		slug,
		title,
		mtime,
		tags,
		previewHtml
	}));

	return { docs, allTags, references, titles };
}

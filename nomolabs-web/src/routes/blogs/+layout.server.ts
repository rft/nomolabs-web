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
	const docs = await fetchAllNotes(fetch);

	const validDocs = docs.filter((d): d is NonNullable<typeof d> => d !== null);

	const tagCounts = new Map<string, number>();
	for (const doc of validDocs) {
		for (const tag of doc.tags) {
			tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
		}
	}

	const allTags = [...tagCounts.entries()]
		.filter(([name]) => name !== 'incomplete')
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

	// Build reference graph: slug -> outgoing link slugs
	const slugSet = new Set(validDocs.map((d) => d.slug));
	const references: Record<string, string[]> = {};
	for (const doc of validDocs) {
		const links = extractBlogLinks(doc.html).filter((s) => slugSet.has(s) && s !== doc.slug);
		if (links.length > 0) {
			references[doc.slug] = links;
		}
	}

	// Build title map for display
	const titles: Record<string, string> = {};
	for (const doc of validDocs) {
		titles[doc.slug] = doc.title;
	}

	return { docs, allTags, references, titles };
}

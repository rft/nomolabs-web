import { fetchAllNotes } from '$lib/github';

export async function load({ fetch }) {
	const docs = await fetchAllNotes(fetch);

	const tagCounts = new Map<string, number>();
	for (const doc of docs) {
		for (const tag of doc.tags) {
			tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
		}
	}

	const allTags = [...tagCounts.entries()]
		.filter(([name]) => name !== 'incomplete')
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

	return { docs, allTags };
}

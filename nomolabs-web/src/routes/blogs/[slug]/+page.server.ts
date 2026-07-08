import { error } from '@sveltejs/kit';
import { fetchAllNotes, fetchNote } from '$lib/github';
import type { EntryGenerator } from './$types';

// Tell the prerenderer about every note up front instead of relying on
// crawled links to discover them.
export const entries: EntryGenerator = async () => {
	const notes = await fetchAllNotes(fetch);
	return notes.map((n) => ({ slug: n.slug }));
};

export async function load({ params, fetch }) {
	const doc = await fetchNote(params.slug, fetch);
	if (!doc) error(404, 'Blog not found');
	return doc;
}

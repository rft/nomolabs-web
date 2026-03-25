import { error } from '@sveltejs/kit';
import { fetchNote } from '$lib/github';

export async function load({ params, fetch }) {
	const doc = await fetchNote(params.slug, fetch);
	if (!doc) error(404, 'Article not found');
	return doc;
}

import { fetchAllNotes } from '$lib/github';

export async function load({ fetch }) {
	const docs = await fetchAllNotes(fetch);
	return { docs };
}

export interface TagFilters {
	included: string[];
	excluded: string[];
}

/** Parse the tags/ntags filter query params shared by the blog grid and slug pages. */
export function parseTagFilters(searchParams: URLSearchParams): TagFilters {
	return {
		included: searchParams.get('tags')?.split(',').filter(Boolean) ?? [],
		excluded: searchParams.get('ntags')?.split(',').filter(Boolean) ?? []
	};
}

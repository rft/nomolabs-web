import { getRenderer, renderContent } from './rendering/index.js';

const REPO = 'rft/public-notes';

export function githubHeaders() {
	const token = import.meta.env.VITE_GITHUB_TOKEN;
	return token ? { Authorization: `token ${token}` } : {};
}

export function extractTitle(filename: string): string {
	return filename.replace(/\.md$/, '').replace(/_/g, ' ');
}

const EXCLUDED = ['readme.md'];

const SUPPORTED_EXTENSIONS = ['.md'];

export async function fetchAllNotes(fetchFn: typeof fetch) {
	const headers = githubHeaders();

	const listRes = await fetchFn(
		`https://api.github.com/repos/${REPO}/contents/`,
		{ headers }
	);
	if (!listRes.ok) {
		console.error(`GitHub API error: ${listRes.status} ${listRes.statusText}`);
		return [];
	}
	const files: { name: string; path: string; download_url: string }[] = await listRes.json();
	if (!Array.isArray(files)) {
		console.error('GitHub API did not return an array:', files);
		return [];
	}
	const supportedFiles = files.filter(
		(f) =>
			SUPPORTED_EXTENSIONS.some((ext) => f.name.endsWith(ext)) &&
			!EXCLUDED.includes(f.name.toLowerCase())
	);

	const docs = await Promise.all(
		supportedFiles.map(async (f) => {
			const renderer = getRenderer(f.name);
			if (!renderer) return null;

			const [contentRes, commitRes] = await Promise.all([
				fetchFn(f.download_url),
				fetchFn(
					`https://api.github.com/repos/${REPO}/commits?path=${encodeURIComponent(f.path)}&per_page=1`,
					{ headers }
				)
			]);
			const source = await contentRes.text();
			const commits: { commit: { committer: { date: string } } }[] = await commitRes.json();
			const date = commits[0]?.commit?.committer?.date;
			const slug = f.name.replace(/\.[^.]+$/, '');
			const { html, tags } = await renderContent(source, renderer);
			return {
				slug,
				title: extractTitle(f.name),
				mtime: date ? new Date(date).toISOString() : new Date(0).toISOString(),
				html,
				tags
			};
		})
	);

	const validDocs = docs.filter((d) => d !== null && !d.tags.includes('incomplete'));
	validDocs.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
	return validDocs;
}

export async function fetchNote(slug: string, fetchFn: typeof fetch) {
	const headers = githubHeaders();
	const filename = `${slug}.md`;
	const filePath = encodeURIComponent(filename);

	const renderer = getRenderer(filename);
	if (!renderer) return null;

	const [contentRes, commitRes] = await Promise.all([
		fetchFn(`https://api.github.com/repos/${REPO}/contents/${filePath}`, { headers }),
		fetchFn(
			`https://api.github.com/repos/${REPO}/commits?path=${filePath}&per_page=1`,
			{ headers }
		)
	]);

	if (!contentRes.ok) return null;

	const file: { download_url: string } = await contentRes.json();
	const rawRes = await fetchFn(file.download_url);
	const source = await rawRes.text();

	const commits: { commit: { committer: { date: string } } }[] = await commitRes.json();
	const date = commits[0]?.commit?.committer?.date;

	const { html, tags } = await renderContent(source, renderer);

	return {
		slug,
		title: extractTitle(filename),
		mtime: date ? new Date(date).toISOString() : new Date(0).toISOString(),
		html,
		tags
	};
}

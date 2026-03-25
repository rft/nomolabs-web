import { marked } from 'marked';

const REPO = 'rft/public-notes';

export function githubHeaders() {
	const token = import.meta.env.VITE_GITHUB_TOKEN;
	return token ? { Authorization: `token ${token}` } : {};
}

export function extractTitle(filename: string): string {
	return filename.replace(/\.md$/, '').replace(/_/g, ' ');
}

export function extractTags(markdown: string): string[] {
	const tags = new Set<string>();
	const regex = /(?:^|\s)#(\w+)/gm;
	let match;
	while ((match = regex.exec(markdown)) !== null) {
		tags.add(match[1].toLowerCase());
	}
	return [...tags].sort();
}

function styleTagsInHtml(html: string): string {
	return html.replace(
		/((?:^|[\s>]))#(\w+)/g,
		(_, prefix, tag) =>
			`${prefix}<a class="doc-tag" href="/articles?tags=${tag.toLowerCase()}">#${tag}</a>`
	);
}

const EXCLUDED = ['readme.md'];

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
	const mdFiles = files.filter(
		(f) => f.name.endsWith('.md') && !EXCLUDED.includes(f.name.toLowerCase())
	);

	const docs = await Promise.all(
		mdFiles.map(async (f) => {
			const [contentRes, commitRes] = await Promise.all([
				fetchFn(f.download_url),
				fetchFn(
					`https://api.github.com/repos/${REPO}/commits?path=${encodeURIComponent(f.path)}&per_page=1`,
					{ headers }
				)
			]);
			const markdown = await contentRes.text();
			const commits: { commit: { committer: { date: string } } }[] = await commitRes.json();
			const date = commits[0]?.commit?.committer?.date;
			const slug = f.name.replace(/\.md$/, '');
			return {
				slug,
				title: extractTitle(f.name),
				mtime: date ? new Date(date).toISOString() : new Date(0).toISOString(),
				html: styleTagsInHtml(marked(markdown) as string),
				tags: extractTags(markdown)
			};
		})
	);

	docs.sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
	return docs;
}

export async function fetchNote(slug: string, fetchFn: typeof fetch) {
	const headers = githubHeaders();
	const filename = `${slug}.md`;
	const filePath = encodeURIComponent(filename);

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
	const markdown = await rawRes.text();

	const commits: { commit: { committer: { date: string } } }[] = await commitRes.json();
	const date = commits[0]?.commit?.committer?.date;

	return {
		slug,
		title: extractTitle(filename),
		mtime: date ? new Date(date).toISOString() : new Date(0).toISOString(),
		html: styleTagsInHtml(marked(markdown) as string),
		tags: extractTags(markdown)
	};
}

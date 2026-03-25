<script lang="ts">
	import { Pagination, ClickableTile } from 'carbon-components-svelte';

	let { data } = $props();

	let page = $state(1);
	let pageSize = $state(10);

	let paginatedDocs = $derived(
		data.docs.slice((page - 1) * pageSize, page * pageSize)
	);

	function stripHtml(html: string): string {
		return html.replace(/<[^>]*>/g, '');
	}

	function excerpt(html: string, maxLen = 150): string {
		const text = stripHtml(html).trim();
		if (text.length <= maxLen) return text;
		return text.slice(0, maxLen).trimEnd() + '...';
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<h1>Articles</h1>

<div class="articles-list">
	{#each paginatedDocs as doc (doc.slug)}
		<ClickableTile href="/articles/{encodeURIComponent(doc.slug)}">
			<h3>{doc.title}</h3>
			<p class="date">{formatDate(doc.mtime)}</p>
			<p class="excerpt">{excerpt(doc.html)}</p>
		</ClickableTile>
	{/each}
</div>

{#if data.docs.length > 0}
	<Pagination
		totalItems={data.docs.length}
		{pageSize}
		bind:page
		pageSizeInputDisabled
	/>
{/if}

<style>
	h1 {
		margin-bottom: 1.5rem;
	}

	.articles-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	h3 {
		margin: 0 0 0.25rem;
	}

	.date {
		font-size: 0.875rem;
		color: #525252;
		margin: 0 0 0.5rem;
	}

	.excerpt {
		margin: 0;
		color: #393939;
	}
</style>

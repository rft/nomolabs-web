<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { ClickableTile } from 'carbon-components-svelte';
	import { parseTagFilters } from '$lib/tag-filters';

	let { data } = $props();

	let filters = $derived(
		browser ? parseTagFilters(page.url.searchParams) : { included: [], excluded: [] }
	);

	let hasFilters = $derived(filters.included.length > 0 || filters.excluded.length > 0);

	let filteredDocs = $derived(
		!hasFilters
			? data.docs
			: data.docs.filter(
					(doc) =>
						filters.included.every((t) => doc.tags.includes(t)) &&
						filters.excluded.every((t) => !doc.tags.includes(t))
				)
	);
</script>

<h1>Blogs</h1>

{#if filteredDocs.length > 0}
	<div class="grid">
		{#each filteredDocs as doc (doc.slug)}
			<ClickableTile href="/blogs/{encodeURIComponent(doc.slug)}{browser ? page.url.search : ''}">
				<div class="preview">
					<div class="preview-content">
						{@html doc.previewHtml}
					</div>
				</div>
				<p class="title">{doc.title}</p>
			</ClickableTile>
		{/each}
	</div>
{:else if hasFilters}
	<p>No blogs match the selected tags.</p>
{:else}
	<p>No blogs yet.</p>
{/if}

<style>
	h1 {
		margin-bottom: 1.5rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	.preview {
		width: 100%;
		aspect-ratio: 1;
		overflow: hidden;
		position: relative;
		background: white;
		border: 1px solid var(--cds-border-subtle, #e0e0e0);
		pointer-events: none;
	}

	.preview-content {
		position: absolute;
		top: 0;
		left: 0;
		width: 500px;
		padding: 1rem;
		transform: scale(0.4);
		transform-origin: top left;
		font-size: 14px;
		line-height: 1.4;
		color: #161616;
	}

	.title {
		margin: 0.5rem 0 0;
		font-weight: 500;
	}
</style>

<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { ClickableTile } from 'carbon-components-svelte';

	let { data } = $props();

	let selectedTags: string[] = $derived.by(() => {
		if (!browser) return [];
		return $page.url.searchParams.get('tags')?.split(',').filter(Boolean) ?? [];
	});

	let filteredDocs = $derived(
		selectedTags.length === 0
			? data.docs
			: data.docs.filter((doc: { tags: string[] }) =>
					selectedTags.every((t) => doc.tags.includes(t))
				)
	);
</script>

<h1>Articles</h1>

{#if filteredDocs.length > 0}
	<div class="grid">
		{#each filteredDocs as doc (doc.slug)}
			<ClickableTile href="/articles/{encodeURIComponent(doc.slug)}{browser ? $page.url.search : ''}">
				<div class="preview">
					<div class="preview-content">
						{@html doc.html}
					</div>
				</div>
				<p class="title">{doc.title}</p>
			</ClickableTile>
		{/each}
	</div>
{:else if selectedTags.length > 0}
	<p>No articles match the selected tags.</p>
{:else}
	<p>No articles yet.</p>
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
	}

	.title {
		margin: 0.5rem 0 0;
		font-weight: 500;
	}
</style>

<script lang="ts">
	import { ClickableTile } from 'carbon-components-svelte';

	let { data } = $props();
</script>

<h1>Articles</h1>

{#if data.docs.length > 0}
	<div class="grid">
		{#each data.docs as doc (doc.slug)}
			<ClickableTile href="/articles/{encodeURIComponent(doc.slug)}">
				<div class="square"></div>
				<p class="title">{doc.title}</p>
			</ClickableTile>
		{/each}
	</div>
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

	.square {
		width: 100%;
		aspect-ratio: 1;
		background-color: var(--cds-layer-02, #e0e0e0);
	}

	.title {
		margin: 0.5rem 0 0;
		font-weight: 500;
	}
</style>

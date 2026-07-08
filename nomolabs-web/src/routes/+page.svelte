<script lang="ts">
	import { Pagination } from 'carbon-components-svelte';

	let { data } = $props();

	let page = $state(1);
	let pageSize = $state(1);

	let current = $derived(data.docs[page - 1] ?? null);
</script>

<section class="blog-section">
	<h2>Latest Posts</h2>
	<hr />
	{#if current}
		<header class="article-header">
			<a class="title-link" href="/blogs/{encodeURIComponent(current.slug)}">
				<h3>{current.title}</h3>
			</a>
			<time datetime={current.mtime}>{new Date(current.mtime).toLocaleDateString()}</time>
			{#if current.tags?.length}
				<div class="tags">
					{#each current.tags as tag}
						<a class="doc-tag" href="/blogs?tags={tag.toLowerCase()}">#{tag}</a>
					{/each}
				</div>
			{/if}
		</header>

		<div class="article-content">
			{@html current.html}
		</div>
	{:else}
		<p>No notes yet.</p>
	{/if}
</section>

{#if data.docs.length > 1}
	<div class="pagination-fixed">
		<Pagination totalItems={data.docs.length} {pageSize} bind:page pageSizeInputDisabled />
	</div>
{/if}

<style>
	.pagination-fixed {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 100;
	}

	.blog-section {
		max-width: 800px;
		margin: 0 auto;
	}

	.blog-section h2 {
		margin-bottom: 1rem;
	}

	.blog-section hr {
		border: none;
		border-top: 1px solid var(--cds-border-subtle, #e0e0e0);
		margin: 0 0 1.5rem 0;
	}

	.title-link {
		text-decoration: none;
		color: inherit;
	}

	.title-link:hover {
		text-decoration: underline;
	}

	.article-header {
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--cds-border-subtle, #e0e0e0);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 0.5rem;
	}

	h3 {
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}

	time {
		display: block;
		color: var(--cds-text-secondary, #525252);
		margin-bottom: 2rem;
	}

	.article-content :global(.doc-tag) {
		display: none;
	}
</style>

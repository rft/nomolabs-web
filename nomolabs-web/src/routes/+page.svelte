<script lang="ts">
	import { Pagination, Link } from 'carbon-components-svelte';

	let { data } = $props();

	let page = $state(1);
	let pageSize = $state(1);

	let current = $derived(data.docs[page - 1] ?? null);
</script>

{#if current}
	<article class="latest">
		<Link href="/blogs/{encodeURIComponent(current.slug)}">
			<h1>{current.title}</h1>
		</Link>
		<time datetime={current.mtime}>
			{new Date(current.mtime).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})}
		</time>
		<div class="content">
			{@html current.html}
		</div>
	</article>
{:else}
	<p>No notes yet.</p>
{/if}

{#if data.docs.length > 1}
	<div class="pagination-fixed">
		<Pagination
			totalItems={data.docs.length}
			{pageSize}
			bind:page
			pageSizeInputDisabled
		/>
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

	.latest {
		max-width: 800px;
		padding-bottom: 3rem;
	}

	h1 {
		margin-bottom: 0.5rem;
	}

	time {
		display: block;
		color: var(--cds-text-secondary, #525252);
		margin-bottom: 2rem;
	}
</style>

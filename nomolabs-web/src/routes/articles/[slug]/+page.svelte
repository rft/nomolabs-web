<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { Link, Tag } from 'carbon-components-svelte';

	let { data } = $props();

	let search = $derived(browser ? $page.url.search : '');
</script>

<svelte:head>
	<title>{data.title} - NomoLabs</title>
</svelte:head>

<div class="article">
	<Link href="/articles{search}">← Back to articles</Link>
	<h1>{data.title}</h1>
	<time datetime={data.mtime}>{new Date(data.mtime).toLocaleDateString()}</time>

	{#if data.tags && data.tags.length > 0}
		<div class="article-tags">
			{#each data.tags as tag}
				<Tag type="teal" size="sm">{tag}</Tag>
			{/each}
		</div>
	{/if}

	<div class="article-content">
		{@html data.html}
	</div>
</div>

<style>
	.article {
		max-width: 800px;
	}

	h1 {
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}

	time {
		display: block;
		color: var(--cds-text-secondary, #525252);
		margin-bottom: 0.75rem;
	}

	.article-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-bottom: 2rem;
	}
</style>

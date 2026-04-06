<script lang="ts">
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { Link } from 'carbon-components-svelte';

	let { data } = $props();

	let search = $derived(browser ? $page.url.search : '');
</script>

<svelte:head>
	<title>{data.title} - NomoLabs</title>
</svelte:head>

<div class="article">
	<Link href="/blogs{search}">← Back to blogs</Link>
	<h1>{data.title}</h1>
	<time datetime={data.mtime}>{new Date(data.mtime).toLocaleDateString()}</time>

	<div class="article-content">
		{@html data.html}
	</div>
</div>

<style>
	.article {
		max-width: 800px;
		margin: 0 auto;
	}

	h1 {
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}

	time {
		display: block;
		color: var(--cds-text-secondary, #525252);
		margin-bottom: 2rem;
	}
</style>

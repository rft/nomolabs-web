<script lang="ts">
	import { Link } from 'carbon-components-svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title} - NomoLabs</title>
</svelte:head>

<div class="article">
	<Link href="/articles">← Back to articles</Link>
	<h1>{data.title}</h1>
	<time datetime={data.mtime}>{new Date(data.mtime).toLocaleDateString()}</time>
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
		margin-bottom: 2rem;
	}
</style>

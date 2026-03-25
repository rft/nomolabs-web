<script lang="ts">
	import { Link } from 'carbon-components-svelte';

	let { data } = $props();
</script>

{#if data.latest}
	<article class="latest">
		<Link href="/articles/{encodeURIComponent(data.latest.slug)}">
			<h1>{data.latest.title}</h1>
		</Link>
		<time datetime={data.latest.mtime}>
			{new Date(data.latest.mtime).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})}
		</time>
		<div class="content">
			{@html data.latest.html}
		</div>
	</article>
{:else}
	<p>No notes yet.</p>
{/if}

<style>
	.latest {
		max-width: 800px;
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

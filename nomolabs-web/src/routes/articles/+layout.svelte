<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { Tag, Search } from 'carbon-components-svelte';

	let { data, children } = $props();

	let searchQuery = $state('');

	let selectedTags: string[] = $derived.by(() => {
		if (!browser) return [];
		return $page.url.searchParams.get('tags')?.split(',').filter(Boolean) ?? [];
	});

	let filteredTags = $derived(
		data.allTags.filter(
			(t: { name: string; count: number }) =>
				t.name.includes(searchQuery.toLowerCase()) && !selectedTags.includes(t.name)
		)
	);

	function updateTags(tags: string[]) {
		const params = new URLSearchParams($page.url.searchParams);
		if (tags.length > 0) {
			params.set('tags', tags.join(','));
		} else {
			params.delete('tags');
		}
		const qs = params.toString();
		goto(`${$page.url.pathname}${qs ? '?' + qs : ''}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	function addTag(name: string) {
		if (!selectedTags.includes(name)) {
			updateTags([...selectedTags, name]);
		}
		searchQuery = '';
	}

	function removeTag(name: string) {
		updateTags(selectedTags.filter((t) => t !== name));
	}
</script>

<div class="articles-layout">
	<aside class="sidenav">
		<h4>Filter by tags</h4>

		{#if selectedTags.length > 0}
			<div class="selected-tags">
				{#each selectedTags as tag}
					<Tag filter on:close={() => removeTag(tag)} type="blue">{tag}</Tag>
				{/each}
			</div>
		{/if}

		<Search
			bind:value={searchQuery}
			placeholder="Search tags..."
			size="sm"
		/>

		<div class="available-tags">
			{#each filteredTags as tag}
				<button class="tag-btn" onclick={() => addTag(tag.name)}>
					<Tag type="outline" size="sm">{tag.name} ({tag.count})</Tag>
				</button>
			{/each}
		</div>
	</aside>

	<main class="articles-content">
		{@render children()}
	</main>
</div>

<style>
	.articles-layout {
		display: grid;
		grid-template-columns: 220px 1fr;
		gap: 2rem;
	}

	.sidenav {
		position: sticky;
		top: 4rem;
		align-self: start;
		max-height: calc(100vh - 5rem);
		overflow-y: auto;
	}

	.sidenav h4 {
		margin: 0 0 0.75rem;
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--cds-text-secondary, #525252);
	}

	.selected-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
	}

	.available-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 0.75rem;
	}

	.tag-btn {
		all: unset;
		cursor: pointer;
	}

	.tag-btn:hover :global(.bx--tag) {
		background-color: var(--cds-layer-hover, #e5e5e5);
	}

	.articles-content {
		min-width: 0;
	}

	@media (max-width: 672px) {
		.articles-layout {
			grid-template-columns: 1fr;
		}

		.sidenav {
			position: static;
			max-height: none;
		}
	}
</style>

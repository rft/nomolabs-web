<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { Tag, Search } from 'carbon-components-svelte';

	let { data, children } = $props();

	let searchQuery = $state('');

	interface TocNode {
		text: string;
		id: string;
		level: number;
		children: TocNode[];
	}

	function buildTocTree(flat: { level: number; text: string; id: string }[]): TocNode[] {
		const root: TocNode[] = [];
		const stack: TocNode[] = [];

		for (const h of flat) {
			const node: TocNode = { text: h.text, id: h.id, level: h.level, children: [] };
			while (stack.length > 0 && stack[stack.length - 1].level >= h.level) {
				stack.pop();
			}
			if (stack.length > 0) {
				stack[stack.length - 1].children.push(node);
			} else {
				root.push(node);
			}
			stack.push(node);
		}
		return root;
	}

	let headings = $derived($page.data.headings ?? []);
	let tocTree = $derived(buildTocTree(headings));

	let includedTags: string[] = $derived.by(() => {
		if (!browser) return [];
		return $page.url.searchParams.get('tags')?.split(',').filter(Boolean) ?? [];
	});

	let excludedTags: string[] = $derived.by(() => {
		if (!browser) return [];
		return $page.url.searchParams.get('ntags')?.split(',').filter(Boolean) ?? [];
	});

	let filteredTags = $derived(
		data.allTags.filter(
			(t: { name: string; count: number }) =>
				t.name.includes(searchQuery.toLowerCase())
		)
	);

	function updateUrl(included: string[], excluded: string[], navigateToGrid = false) {
		const params = new URLSearchParams(browser ? $page.url.searchParams : '');
		if (included.length > 0) {
			params.set('tags', included.join(','));
		} else {
			params.delete('tags');
		}
		if (excluded.length > 0) {
			params.set('ntags', excluded.join(','));
		} else {
			params.delete('ntags');
		}
		const qs = params.toString();
		const path = navigateToGrid ? '/blogs' : $page.url.pathname;
		goto(`${path}${qs ? '?' + qs : ''}`, {
			replaceState: !navigateToGrid,
			noScroll: !navigateToGrid,
			keepFocus: !navigateToGrid
		});
	}

	function includeTag(name: string, navigateToGrid = false) {
		const newExcluded = excludedTags.filter((t) => t !== name);
		if (includedTags.includes(name)) {
			updateUrl(includedTags.filter((t) => t !== name), newExcluded, navigateToGrid);
		} else {
			updateUrl([...includedTags, name], newExcluded, navigateToGrid);
		}
	}

	function excludeTag(name: string) {
		const newIncluded = includedTags.filter((t) => t !== name);
		if (excludedTags.includes(name)) {
			updateUrl(newIncluded, excludedTags.filter((t) => t !== name));
		} else {
			updateUrl(newIncluded, [...excludedTags, name]);
		}
	}

	function clearTag(name: string) {
		updateUrl(
			includedTags.filter((t) => t !== name),
			excludedTags.filter((t) => t !== name)
		);
	}

	function tagState(name: string): 'include' | 'exclude' | 'none' {
		if (includedTags.includes(name)) return 'include';
		if (excludedTags.includes(name)) return 'exclude';
		return 'none';
	}
</script>

{#snippet tocNode(node: TocNode)}
	<li class="toc-item">
		{#if node.children.length > 0}
			<details class="toc-subtree" open>
				<summary><a href="#{node.id}">{node.text}</a></summary>
				<ol class="toc-list">
					{#each node.children as child}
						{@render tocNode(child)}
					{/each}
				</ol>
			</details>
		{:else}
			<a href="#{node.id}">{node.text}</a>
		{/if}
	</li>
{/snippet}

<div class="articles-layout">
	<aside class="sidenav">
		{#if headings.length > 0}
			<details class="sidebar-section" open>
				<summary class="sidebar-heading">Contents</summary>
				<ol class="toc-list">
					{#each tocTree as node}
						{@render tocNode(node)}
					{/each}
				</ol>
			</details>
			<hr class="toc-divider" />
		{/if}

		<details class="sidebar-section" open>
			<summary class="sidebar-heading">Filter by tags</summary>

			<Search
				bind:value={searchQuery}
				placeholder="Search tags..."
				size="sm"
			/>

			<div class="tag-list">
				{#each filteredTags as tag}
					{@const state = tagState(tag.name)}
					<div class="tag-row" class:active-include={state === 'include'} class:active-exclude={state === 'exclude'}>
						<button
							class="mode-btn include-btn"
							class:active={state === 'include'}
							onclick={() => includeTag(tag.name)}
							title="Include {tag.name}"
						>+</button>
						<button
							class="mode-btn exclude-btn"
							class:active={state === 'exclude'}
							onclick={() => excludeTag(tag.name)}
							title="Exclude {tag.name}"
						>&minus;</button>
						<button class="tag-label" onclick={() => includeTag(tag.name, true)} title="Filter by {tag.name}">
							<Tag
								type={state === 'include' ? 'teal' : state === 'exclude' ? 'red' : 'outline'}
								size="sm"
							>{tag.name}</Tag>
						</button>
						<span class="tag-count">{tag.count}</span>
					</div>
				{/each}
			</div>
		</details>
	</aside>

	<main class="articles-content">
		{@render children()}
	</main>
</div>

<style>
	.articles-layout {
		display: grid;
		grid-template-columns: 250px 1fr;
		gap: 0;
		margin: -2rem;
	}

	.sidenav {
		position: sticky;
		top: 4rem;
		align-self: start;
		max-height: calc(100vh - 5rem);
		overflow-y: auto;
		padding: 1rem;
		border-right: 1px solid var(--cds-border-subtle, #e0e0e0);
	}

	.sidebar-heading {
		margin: 0 0 0.75rem;
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--cds-text-secondary, #525252);
		cursor: pointer;
		list-style: none;
	}

	.sidebar-heading::-webkit-details-marker {
		display: none;
	}

	.sidebar-heading::before {
		content: '▶';
		display: inline-block;
		margin-right: 0.4rem;
		font-size: 0.625rem;
		transition: transform 0.15s ease;
	}

	.sidebar-section[open] > .sidebar-heading::before {
		transform: rotate(90deg);
	}

	.toc-list {
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: 0.8125rem;
		line-height: 1.4;
	}

	.toc-item :global(a) {
		display: block;
		padding: 0.2rem 0;
		color: var(--cds-link-primary, #0f62fe);
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
		flex: 1;
	}

	.toc-item :global(a:hover) {
		text-decoration: underline;
	}

	.toc-subtree {
		margin: 0;
	}

	.toc-subtree > summary {
		list-style: none;
		cursor: pointer;
		display: flex;
		align-items: center;
	}

	.toc-subtree > summary::-webkit-details-marker {
		display: none;
	}

	.toc-subtree > summary::before {
		content: '▶';
		display: inline-block;
		margin-right: 0.3rem;
		font-size: 0.5rem;
		vertical-align: middle;
		transition: transform 0.15s ease;
	}

	.toc-subtree[open] > summary::before {
		transform: rotate(90deg);
	}

	.toc-subtree > .toc-list {
		padding-left: 0.75rem;
	}

	.toc-divider {
		border: none;
		border-top: 1px solid var(--cds-border-subtle, #e0e0e0);
		margin: 0.75rem 0;
	}

	.tag-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-top: 0.75rem;
	}

	.tag-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0;
		border-radius: 2px;
	}

	.tag-row.active-include {
		background: color-mix(in srgb, var(--cds-support-success, #198038) 8%, transparent);
	}

	.tag-row.active-exclude {
		background: color-mix(in srgb, var(--cds-support-error, #da1e28) 8%, transparent);
	}

	.mode-btn {
		all: unset;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		font-size: 0.875rem;
		font-weight: 600;
		border-radius: 2px;
		cursor: pointer;
		color: var(--cds-text-secondary, #525252);
		background: var(--cds-field-01, #f4f4f4);
		flex-shrink: 0;
	}

	.mode-btn:hover {
		background: var(--cds-layer-hover, #e5e5e5);
	}

	.include-btn.active {
		background: var(--cds-support-success, #198038);
		color: white;
	}

	.exclude-btn.active {
		background: var(--cds-support-error, #da1e28);
		color: white;
	}

	.tag-label {
		all: unset;
		flex: 1;
		min-width: 0;
		cursor: pointer;
	}

	.tag-count {
		font-size: 0.75rem;
		color: var(--cds-text-secondary, #525252);
		flex-shrink: 0;
		margin-right: 0.25rem;
	}

	.articles-content {
		min-width: 0;
		padding: 2rem;
		padding-top: 0;
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

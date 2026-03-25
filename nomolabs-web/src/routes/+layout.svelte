<script lang="ts">
	import 'carbon-components-svelte/css/white.css';
	import {
		Header,
		HeaderNav,
		HeaderNavItem,
		Content
	} from 'carbon-components-svelte';

	let { children } = $props();
</script>

<Header platformName="NomoLabs">
	{#snippet children()}
		<HeaderNav>
			<HeaderNavItem href="/" text="Home" />
			<HeaderNavItem href="/articles" text="Articles" />
			<HeaderNavItem href="/tools" text="Tools" />
		</HeaderNav>
	{/snippet}
</Header>

<Content>
	<div class="centered">
		{@render children()}
	</div>
</Content>

<style>
	.centered {
		max-width: 960px;
		margin: 0 auto;
	}

	:global(.doc-tag) {
		display: inline-block;
		padding: 0.1em 0.5em;
		margin: 0 0.1em;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: 1rem;
		background-color: var(--cds-tag-background-teal, #d9fbfb);
		color: var(--cds-tag-color-teal, #004144);
		vertical-align: baseline;
	}
</style>

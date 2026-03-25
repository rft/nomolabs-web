<script lang="ts">
	import 'carbon-components-svelte/css/white.css';
	import favicon from '$lib/assets/favicon.svg';
	import {
		Header,
		HeaderNav,
		HeaderNavItem,
		Content
	} from 'carbon-components-svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

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
	{@render children()}
</Content>

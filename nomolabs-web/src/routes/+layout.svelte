<script lang="ts">
	import 'carbon-components-svelte/css/all.css';
	import hljsLight from 'highlight.js/styles/github.css?url';
	import hljsDark from 'highlight.js/styles/github-dark.css?url';
	import 'katex/dist/katex.min.css';
	import '$lib/styles/article-content.css';
	import {
		Header,
		HeaderNav,
		HeaderNavItem,
		SideNav,
		SideNavItems,
		SideNavLink,
		Content,
		Theme,
		HeaderUtilities,
		HeaderGlobalAction
	} from 'carbon-components-svelte';
	import { browser } from '$app/environment';
	import Light from 'carbon-icons-svelte/lib/Light.svelte';
	import Moon from 'carbon-icons-svelte/lib/Moon.svelte';

	let { children } = $props();
	let isSideNavOpen = $state(false);

	let dark = $state(browser ? localStorage.getItem('theme') !== 'white' : true);
	let theme: 'white' | 'g100' = $derived(dark ? 'g100' : 'white');
	let darkIcon = $derived(dark ? Light : Moon);

	$effect(() => {
		if (browser) {
			localStorage.setItem('theme', dark ? 'g100' : 'white');
		}
	});

	function toggleDark() {
		dark = !dark;
	}
</script>

<svelte:head>
	<link rel="stylesheet" href={dark ? hljsDark : hljsLight} />
</svelte:head>

<Theme {theme} />

<Header platformName="NomoLabs" href="/" bind:isSideNavOpen>
	<HeaderNav>
		<HeaderNavItem href="/" text="Home" />
		<HeaderNavItem href="/blogs" text="Blogs" />
		<HeaderNavItem href="/tools" text="Tools" />
	</HeaderNav>
	<HeaderUtilities>
		<HeaderGlobalAction aria-label="Toggle dark mode" icon={darkIcon} hideTooltip on:click={toggleDark} />
	</HeaderUtilities>
</Header>

<SideNav bind:isOpen={isSideNavOpen}>
	<SideNavItems>
		<SideNavLink href="/" text="Home" />
		<SideNavLink href="/blogs" text="Blogs" />
		<SideNavLink href="/tools" text="Tools" />
	</SideNavItems>
</SideNav>

<Content>
	{@render children()}
</Content>

<style>
	/* Hide hamburger menu and sidenav on desktop */
	@media (min-width: 1056px) {
		:global(.bx--header__menu-toggle) {
			display: none;
		}
		:global(.bx--side-nav) {
			display: none;
		}
	}

	:global(.bx--header__action) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	:global(a.doc-tag) {
		display: inline-block;
		padding: 0.1em 0.5em;
		margin: 0 0.1em;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: 1rem;
		background-color: var(--cds-tag-background-teal, #d9fbfb);
		color: var(--cds-tag-color-teal, #004144);
		vertical-align: baseline;
		text-decoration: none;
	}

	:global(a.doc-tag:hover) {
		background-color: var(--cds-tag-hover-teal, #9ef0f0);
	}
</style>

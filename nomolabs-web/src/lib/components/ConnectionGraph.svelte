<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import * as d3 from 'd3';

	interface Props {
		references: Record<string, string[]>;
		titles: Record<string, string>;
		currentSlug?: string;
	}

	let { references, titles, currentSlug = '' }: Props = $props();

	let container: HTMLDivElement;
	let width = $state(0);
	let height = $state(400);

	interface GraphNode extends d3.SimulationNodeDatum {
		id: string;
		title: string;
		connections: number;
	}

	interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
		source: string | GraphNode;
		target: string | GraphNode;
	}

	function buildGraph(): { nodes: GraphNode[]; links: GraphLink[] } {
		const connectionCount = new Map<string, number>();

		// Count all connections (outgoing + incoming)
		for (const [from, tos] of Object.entries(references)) {
			connectionCount.set(from, (connectionCount.get(from) ?? 0) + tos.length);
			for (const to of tos) {
				connectionCount.set(to, (connectionCount.get(to) ?? 0) + 1);
			}
		}

		// Only include nodes that have at least one connection
		const connectedSlugs = new Set<string>();
		for (const [from, tos] of Object.entries(references)) {
			connectedSlugs.add(from);
			for (const to of tos) {
				connectedSlugs.add(to);
			}
		}

		const nodes: GraphNode[] = [...connectedSlugs].map((slug) => ({
			id: slug,
			title: titles[slug] ?? slug,
			connections: connectionCount.get(slug) ?? 0
		}));

		const links: GraphLink[] = [];
		for (const [from, tos] of Object.entries(references)) {
			for (const to of tos) {
				links.push({ source: from, target: to });
			}
		}

		return { nodes, links };
	}

	onMount(() => {
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				width = entry.contentRect.width;
			}
		});
		resizeObserver.observe(container);

		let simulation: d3.Simulation<GraphNode, GraphLink>;

		function render() {
			if (width === 0) return;

			// Clear previous
			d3.select(container).select('svg').remove();

			const { nodes, links } = buildGraph();
			if (nodes.length === 0) return;

			const maxConnections = d3.max(nodes, (d) => d.connections) ?? 1;
			const radiusScale = d3.scaleSqrt().domain([0, maxConnections]).range([4, 18]);

			const svg = d3
				.select(container)
				.append('svg')
				.attr('width', width)
				.attr('height', height)
				.attr('viewBox', [0, 0, width, height]);

			// Zoom behavior
			const g = svg.append('g');

			const zoom = d3
				.zoom<SVGSVGElement, unknown>()
				.scaleExtent([0.3, 4])
				.on('zoom', (event) => {
					g.attr('transform', event.transform);
				});

			svg.call(zoom);

			// Arrow marker for directed edges
			svg
				.append('defs')
				.append('marker')
				.attr('id', 'arrowhead')
				.attr('viewBox', '0 -3 6 6')
				.attr('refX', 6)
				.attr('refY', 0)
				.attr('markerWidth', 4)
				.attr('markerHeight', 4)
				.attr('orient', 'auto')
				.append('path')
				.attr('d', 'M0,-3L6,0L0,3')
				.attr('fill', 'var(--cds-text-secondary, #525252)')
				.attr('opacity', 0.4);

			simulation = d3
				.forceSimulation(nodes)
				.force(
					'link',
					d3
						.forceLink<GraphNode, GraphLink>(links)
						.id((d) => d.id)
						.distance(60)
				)
				.force('charge', d3.forceManyBody().strength(-120))
				.force('center', d3.forceCenter(width / 2, height / 2))
				.force(
					'collision',
					d3.forceCollide<GraphNode>().radius((d) => radiusScale(d.connections) + 2)
				);

			const link = g
				.append('g')
				.selectAll('line')
				.data(links)
				.join('line')
				.attr('stroke', 'var(--cds-border-subtle, #e0e0e0)')
				.attr('stroke-opacity', 0.6)
				.attr('stroke-width', 1)
				.attr('marker-end', 'url(#arrowhead)');

			const node = g
				.append('g')
				.selectAll<SVGGElement, GraphNode>('g')
				.data(nodes)
				.join('g')
				.attr('cursor', 'pointer')
				.call(
					d3
						.drag<SVGGElement, GraphNode>()
						.on('start', (event, d) => {
							if (!event.active) simulation.alphaTarget(0.3).restart();
							d.fx = d.x;
							d.fy = d.y;
						})
						.on('drag', (event, d) => {
							d.fx = event.x;
							d.fy = event.y;
						})
						.on('end', (event, d) => {
							if (!event.active) simulation.alphaTarget(0);
							d.fx = null;
							d.fy = null;
						})
				);

			// Node circles
			node
				.append('circle')
				.attr('r', (d) => radiusScale(d.connections))
				.attr('fill', (d) =>
					d.id === currentSlug
						? 'var(--cds-interactive, #0f62fe)'
						: 'var(--cds-link-primary, #0f62fe)'
				)
				.attr('opacity', (d) => (d.id === currentSlug ? 1 : 0.6))
				.attr('stroke', (d) =>
					d.id === currentSlug ? 'var(--cds-focus, #0f62fe)' : 'none'
				)
				.attr('stroke-width', (d) => (d.id === currentSlug ? 2.5 : 0));

			// Labels
			node
				.append('text')
				.text((d) => d.title)
				.attr('font-size', '9px')
				.attr('dx', (d) => radiusScale(d.connections) + 3)
				.attr('dy', '0.35em')
				.attr('fill', 'var(--cds-text-primary, #161616)')
				.attr('pointer-events', 'none')
				.each(function () {
					// Truncate long labels
					const el = d3.select(this);
					const text = el.text();
					if (text.length > 20) {
						el.text(text.slice(0, 18) + '\u2026');
					}
				});

			// Tooltip
			const tooltip = d3
				.select(container)
				.append('div')
				.attr('class', 'graph-tooltip')
				.style('opacity', 0);

			node
				.on('mouseover', (event, d) => {
					tooltip
						.style('opacity', 1)
						.html(
							`<strong>${d.title}</strong><br/>${d.connections} connection${d.connections !== 1 ? 's' : ''}`
						)
						.style('left', event.offsetX + 10 + 'px')
						.style('top', event.offsetY - 10 + 'px');

					// Highlight connected links
					link
						.attr('stroke-opacity', (l) => {
							const s = typeof l.source === 'object' ? l.source.id : l.source;
							const t = typeof l.target === 'object' ? l.target.id : l.target;
							return s === d.id || t === d.id ? 1 : 0.15;
						})
						.attr('stroke-width', (l) => {
							const s = typeof l.source === 'object' ? l.source.id : l.source;
							const t = typeof l.target === 'object' ? l.target.id : l.target;
							return s === d.id || t === d.id ? 2 : 1;
						});

					// Dim unconnected nodes
					const connectedIds = new Set<string>();
					connectedIds.add(d.id);
					links.forEach((l) => {
						const s = typeof l.source === 'object' ? l.source.id : l.source;
						const t = typeof l.target === 'object' ? l.target.id : l.target;
						if (s === d.id) connectedIds.add(t);
						if (t === d.id) connectedIds.add(s);
					});

					node.select('circle').attr('opacity', (n) => (connectedIds.has(n.id) ? 1 : 0.15));
					node.select('text').attr('opacity', (n) => (connectedIds.has(n.id) ? 1 : 0.15));
				})
				.on('mouseout', () => {
					tooltip.style('opacity', 0);
					link.attr('stroke-opacity', 0.6).attr('stroke-width', 1);
					node
						.select('circle')
						.attr('opacity', (d) => (d.id === currentSlug ? 1 : 0.6));
					node.select('text').attr('opacity', 1);
				})
				.on('click', (_event, d) => {
					goto(`/blogs/${encodeURIComponent(d.id)}`);
				});

			simulation.on('tick', () => {
				link
					.attr('x1', (d) => (d.source as GraphNode).x!)
					.attr('y1', (d) => (d.source as GraphNode).y!)
					.attr('x2', (d) => {
						const s = d.source as GraphNode;
						const t = d.target as GraphNode;
						const r = radiusScale(t.connections);
						const dx = t.x! - s.x!;
						const dy = t.y! - s.y!;
						const dist = Math.sqrt(dx * dx + dy * dy) || 1;
						return t.x! - (dx / dist) * (r + 2);
					})
					.attr('y2', (d) => {
						const s = d.source as GraphNode;
						const t = d.target as GraphNode;
						const r = radiusScale(t.connections);
						const dx = t.x! - s.x!;
						const dy = t.y! - s.y!;
						const dist = Math.sqrt(dx * dx + dy * dy) || 1;
						return t.y! - (dy / dist) * (r + 2);
					});

				node.attr('transform', (d) => `translate(${d.x},${d.y})`);
			});
		}

		// Initial render once width is known
		const unwatch = $effect.root(() => {
			$effect(() => {
				if (width > 0) {
					render();
				}
			});
		});

		return () => {
			resizeObserver.disconnect();
			if (simulation) simulation.stop();
			unwatch();
		};
	});
</script>

<div class="connection-graph" bind:this={container}></div>

<style>
	.connection-graph {
		position: relative;
		width: 100%;
		min-height: 400px;
		border: 1px solid var(--cds-border-subtle, #e0e0e0);
		border-radius: 4px;
		overflow: hidden;
		background: var(--cds-ui-background, #ffffff);
	}

	.connection-graph :global(svg) {
		display: block;
	}

	.connection-graph :global(.graph-tooltip) {
		position: absolute;
		background: var(--cds-ui-01, #f4f4f4);
		border: 1px solid var(--cds-border-subtle, #e0e0e0);
		border-radius: 4px;
		padding: 0.4rem 0.6rem;
		font-size: 0.75rem;
		color: var(--cds-text-primary, #161616);
		pointer-events: none;
		white-space: nowrap;
		z-index: 10;
		transition: opacity 0.15s ease;
	}
</style>

<script lang="ts">
	import { Canvas } from '@threlte/core';
	import { TerrainGenerator } from '$lib/simulation/terrain';
	import Terrain from '$lib/components/viewport/Terrain.svelte';
	import CameraController from '$lib/components/viewport/CameraController.svelte';
	import Lighting from '$lib/components/viewport/Lighting.svelte';
	import Sky from '$lib/components/viewport/Sky.svelte';

	interface Props {
		isRaining?: boolean;
		slopeAngle?: number;
		maxElevation?: number;
	}

	let { isRaining = false, slopeAngle = 30, maxElevation = 50 }: Props = $props();

	// Terrain configuration
	const width = 128;
	const height = 128;
	const worldScale = 100;

	// Generate terrain heightmap
	const generator = new TerrainGenerator({
		width,
		height,
		worldScale,
		maxElevation,
		slopeAngle,
		noiseOctaves: 5,
		noisePersistence: 0.5,
		noiseScale: 0.025,
		ridgeSharpness: 0.45
	});

	let heightmap = $state<Float32Array>(generator.generateHeightmap());

	// Regenerate terrain when parameters change
	$effect(() => {
		generator.setConfig({ slopeAngle, maxElevation });
		heightmap = generator.generateHeightmap();
	});
</script>

<main class="flex-1 bg-neutral-900 relative overflow-hidden">
	<Canvas>
		<CameraController />
		<Lighting />
		<Sky {isRaining} />

		{#if heightmap && heightmap.length > 0}
			<Terrain
				{heightmap}
				{width}
				{height}
				{worldScale}
				{maxElevation}
			/>
		{/if}
	</Canvas>

	<!-- Overlay info -->
	<div class="absolute bottom-4 left-4 text-xs text-neutral-400 bg-neutral-900/80 backdrop-blur-sm px-3 py-2 rounded">
		<span class="text-neutral-500">Orbit:</span> drag &nbsp;
		<span class="text-neutral-500">Zoom:</span> scroll &nbsp;
		<span class="text-neutral-500">Pan:</span> right-drag
	</div>

	<!-- Status indicator -->
	{#if isRaining}
		<div class="absolute top-4 right-4 flex items-center gap-2 text-xs text-blue-400 bg-neutral-900/80 backdrop-blur-sm px-3 py-2 rounded">
			<span class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
			Rain Active
		</div>
	{/if}
</main>

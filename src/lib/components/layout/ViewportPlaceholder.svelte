<script lang="ts">
	import { Canvas } from '@threlte/core';
	import Terrain from '$lib/components/viewport/Terrain.svelte';
	import Trees from '$lib/components/viewport/Trees.svelte';
	import Rain from '$lib/components/viewport/Rain.svelte';
	import RainAudio from '$lib/components/viewport/RainAudio.svelte';
	import LandslideAudio from '$lib/components/viewport/LandslideAudio.svelte';
	import Debris from '$lib/components/viewport/Debris.svelte';
	import DustCloud from '$lib/components/viewport/DustCloud.svelte';
	import CameraController from '$lib/components/viewport/CameraController.svelte';
	import Lighting from '$lib/components/viewport/Lighting.svelte';
	import Sky from '$lib/components/viewport/Sky.svelte';
	import type { FailureZone } from '$lib/simulation/physics';

	interface Props {
		isRaining?: boolean;
		rainfallIntensity?: number;
		maxElevation?: number;
		vegetationCover?: number;
		soilDepth?: number;
		saturation?: number;
		porePressureRatio?: number;
		// Heightmap from page (single source of truth)
		heightmap: Float32Array;
		// Landslide deformation (terrain-based, no particles)
		isLandslideActive?: boolean;
		scarpDepth?: Float32Array | null;
		depositionDepth?: Float32Array | null;
		// Version counter to force terrain updates when arrays change in-place
		deformationVersion?: number;
		// Landslide progress and failure zone for debris particles
		landslideProgress?: number;
		failureZone?: FailureZone | null;
		landslideSeverity?: number;
		boulderDensity?: number;
	}

	let {
		isRaining = false,
		rainfallIntensity = 25,
		maxElevation = 50,
		vegetationCover = 70,
		soilDepth = 3.0,
		saturation = 0,
		porePressureRatio = 0,
		heightmap,
		isLandslideActive = false,
		scarpDepth = null,
		depositionDepth = null,
		deformationVersion = 0,
		landslideProgress = 0,
		failureZone = null,
		landslideSeverity = 50,
		boulderDensity = 15
	}: Props = $props();

	// Terrain configuration (shared constants)
	const width = 128;
	const height = 128;
	const worldScale = 100;
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
				{vegetationCover}
				{soilDepth}
				{saturation}
				{porePressureRatio}
				{scarpDepth}
				{depositionDepth}
				{deformationVersion}
			/>
			<Trees
				{heightmap}
				{width}
				{height}
				{worldScale}
				{maxElevation}
				maxTreeCount={150}
				maxSlope={25}
				{vegetationCover}
				{failureZone}
				{landslideProgress}
				{isLandslideActive}
			/>
		{/if}

		<Rain
			{isRaining}
			intensity={rainfallIntensity}
			{worldScale}
			{maxElevation}
		/>

		{#if heightmap && heightmap.length > 0}
			<Debris
				isActive={isLandslideActive}
				{failureZone}
				{heightmap}
				{width}
				{height}
				{worldScale}
				{maxElevation}
				progress={landslideProgress}
				severity={landslideSeverity}
				{boulderDensity}
			/>
			<DustCloud
				isActive={isLandslideActive}
				{failureZone}
				progress={landslideProgress}
				{worldScale}
				{maxElevation}
				severity={landslideSeverity}
			/>
		{/if}
	</Canvas>

	<!-- Rain Audio (outside Canvas - audio-only component) -->
	<RainAudio
		{isRaining}
		{rainfallIntensity}
	/>

	<!-- Landslide Audio (phase-synced rumble sound) -->
	<LandslideAudio
		isActive={isLandslideActive}
		progress={landslideProgress}
		severity={landslideSeverity}
	/>

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

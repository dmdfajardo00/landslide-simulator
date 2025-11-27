<script lang="ts">
	import Icon from '@iconify/svelte';
	import { goto } from '$app/navigation';
	import { MapView, MapSidebar } from '$lib/components/map';
	import type { MapGeoJSONFeature } from 'maplibre-gl';
	import type { LandslideHazardLevel, SimulatorParams } from '$lib/types/landslide';

	let selectedFeature = $state<MapGeoJSONFeature | null>(null);
	let hoveredFeature = $state<MapGeoJSONFeature | null>(null);
	// Start with all hazard levels checked/visible (integers match PMTiles data)
	let activeFilters = $state<LandslideHazardLevel[]>([1, 2, 3]);
	let mapViewRef: MapView | null = $state(null);
	let isLocating = $state(false);
	let showMapSidebarDrawer = $state(false);

	function handleFeatureClick(feature: MapGeoJSONFeature | null) {
		selectedFeature = feature;
	}

	function handleFeatureHover(feature: MapGeoJSONFeature | null) {
		hoveredFeature = feature;
	}

	function handleLoadInSimulator(params: SimulatorParams) {
		// Build query string from params
		const queryParams = new URLSearchParams();
		queryParams.set('slopeAngle', params.slopeAngle.toString());
		queryParams.set('maxElevation', params.maxElevation.toString());
		queryParams.set('vegetationCover', params.vegetationCover.toString());
		queryParams.set('erosion', params.erosion.toString());
		queryParams.set('soilMoisture', params.soilMoisture.toString());
		queryParams.set('rainfallIntensity', params.rainfallIntensity.toString());
		queryParams.set('soilDepth', params.soilDepth.toString());
		queryParams.set('unitWeight', params.unitWeight.toString());
		queryParams.set('cohesion', params.cohesion.toString());
		queryParams.set('frictionAngle', params.frictionAngle.toString());
		queryParams.set('hydraulicConductivity', params.hydraulicConductivity.toString());
		queryParams.set('coefficientOfVariation', params.coefficientOfVariation.toString());

		// Navigate to simulator with params
		goto(`/?${queryParams.toString()}`);
	}

	function handleResetView() {
		mapViewRef?.fitToBounds();
	}

	async function handleGoToLocation() {
		if (!mapViewRef) return;
		isLocating = true;
		await mapViewRef.goToCurrentLocation();
		isLocating = false;
	}
</script>

<svelte:head>
	<title>Hazard Map - Landslide Simulator</title>
</svelte:head>

<div class="h-screen flex flex-col md:flex-row bg-neutral-100 overflow-hidden">
	<!-- Desktop Sidebar - Hidden on mobile -->
	<div class="hidden md:block md:w-80 md:flex-shrink-0">
		<MapSidebar
			{selectedFeature}
			{hoveredFeature}
			bind:activeFilters
			onLoadInSimulator={handleLoadInSimulator}
			onResetView={handleResetView}
			onGoToLocation={handleGoToLocation}
			{isLocating}
		/>
	</div>

	<!-- Map - Full height -->
	<main class="flex-1 relative overflow-hidden">
		<MapView
			bind:this={mapViewRef}
			onFeatureClick={handleFeatureClick}
			onFeatureHover={handleFeatureHover}
			selectedFeatureId={selectedFeature?.id ?? null}
			hazardFilter={activeFilters}
		/>

		<!-- Mobile Filters Button -->
		<button
			class="fixed bottom-4 left-4 md:hidden h-12 px-4 bg-white text-neutral-900 rounded-lg shadow-lg hover:bg-neutral-50 border border-neutral-200 flex items-center gap-2 font-medium z-10 text-sm"
			onclick={() => (showMapSidebarDrawer = true)}
			title="Filters"
		>
			<Icon icon="fluent:filter-24-regular" class="w-5 h-5" />
			<span>Filters</span>
		</button>
	</main>

	<!-- Mobile Sidebar Drawer -->
	{#if showMapSidebarDrawer}
		<div class="fixed inset-0 md:hidden z-40 bg-black/50" onclick={() => (showMapSidebarDrawer = false)}></div>
		<div class="fixed inset-y-0 left-0 w-80 md:hidden z-50 bg-white overflow-y-auto transition-transform">
			<div class="p-3 border-b border-neutral-200 flex items-center justify-between sticky top-0 bg-white">
				<h2 class="text-lg font-semibold">Map Filters</h2>
				<button
					class="p-2 hover:bg-neutral-100 rounded"
					onclick={() => (showMapSidebarDrawer = false)}
					title="Close"
				>
					✕
				</button>
			</div>
			<MapSidebar
				{selectedFeature}
				{hoveredFeature}
				bind:activeFilters
				onLoadInSimulator={handleLoadInSimulator}
				onResetView={handleResetView}
				onGoToLocation={handleGoToLocation}
				{isLocating}
			/>
		</div>
	{/if}
</div>

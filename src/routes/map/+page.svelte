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

<div class="h-dvh flex flex-col md:flex-row bg-neutral-100 overflow-hidden">
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

		<!-- Mobile Navigation Bar -->
		<div class="fixed bottom-0 left-0 right-0 md:hidden p-3 bg-white border-t border-neutral-200 z-20 flex gap-2">
			<a
				href="/"
				class="flex-1 h-12 px-3 py-2 bg-neutral-100 text-neutral-900 rounded hover:bg-neutral-200 border border-neutral-300 flex items-center justify-center gap-2 min-w-0 text-sm"
				title="Back to Simulator"
			>
				<Icon icon="fluent:cube-24-regular" class="w-5 h-5 flex-shrink-0" />
				<span class="hidden sm:inline truncate">Simulator</span>
			</a>
			<button
				class="flex-1 h-12 px-3 py-2 bg-neutral-900 text-white rounded hover:bg-neutral-800 flex items-center justify-center gap-2 min-w-0 text-sm"
				onclick={() => (showMapSidebarDrawer = true)}
				title="Filters"
			>
				<Icon icon="fluent:filter-24-regular" class="w-5 h-5 flex-shrink-0" />
				<span class="hidden sm:inline truncate">Filters</span>
			</button>
		</div>
	</main>

	<!-- Mobile Sidebar Drawer -->
	{#if showMapSidebarDrawer}
		<div class="fixed inset-0 md:hidden z-40 bg-black/50" onclick={() => (showMapSidebarDrawer = false)}></div>
		<div class="fixed inset-y-0 left-0 w-full sm:w-80 md:hidden z-50 bg-white overflow-y-auto transition-transform">
			<div class="p-3 border-b border-neutral-200 flex items-center justify-between sticky top-0 bg-white z-10">
				<h2 class="text-lg font-semibold">Map Filters</h2>
				<button
					class="p-2 hover:bg-neutral-100 rounded focus:outline-none focus:ring-2 focus:ring-neutral-900"
					onclick={() => (showMapSidebarDrawer = false)}
					title="Close"
					aria-label="Close filters drawer"
				>
					<Icon icon="fluent:dismiss-24-regular" class="w-5 h-5" />
				</button>
			</div>
			<div class="pb-20">
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
		</div>
	{/if}
</div>

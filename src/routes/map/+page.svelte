<script lang="ts">
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

<div class="h-screen w-screen flex bg-neutral-100 overflow-hidden">
	<!-- Sidebar -->
	<MapSidebar
		{selectedFeature}
		{hoveredFeature}
		bind:activeFilters
		onLoadInSimulator={handleLoadInSimulator}
		onResetView={handleResetView}
		onGoToLocation={handleGoToLocation}
		{isLocating}
	/>

	<!-- Map -->
	<main class="flex-1 relative h-full" style="min-height: 100vh;">
		<MapView
			bind:this={mapViewRef}
			onFeatureClick={handleFeatureClick}
			onFeatureHover={handleFeatureHover}
			selectedFeatureId={selectedFeature?.id ?? null}
			hazardFilter={activeFilters}
		/>
	</main>
</div>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Map as MapLibreMap, MapMouseEvent, MapGeoJSONFeature } from 'maplibre-gl';
	import * as pmtiles from 'pmtiles';
	import {
		osmBaseStyle,
		hazardFillLayer,
		hazardOutlineLayer
	} from '$lib/utils/map-styles';
	import {
		INITIAL_VIEW,
		ZOOM_LIMITS,
		CEBU_BOUNDS,
		MAP_SOURCE_IDS,
		MAP_LAYER_IDS
	} from '$lib/utils/map-config';
	import type { LandslideHazardLevel } from '$lib/types/landslide';

	interface Props {
		onFeatureClick?: (feature: MapGeoJSONFeature | null) => void;
		onFeatureHover?: (feature: MapGeoJSONFeature | null) => void;
		selectedFeatureId?: string | number | null;
		hazardFilter?: LandslideHazardLevel[] | null;
	}

	let {
		onFeatureClick,
		onFeatureHover,
		selectedFeatureId = null,
		hazardFilter = null
	}: Props = $props();

	let mapContainer: HTMLDivElement;
	let map: MapLibreMap | null = null;
	let hoveredFeatureId: string | number | null = null;
	let isMapLoaded = $state(false);
	let isLoading = $state(true);
	let errorMessage = $state<string | null>(null);
	let userMarker: any = null;
	let isLocating = $state(false);

	const PMTILES_URL = '/tiles/cebu-hazards.pmtiles';
	const SOURCE_LAYER = 'hazards';

	onMount(async () => {
		try {
			// Import maplibre-gl and its CSS
			const maplibregl = await import('maplibre-gl');

			// Ensure CSS is loaded (matching installed v5.x)
			if (!document.querySelector('link[href*="maplibre-gl"]')) {
				const link = document.createElement('link');
				link.rel = 'stylesheet';
				link.href = 'https://unpkg.com/maplibre-gl@5.13.0/dist/maplibre-gl.css';
				document.head.appendChild(link);
				// Give CSS time to load
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// Register PMTiles protocol
			const protocol = new pmtiles.Protocol();
			maplibregl.addProtocol('pmtiles', protocol.tile);

			// Initialize map
			map = new maplibregl.Map({
				container: mapContainer,
				style: osmBaseStyle,
				center: [INITIAL_VIEW.center.lng, INITIAL_VIEW.center.lat],
				zoom: INITIAL_VIEW.zoom,
				minZoom: ZOOM_LIMITS.min,
				maxZoom: ZOOM_LIMITS.max,
				attributionControl: true
			});

			// Add navigation controls
			map.addControl(new maplibregl.NavigationControl(), 'top-right');
			map.addControl(new maplibregl.ScaleControl(), 'bottom-right');

			// Handle map errors
			map.on('error', (e) => {
				console.error('Map error:', e);
			});

			map.on('load', () => {
				if (!map) return;

				try {
					// Add PMTiles source
					const pmtilesUrl = `pmtiles://${window.location.origin}${PMTILES_URL}`;

					map.addSource(MAP_SOURCE_IDS.HAZARD_TILES, {
						type: 'vector',
						url: pmtilesUrl
					});

					// Add hazard fill layer
					map.addLayer({
						...hazardFillLayer,
						'source-layer': SOURCE_LAYER
					});

					// Add hazard outline layer
					map.addLayer({
						...hazardOutlineLayer,
						'source-layer': SOURCE_LAYER
					});

					// Add hover state layer
					map.addLayer({
						id: 'hazard-hover',
						type: 'fill',
						source: MAP_SOURCE_IDS.HAZARD_TILES,
						'source-layer': SOURCE_LAYER,
						paint: {
							'fill-color': '#ffffff',
							'fill-opacity': 0.3
						},
						filter: ['==', ['id'], '']
					});

					// Add selected state layer
					map.addLayer({
						id: MAP_LAYER_IDS.HAZARD_SELECTED,
						type: 'line',
						source: MAP_SOURCE_IDS.HAZARD_TILES,
						'source-layer': SOURCE_LAYER,
						paint: {
							'line-color': '#ffffff',
							'line-width': 3,
							'line-opacity': 1
						},
						filter: ['==', ['id'], '']
					});

					// Fit to Cebu bounds
					map.fitBounds(CEBU_BOUNDS, { padding: 50, duration: 1000 });

					isMapLoaded = true;
					isLoading = false;
				} catch (err) {
					console.error('Error adding layers:', err);
					errorMessage = err instanceof Error ? err.message : 'Error loading map layers';
					isLoading = false;
				}
			});

			// Mouse move event for hover
			map.on('mousemove', MAP_LAYER_IDS.HAZARD_FILL, (e: MapMouseEvent) => {
				if (!map || !e.features?.length) return;

				map.getCanvas().style.cursor = 'pointer';

				const feature = e.features[0];
				if (hoveredFeatureId !== feature.id) {
					if (hoveredFeatureId !== null) {
						map.setFilter('hazard-hover', ['==', ['id'], '']);
					}
					hoveredFeatureId = feature.id ?? null;
					map.setFilter('hazard-hover', ['==', ['id'], hoveredFeatureId]);
					onFeatureHover?.(feature);
				}
			});

			// Mouse leave event
			map.on('mouseleave', MAP_LAYER_IDS.HAZARD_FILL, () => {
				if (!map) return;
				map.getCanvas().style.cursor = '';
				if (hoveredFeatureId !== null) {
					map.setFilter('hazard-hover', ['==', ['id'], '']);
					hoveredFeatureId = null;
					onFeatureHover?.(null);
				}
			});

			// Click event on features
			map.on('click', MAP_LAYER_IDS.HAZARD_FILL, (e: MapMouseEvent) => {
				if (!map || !e.features?.length) return;
				const feature = e.features[0];
				onFeatureClick?.(feature);
			});

			// Click elsewhere to deselect
			map.on('click', (e: MapMouseEvent) => {
				if (!map) return;
				const features = map.queryRenderedFeatures(e.point, {
					layers: [MAP_LAYER_IDS.HAZARD_FILL]
				});
				if (!features?.length) {
					onFeatureClick?.(null);
				}
			});
		} catch (err) {
			console.error('Error initializing map:', err);
			errorMessage = err instanceof Error ? err.message : 'Error initializing map';
			isLoading = false;
		}
	});

	onDestroy(() => {
		map?.remove();
	});

	// Update selected feature highlight
	$effect(() => {
		if (map && isMapLoaded) {
			if (selectedFeatureId !== null) {
				map.setFilter(MAP_LAYER_IDS.HAZARD_SELECTED, ['==', ['id'], selectedFeatureId]);
			} else {
				map.setFilter(MAP_LAYER_IDS.HAZARD_SELECTED, ['==', ['id'], '']);
			}
		}
	});

	// Update hazard level filter - checked = visible, unchecked = hidden
	$effect(() => {
		if (map && isMapLoaded) {
			// hazardFilter contains the CHECKED levels that should be VISIBLE
			if (!hazardFilter || hazardFilter.length === 0) {
				// No levels checked = hide all hazard layers
				map.setFilter(MAP_LAYER_IDS.HAZARD_FILL, ['==', ['get', 'LH'], -999]);
				map.setFilter(MAP_LAYER_IDS.HAZARD_OUTLINE, ['==', ['get', 'LH'], -999]);
				map.setFilter('hazard-hover', ['==', ['get', 'LH'], -999]);
			} else if (hazardFilter.length === 3) {
				// All levels checked = show all (no filter)
				map.setFilter(MAP_LAYER_IDS.HAZARD_FILL, null);
				map.setFilter(MAP_LAYER_IDS.HAZARD_OUTLINE, null);
				map.setFilter('hazard-hover', ['==', ['id'], '']);
			} else {
				// Some levels checked = show only those
				const filterExpr: any = ['match', ['get', 'LH'], hazardFilter, true, false];
				map.setFilter(MAP_LAYER_IDS.HAZARD_FILL, filterExpr);
				map.setFilter(MAP_LAYER_IDS.HAZARD_OUTLINE, filterExpr);
				map.setFilter('hazard-hover', ['all', filterExpr, ['==', ['id'], '']]);
			}
		}
	});

	export function fitToBounds() {
		map?.fitBounds(CEBU_BOUNDS, { padding: 50, duration: 500 });
	}

	export async function goToCurrentLocation(): Promise<boolean> {
		if (!map || !isMapLoaded) return false;

		isLocating = true;

		return new Promise((resolve) => {
			if (!navigator.geolocation) {
				console.error('Geolocation not supported');
				isLocating = false;
				resolve(false);
				return;
			}

			navigator.geolocation.getCurrentPosition(
				async (position) => {
					const { longitude, latitude } = position.coords;

					// Import maplibre-gl for Marker
					const maplibregl = await import('maplibre-gl');

					// Remove existing marker if any
					if (userMarker) {
						userMarker.remove();
					}

					// Create custom marker element
					const markerEl = document.createElement('div');
					markerEl.innerHTML = `
						<div class="relative">
							<div class="w-6 h-6 bg-neutral-900 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
								<div class="w-2 h-2 bg-white rounded-full"></div>
							</div>
							<div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-neutral-900"></div>
						</div>
					`;

					// Add marker to map
					userMarker = new maplibregl.Marker({ element: markerEl })
						.setLngLat([longitude, latitude])
						.addTo(map!);

					// Fly to location
					map!.flyTo({
						center: [longitude, latitude],
						zoom: 14,
						duration: 1500
					});

					isLocating = false;
					resolve(true);
				},
				(error) => {
					console.error('Geolocation error:', error);
					isLocating = false;
					resolve(false);
				},
				{
					enableHighAccuracy: true,
					timeout: 10000,
					maximumAge: 0
				}
			);
		});
	}

	export function getIsLocating() {
		return isLocating;
	}
</script>

<div class="relative w-full h-full min-h-[400px]" style="height: 100%; width: 100%;">
	<div bind:this={mapContainer} class="absolute inset-0" style="width: 100%; height: 100%;"></div>

	{#if isLoading}
		<div class="absolute inset-0 flex items-center justify-center bg-neutral-100/80">
			<div class="flex flex-col items-center gap-3">
				<div class="w-8 h-8 border-2 border-neutral-300 border-t-neutral-700 rounded-full animate-spin"></div>
				<span class="text-sm text-neutral-600">Loading map...</span>
			</div>
		</div>
	{/if}

	{#if errorMessage}
		<div class="absolute inset-0 flex items-center justify-center bg-neutral-100/90">
			<div class="flex flex-col items-center gap-3 p-6 bg-white rounded-lg shadow-lg max-w-md">
				<div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
					<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
					</svg>
				</div>
				<span class="text-sm text-neutral-700 text-center">{errorMessage}</span>
				<button
					onclick={() => window.location.reload()}
					class="px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors"
				>
					Retry
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	:global(.maplibregl-ctrl-attrib) {
		font-size: 10px;
	}
</style>

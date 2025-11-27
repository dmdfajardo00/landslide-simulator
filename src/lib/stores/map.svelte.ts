/**
 * Landslide Map Store
 *
 * Central reactive store for landslide map state management.
 * Uses Svelte 5 runes ($state, $derived) for reactivity.
 */

import type {
	LandslideHazardLevel,
	LandslideFeature,
	LandslideFeatureCollection,
	MapFilters,
	SelectedLocation,
	MapViewport,
	HazardStatistics
} from '$lib/types/landslide';
import { calculateCentroid, hazardToSimulatorParams } from '$lib/utils/hazard-mapping';

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_VIEWPORT: MapViewport = {
	center: [-122.4194, 37.7749], // San Francisco (placeholder)
	zoom: 10,
	bounds: undefined
};

const DEFAULT_FILTERS: MapFilters = {
	hazardLevels: new Set<LandslideHazardLevel>(),
	searchQuery: '',
	minArea: undefined,
	maxArea: undefined
};

// ============================================================================
// Map Store
// ============================================================================

function createMapStore() {
	// ============================================================================
	// State (using Svelte 5 runes)
	// ============================================================================

	/** GeoJSON data loaded from external source */
	let geoData = $state<LandslideFeatureCollection | null>(null);

	/** Current filter state */
	let filters = $state<MapFilters>(structuredClone(DEFAULT_FILTERS));

	/** Selected location (if any) */
	let selectedLocation = $state<SelectedLocation | null>(null);

	/** Current map viewport */
	let viewport = $state<MapViewport>(structuredClone(DEFAULT_VIEWPORT));

	/** Loading state for async data fetching */
	let isLoading = $state<boolean>(false);

	/** Error state */
	let error = $state<string | null>(null);

	// ============================================================================
	// Derived State
	// ============================================================================

	/**
	 * Filtered features based on current filter state
	 */
	const filteredFeatures = $derived.by(() => {
		if (!geoData) return [];

		return geoData.features.filter((feature) => {
			// Filter by hazard level
			if (filters.hazardLevels.size > 0 && !filters.hazardLevels.has(feature.properties.LH)) {
				return false;
			}

			// Filter by search query (case-insensitive name match)
			if (filters.searchQuery && feature.properties.name) {
				const query = filters.searchQuery.toLowerCase();
				const name = feature.properties.name.toLowerCase();
				if (!name.includes(query)) {
					return false;
				}
			}

			// Filter by area range
			if (feature.properties.area !== undefined) {
				if (filters.minArea !== undefined && feature.properties.area < filters.minArea) {
					return false;
				}
				if (filters.maxArea !== undefined && feature.properties.area > filters.maxArea) {
					return false;
				}
			}

			return true;
		});
	});

	/**
	 * Statistics for the currently filtered features
	 */
	const statistics = $derived.by(() => {
		const stats: HazardStatistics = {
			total: filteredFeatures.length,
			byLevel: { low: 0, moderate: 0, high: 0 },
			areaByLevel: { low: 0, moderate: 0, high: 0 }
		};

		filteredFeatures.forEach((feature) => {
			const level = feature.properties.LH;
			const area = feature.properties.area ?? 0;

			if (level === 1.0) {
				stats.byLevel.low++;
				stats.areaByLevel.low += area;
			} else if (level === 2.0) {
				stats.byLevel.moderate++;
				stats.areaByLevel.moderate += area;
			} else if (level === 3.0) {
				stats.byLevel.high++;
				stats.areaByLevel.high += area;
			}
		});

		return stats;
	});

	/**
	 * Whether any filters are active
	 */
	const hasActiveFilters = $derived.by(() => {
		return (
			filters.hazardLevels.size > 0 ||
			filters.searchQuery.length > 0 ||
			filters.minArea !== undefined ||
			filters.maxArea !== undefined
		);
	});

	// ============================================================================
	// Actions
	// ============================================================================

	/**
	 * Load GeoJSON data from a URL or set it directly
	 */
	async function loadGeoData(source: string | LandslideFeatureCollection): Promise<void> {
		isLoading = true;
		error = null;

		try {
			if (typeof source === 'string') {
				const response = await fetch(source);
				if (!response.ok) {
					throw new Error(`Failed to load GeoJSON: ${response.statusText}`);
				}
				geoData = await response.json();
			} else {
				geoData = source;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error loading GeoJSON';
			geoData = null;
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Set filter state (partial update)
	 */
	function setFilter(updates: Partial<MapFilters>): void {
		filters = { ...filters, ...updates };
	}

	/**
	 * Toggle a specific hazard level in the filter
	 */
	function toggleHazardLevel(level: LandslideHazardLevel): void {
		const newLevels = new Set(filters.hazardLevels);

		if (newLevels.has(level)) {
			newLevels.delete(level);
		} else {
			newLevels.add(level);
		}

		filters = { ...filters, hazardLevels: newLevels };
	}

	/**
	 * Set search query
	 */
	function setSearchQuery(query: string): void {
		filters = { ...filters, searchQuery: query };
	}

	/**
	 * Set area range filter
	 */
	function setAreaRange(minArea?: number, maxArea?: number): void {
		filters = { ...filters, minArea, maxArea };
	}

	/**
	 * Select a location on the map
	 */
	function selectLocation(feature: LandslideFeature): void {
		const centroid = calculateCentroid(feature.geometry);
		const simulatorParams = hazardToSimulatorParams(feature.properties.LH);

		selectedLocation = {
			feature,
			centroid,
			simulatorParams
		};

		// Center map on selected location
		viewport = {
			...viewport,
			center: centroid
		};
	}

	/**
	 * Clear the current selection
	 */
	function clearSelection(): void {
		selectedLocation = null;
	}

	/**
	 * Reset all filters to default
	 */
	function resetFilters(): void {
		filters = structuredClone(DEFAULT_FILTERS);
	}

	/**
	 * Set map viewport
	 */
	function setViewport(updates: Partial<MapViewport>): void {
		viewport = { ...viewport, ...updates };
	}

	/**
	 * Zoom to fit all filtered features
	 */
	function fitToFeatures(): void {
		if (filteredFeatures.length === 0) return;

		// Calculate bounds from all filtered features
		let minLng = Infinity;
		let minLat = Infinity;
		let maxLng = -Infinity;
		let maxLat = -Infinity;

		filteredFeatures.forEach((feature) => {
			const coords = getAllCoordinates(feature.geometry);
			coords.forEach(([lng, lat]) => {
				minLng = Math.min(minLng, lng);
				minLat = Math.min(minLat, lat);
				maxLng = Math.max(maxLng, lng);
				maxLat = Math.max(maxLat, lat);
			});
		});

		viewport = {
			...viewport,
			center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
			bounds: [
				[minLng, minLat],
				[maxLng, maxLat]
			]
		};
	}

	/**
	 * Reset viewport to default
	 */
	function resetViewport(): void {
		viewport = structuredClone(DEFAULT_VIEWPORT);
	}

	/**
	 * Reset entire store to default state
	 */
	function reset(): void {
		geoData = null;
		filters = structuredClone(DEFAULT_FILTERS);
		selectedLocation = null;
		viewport = structuredClone(DEFAULT_VIEWPORT);
		isLoading = false;
		error = null;
	}

	// ============================================================================
	// Helper Functions
	// ============================================================================

	/**
	 * Extract all coordinates from a GeoJSON geometry
	 */
	function getAllCoordinates(
		geometry: LandslideFeature['geometry']
	): Array<[number, number]> {
		const coords: Array<[number, number]> = [];

		if (geometry.type === 'Polygon') {
			geometry.coordinates.forEach((ring) => {
				ring.forEach((coord) => {
					coords.push([coord[0], coord[1]]);
				});
			});
		} else if (geometry.type === 'MultiPolygon') {
			geometry.coordinates.forEach((polygon) => {
				polygon.forEach((ring) => {
					ring.forEach((coord) => {
						coords.push([coord[0], coord[1]]);
					});
				});
			});
		}

		return coords;
	}

	// ============================================================================
	// Public API
	// ============================================================================

	return {
		// State getters (reactive)
		get geoData() {
			return geoData;
		},
		get filters() {
			return filters;
		},
		get selectedLocation() {
			return selectedLocation;
		},
		get viewport() {
			return viewport;
		},
		get isLoading() {
			return isLoading;
		},
		get error() {
			return error;
		},

		// Derived state getters
		get filteredFeatures() {
			return filteredFeatures;
		},
		get statistics() {
			return statistics;
		},
		get hasActiveFilters() {
			return hasActiveFilters;
		},

		// Actions
		loadGeoData,
		setFilter,
		toggleHazardLevel,
		setSearchQuery,
		setAreaRange,
		selectLocation,
		clearSelection,
		resetFilters,
		setViewport,
		fitToFeatures,
		resetViewport,
		reset
	};
}

// ============================================================================
// Singleton Export
// ============================================================================

export const mapStore = createMapStore();

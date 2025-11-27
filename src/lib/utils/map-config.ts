import type { Map, LngLatBoundsLike } from 'maplibre-gl';
import { Protocol } from 'pmtiles';

/**
 * Layer and source ID constants for consistent referencing
 */
export const MAP_LAYER_IDS = {
	HAZARD_FILL: 'hazard-fill',
	HAZARD_OUTLINE: 'hazard-outline',
	HAZARD_SELECTED: 'hazard-selected',
	OSM_TILES: 'osm-tiles'
} as const;

export const MAP_SOURCE_IDS = {
	HAZARD_TILES: 'hazard-tiles',
	OSM: 'osm'
} as const;

/**
 * Initial map view configuration centered on Cebu, Philippines
 */
export const INITIAL_VIEW = {
	center: {
		lng: 123.8854,
		lat: 10.3157
	},
	zoom: 10,
	pitch: 0,
	bearing: 0
} as const;

/**
 * Zoom constraints for optimal tile loading and performance
 */
export const ZOOM_LIMITS = {
	min: 6,
	max: 18,
	default: 10
} as const;

/**
 * Philippine bounding box to constrain map navigation
 * Coordinates: [west, south, east, north]
 */
export const PHILIPPINES_BOUNDS: LngLatBoundsLike = [
	116.9283, // West longitude
	4.6432, // South latitude
	126.6043, // East longitude
	21.1207 // North latitude
];

/**
 * Cebu region bounding box for focused regional view
 * Coordinates: [west, south, east, north]
 */
export const CEBU_BOUNDS: LngLatBoundsLike = [
	123.3, // West longitude
	9.5, // South latitude
	124.5, // East longitude
	11.2 // North latitude
];

/**
 * Register PMTiles protocol with MapLibre GL JS
 * Must be called before initializing the map instance
 *
 * @example
 * ```ts
 * import { setupPMTilesProtocol } from '$lib/utils/map-config';
 *
 * setupPMTilesProtocol();
 * const map = new Map({ ... });
 * ```
 */
export async function setupPMTilesProtocol(): Promise<void> {
	const protocol = new Protocol();
	// Register pmtiles:// protocol handler
	if (typeof window !== 'undefined') {
		const maplibregl = await import('maplibre-gl');
		maplibregl.addProtocol('pmtiles', protocol.tile);
	}
}

/**
 * Map initialization options factory with defaults
 * Combines initial view, zoom limits, and bounds constraints
 */
export function createMapOptions(container: HTMLElement | string) {
	return {
		container,
		center: [INITIAL_VIEW.center.lng, INITIAL_VIEW.center.lat] as [number, number],
		zoom: INITIAL_VIEW.zoom,
		pitch: INITIAL_VIEW.pitch,
		bearing: INITIAL_VIEW.bearing,
		minZoom: ZOOM_LIMITS.min,
		maxZoom: ZOOM_LIMITS.max,
		maxBounds: PHILIPPINES_BOUNDS,
		attributionControl: true,
		logoPosition: 'bottom-left' as const
	};
}

/**
 * Add PMTiles source to an existing map instance
 *
 * @param map - MapLibre Map instance
 * @param url - PMTiles file URL (e.g., 'pmtiles://https://example.com/tiles.pmtiles')
 * @param sourceId - Optional custom source ID (defaults to MAP_SOURCE_IDS.HAZARD_TILES)
 */
export function addPMTilesSource(
	map: Map,
	url: string,
	sourceId: string = MAP_SOURCE_IDS.HAZARD_TILES
): void {
	if (map.getSource(sourceId)) {
		console.warn(`Source ${sourceId} already exists, skipping`);
		return;
	}

	map.addSource(sourceId, {
		type: 'vector',
		url
	});
}

/**
 * Utility to fit map to Cebu region bounds with padding
 *
 * @param map - MapLibre Map instance
 * @param padding - Optional padding in pixels (defaults to 50)
 */
export function fitToCebu(map: Map, padding: number = 50): void {
	map.fitBounds(CEBU_BOUNDS, {
		padding,
		duration: 1000
	});
}

/**
 * Utility to fit map to entire Philippines with padding
 *
 * @param map - MapLibre Map instance
 * @param padding - Optional padding in pixels (defaults to 50)
 */
export function fitToPhilippines(map: Map, padding: number = 50): void {
	map.fitBounds(PHILIPPINES_BOUNDS, {
		padding,
		duration: 1000
	});
}

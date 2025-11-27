import type { StyleSpecification, LayerSpecification } from 'maplibre-gl';

/**
 * OpenStreetMap base style configuration for MapLibre GL JS
 */
export const osmBaseStyle: StyleSpecification = {
	version: 8,
	sources: {
		carto: {
			type: 'raster',
			tiles: [
				'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
				'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
				'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
			],
			tileSize: 256,
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
		}
	},
	layers: [
		{
			id: 'carto-tiles',
			type: 'raster',
			source: 'carto',
			minzoom: 0,
			maxzoom: 19
		}
	]
};

/**
 * Hazard polygon fill layer with color interpolation based on LH property
 * LH values: 1 = low (green), 2 = moderate (yellow), 3 = high (red)
 */
export const hazardFillLayer: LayerSpecification = {
	id: 'hazard-fill',
	type: 'fill',
	source: 'hazard-tiles',
	'source-layer': 'default',
	paint: {
		'fill-color': [
			'interpolate',
			['linear'],
			['get', 'LH'],
			1,
			'#22c55e', // Low hazard - green
			2,
			'#eab308', // Moderate hazard - yellow
			3,
			'#ef4444' // High hazard - red
		],
		'fill-opacity': 0.6
	}
};

/**
 * Hazard polygon outline layer for better visual definition
 */
export const hazardOutlineLayer: LayerSpecification = {
	id: 'hazard-outline',
	type: 'line',
	source: 'hazard-tiles',
	'source-layer': 'default',
	paint: {
		'line-color': [
			'interpolate',
			['linear'],
			['get', 'LH'],
			1,
			'#16a34a', // Darker green for low hazard
			2,
			'#ca8a04', // Darker yellow for moderate hazard
			3,
			'#dc2626' // Darker red for high hazard
		],
		'line-width': 1.5,
		'line-opacity': 0.8
	}
};

/**
 * Selected polygon highlight layer with elevated visual prominence
 */
export const selectedPolygonLayer: LayerSpecification = {
	id: 'hazard-selected',
	type: 'line',
	source: 'hazard-tiles',
	'source-layer': 'default',
	paint: {
		'line-color': '#ffffff',
		'line-width': 3,
		'line-opacity': 1
	},
	filter: ['==', ['id'], '']
};

/**
 * Hazard level metadata for UI display and legend generation
 */
export const hazardLevels = [
	{ value: 1, label: 'Low Hazard', color: '#22c55e', description: 'Minimal landslide risk' },
	{
		value: 2,
		label: 'Moderate Hazard',
		color: '#eab308',
		description: 'Moderate landslide risk'
	},
	{ value: 3, label: 'High Hazard', color: '#ef4444', description: 'Elevated landslide risk' }
] as const;

/**
 * Utility to get hazard color by LH value
 */
export function getHazardColor(lh: number): string {
	const level = hazardLevels.find((l) => l.value === lh);
	return level?.color ?? '#64748b'; // neutral fallback
}

/**
 * Utility to get hazard label by LH value
 */
export function getHazardLabel(lh: number): string {
	const level = hazardLevels.find((l) => l.value === lh);
	return level?.label ?? 'Unknown';
}

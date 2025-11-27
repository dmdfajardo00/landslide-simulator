/**
 * Hazard Mapping Utilities
 *
 * Functions for mapping landslide hazard levels (LH values) to:
 * - Human-readable labels
 * - Tailwind color classes
 * - Simulator parameter presets
 * - GeoJSON geometry utilities
 */

import type {
	LandslideHazardLevel,
	HazardLabel,
	SimulatorParams,
	LandslideGeometry
} from '$lib/types/landslide';

// ============================================================================
// Color Mapping (Tailwind neutral palette + semantic colors)
// ============================================================================

/**
 * Color mapping for hazard levels matching app color scheme:
 * - Low (1.0): Green (#22c55e)
 * - Moderate (2.0): Yellow (#eab308)
 * - High (3.0): Red (#ef4444)
 */
export const HAZARD_COLORS = {
	low: {
		hex: '#22c55e',
		tailwind: 'bg-green-500',
		border: 'border-green-500',
		text: 'text-green-600',
		ring: 'ring-green-500'
	},
	moderate: {
		hex: '#eab308',
		tailwind: 'bg-yellow-500',
		border: 'border-yellow-500',
		text: 'text-yellow-600',
		ring: 'ring-yellow-500'
	},
	high: {
		hex: '#ef4444',
		tailwind: 'bg-red-500',
		border: 'border-red-500',
		text: 'text-red-600',
		ring: 'ring-red-500'
	}
} as const;

/**
 * Opacity variants for map visualization
 */
export const HAZARD_OPACITY = {
	fill: 0.4, // Polygon fill opacity
	stroke: 0.8, // Polygon stroke opacity
	hover: 0.6, // Hover state fill opacity
	selected: 0.7 // Selected state fill opacity
} as const;

// ============================================================================
// Label Mapping
// ============================================================================

/**
 * Map LH value to human-readable label
 */
export function hazardLevelToLabel(level: LandslideHazardLevel): HazardLabel {
	switch (level) {
		case 1.0:
			return 'low';
		case 2.0:
			return 'moderate';
		case 3.0:
			return 'high';
		default:
			// Type guard - should never reach here
			const _exhaustive: never = level;
			return 'low';
	}
}

/**
 * Map label back to LH value
 */
export function labelToHazardLevel(label: HazardLabel): LandslideHazardLevel {
	switch (label) {
		case 'low':
			return 1.0;
		case 'moderate':
			return 2.0;
		case 'high':
			return 3.0;
		default:
			const _exhaustive: never = label;
			return 1.0;
	}
}

/**
 * Get display label with capitalization
 */
export function getHazardDisplayLabel(level: LandslideHazardLevel): string {
	const label = hazardLevelToLabel(level);
	return label.charAt(0).toUpperCase() + label.slice(1);
}

// ============================================================================
// Color Utilities
// ============================================================================

/**
 * Get color configuration for a hazard level
 */
export function getHazardColor(level: LandslideHazardLevel) {
	const label = hazardLevelToLabel(level);
	return HAZARD_COLORS[label];
}

/**
 * Get hex color for a hazard level
 */
export function getHazardHex(level: LandslideHazardLevel): string {
	return getHazardColor(level).hex;
}

/**
 * Get Tailwind background class for a hazard level
 */
export function getHazardBgClass(level: LandslideHazardLevel): string {
	return getHazardColor(level).tailwind;
}

/**
 * Get Tailwind text class for a hazard level
 */
export function getHazardTextClass(level: LandslideHazardLevel): string {
	return getHazardColor(level).text;
}

/**
 * Get Tailwind border class for a hazard level
 */
export function getHazardBorderClass(level: LandslideHazardLevel): string {
	return getHazardColor(level).border;
}

// ============================================================================
// Simulator Parameter Mapping
// ============================================================================

/**
 * Map hazard level to realistic simulator parameters
 *
 * Parameter rationale:
 * - Low hazard: Stable slopes with good vegetation, low slope angles
 * - Moderate hazard: Intermediate stability with some risk factors
 * - High hazard: Unstable slopes with poor vegetation, steep angles
 */
export function hazardToSimulatorParams(level: LandslideHazardLevel): SimulatorParams {
	switch (level) {
		case 1.0: // Low hazard
			return {
				// Terrain - gentle slopes
				slopeAngle: 20,
				maxElevation: 30,

				// Environmental - good vegetation, low erosion
				vegetationCover: 80,
				erosion: 15,
				soilMoisture: 25,
				rainfallIntensity: 20,

				// Geotechnical - strong soil properties
				soilDepth: 2.0,
				unitWeight: 18.0,
				cohesion: 20,
				frictionAngle: 35,
				hydraulicConductivity: 8.0,

				// Reliability - low variability
				coefficientOfVariation: 0.1
			};

		case 2.0: // Moderate hazard
			return {
				// Terrain - moderate slopes
				slopeAngle: 30,
				maxElevation: 50,

				// Environmental - moderate vegetation, moderate erosion
				vegetationCover: 50,
				erosion: 40,
				soilMoisture: 45,
				rainfallIntensity: 35,

				// Geotechnical - intermediate soil properties
				soilDepth: 3.0,
				unitWeight: 19.0,
				cohesion: 12,
				frictionAngle: 30,
				hydraulicConductivity: 5.0,

				// Reliability - moderate variability
				coefficientOfVariation: 0.2
			};

		case 3.0: // High hazard
			return {
				// Terrain - steep slopes
				slopeAngle: 45,
				maxElevation: 80,

				// Environmental - poor vegetation, high erosion
				vegetationCover: 25,
				erosion: 70,
				soilMoisture: 60,
				rainfallIntensity: 50,

				// Geotechnical - weak soil properties
				soilDepth: 4.5,
				unitWeight: 17.0,
				cohesion: 8,
				frictionAngle: 25,
				hydraulicConductivity: 3.0,

				// Reliability - high variability
				coefficientOfVariation: 0.3
			};

		default:
			const _exhaustive: never = level;
			return hazardToSimulatorParams(1.0);
	}
}

// ============================================================================
// GeoJSON Geometry Utilities
// ============================================================================

/**
 * Calculate centroid of a GeoJSON geometry
 * Returns [longitude, latitude]
 */
export function calculateCentroid(geometry: LandslideGeometry): [number, number] {
	let totalLng = 0;
	let totalLat = 0;
	let count = 0;

	if (geometry.type === 'Polygon') {
		geometry.coordinates.forEach((ring) => {
			ring.forEach((coord) => {
				totalLng += coord[0];
				totalLat += coord[1];
				count++;
			});
		});
	} else if (geometry.type === 'MultiPolygon') {
		geometry.coordinates.forEach((polygon) => {
			polygon.forEach((ring) => {
				ring.forEach((coord) => {
					totalLng += coord[0];
					totalLat += coord[1];
					count++;
				});
			});
		});
	}

	return count > 0 ? [totalLng / count, totalLat / count] : [0, 0];
}

/**
 * Calculate approximate area of a GeoJSON geometry in square meters
 * Uses simplified Haversine formula for lat/lng to meters conversion
 */
export function calculateArea(geometry: LandslideGeometry): number {
	let totalArea = 0;

	function ringArea(ring: number[][]): number {
		// Simple polygon area calculation using shoelace formula
		// Convert lat/lng to approximate meters (rough approximation)
		let area = 0;
		const n = ring.length;

		for (let i = 0; i < n - 1; i++) {
			const lng1 = ring[i][0];
			const lat1 = ring[i][1];
			const lng2 = ring[i + 1][0];
			const lat2 = ring[i + 1][1];

			// Convert to meters (very rough approximation)
			const x1 = lng1 * 111320 * Math.cos((lat1 * Math.PI) / 180);
			const y1 = lat1 * 110540;
			const x2 = lng2 * 111320 * Math.cos((lat2 * Math.PI) / 180);
			const y2 = lat2 * 110540;

			area += x1 * y2 - x2 * y1;
		}

		return Math.abs(area / 2);
	}

	if (geometry.type === 'Polygon') {
		// First ring is outer boundary, subsequent rings are holes
		geometry.coordinates.forEach((ring, index) => {
			const area = ringArea(ring);
			totalArea += index === 0 ? area : -area;
		});
	} else if (geometry.type === 'MultiPolygon') {
		geometry.coordinates.forEach((polygon) => {
			polygon.forEach((ring, index) => {
				const area = ringArea(ring);
				totalArea += index === 0 ? area : -area;
			});
		});
	}

	return totalArea;
}

/**
 * Get bounding box of a GeoJSON geometry
 * Returns [[minLng, minLat], [maxLng, maxLat]]
 */
export function getBounds(
	geometry: LandslideGeometry
): [[number, number], [number, number]] {
	let minLng = Infinity;
	let minLat = Infinity;
	let maxLng = -Infinity;
	let maxLat = -Infinity;

	if (geometry.type === 'Polygon') {
		geometry.coordinates.forEach((ring) => {
			ring.forEach((coord) => {
				minLng = Math.min(minLng, coord[0]);
				minLat = Math.min(minLat, coord[1]);
				maxLng = Math.max(maxLng, coord[0]);
				maxLat = Math.max(maxLat, coord[1]);
			});
		});
	} else if (geometry.type === 'MultiPolygon') {
		geometry.coordinates.forEach((polygon) => {
			polygon.forEach((ring) => {
				ring.forEach((coord) => {
					minLng = Math.min(minLng, coord[0]);
					minLat = Math.min(minLat, coord[1]);
					maxLng = Math.max(maxLng, coord[0]);
					maxLat = Math.max(maxLat, coord[1]);
				});
			});
		});
	}

	return [
		[minLng, minLat],
		[maxLng, maxLat]
	];
}

// ============================================================================
// Hazard Statistics
// ============================================================================

/**
 * Format area value for display
 */
export function formatArea(areaSquareMeters: number): string {
	if (areaSquareMeters < 1000) {
		return `${areaSquareMeters.toFixed(0)} m²`;
	} else if (areaSquareMeters < 1_000_000) {
		return `${(areaSquareMeters / 1000).toFixed(1)} km²`;
	} else {
		return `${(areaSquareMeters / 1_000_000).toFixed(2)} km²`;
	}
}

/**
 * Format hazard percentage for display
 */
export function formatPercentage(value: number, total: number): string {
	if (total === 0) return '0%';
	return `${((value / total) * 100).toFixed(1)}%`;
}

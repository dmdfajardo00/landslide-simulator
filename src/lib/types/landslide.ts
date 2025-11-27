/**
 * Landslide Map Type Definitions
 *
 * Types for GeoJSON landslide hazard data and map feature state management.
 */

import type { GeotechnicalParams } from '$lib/simulation/physics';

// ============================================================================
// Landslide Hazard Types
// ============================================================================

/**
 * Landslide hazard level from GeoJSON LH property
 * 1 = Low hazard
 * 2 = Moderate hazard
 * 3 = High hazard
 */
export type LandslideHazardLevel = 1 | 2 | 3;

/**
 * Human-readable hazard level labels
 */
export type HazardLabel = 'low' | 'moderate' | 'high';

// ============================================================================
// GeoJSON Feature Types
// ============================================================================

/**
 * GeoJSON Polygon geometry
 */
export interface PolygonGeometry {
	type: 'Polygon';
	coordinates: number[][][]; // Array of rings, each ring is array of [lng, lat] coordinates
}

/**
 * GeoJSON MultiPolygon geometry
 */
export interface MultiPolygonGeometry {
	type: 'MultiPolygon';
	coordinates: number[][][][]; // Array of polygons, each polygon is array of rings
}

/**
 * GeoJSON geometry for landslide features (Polygon or MultiPolygon)
 */
export type LandslideGeometry = PolygonGeometry | MultiPolygonGeometry;

/**
 * Properties attached to each landslide hazard feature
 */
export interface LandslideProperties {
	LH: LandslideHazardLevel; // Hazard level from dataset
	name?: string; // Optional location name
	area?: number; // Optional area in square meters
	[key: string]: any; // Allow additional properties from dataset
}

/**
 * Individual GeoJSON feature representing a landslide hazard zone
 */
export interface LandslideFeature {
	type: 'Feature';
	id?: string | number;
	geometry: LandslideGeometry;
	properties: LandslideProperties;
}

/**
 * GeoJSON FeatureCollection for landslide hazard data
 */
export interface LandslideFeatureCollection {
	type: 'FeatureCollection';
	features: LandslideFeature[];
}

// ============================================================================
// Map Filter State
// ============================================================================

/**
 * Filter state for the landslide map
 */
export interface MapFilters {
	/** Active hazard levels to display (empty = show all) */
	hazardLevels: Set<LandslideHazardLevel>;
	/** Search query for location names */
	searchQuery: string;
	/** Minimum area threshold (square meters) */
	minArea?: number;
	/** Maximum area threshold (square meters) */
	maxArea?: number;
}

// ============================================================================
// Selected Location State
// ============================================================================

/**
 * Represents a selected location on the map
 */
export interface SelectedLocation {
	/** GeoJSON feature that was selected */
	feature: LandslideFeature;
	/** Centroid coordinates [longitude, latitude] */
	centroid: [number, number];
	/** Simulator parameters derived from hazard level */
	simulatorParams: SimulatorParams;
}

// ============================================================================
// Map Viewport State
// ============================================================================

/**
 * Map viewport state (center and zoom level)
 */
export interface MapViewport {
	/** Center coordinates [longitude, latitude] */
	center: [number, number];
	/** Zoom level (typically 0-20) */
	zoom: number;
	/** Optional bounds [[minLng, minLat], [maxLng, maxLat]] */
	bounds?: [[number, number], [number, number]];
}

// ============================================================================
// Simulator Parameter Mapping
// ============================================================================

/**
 * Simulator parameters mapped from landslide hazard level
 * Matches the structure used in the main simulator
 */
export interface SimulatorParams {
	// Terrain parameters
	slopeAngle: number; // degrees (0-90)
	maxElevation: number; // meters

	// Environmental factors
	vegetationCover: number; // percentage (0-100)
	erosion: number; // percentage (0-100)
	soilMoisture: number; // percentage (0-100)
	rainfallIntensity: number; // mm/hr

	// Geotechnical parameters
	soilDepth: number; // meters
	unitWeight: number; // kN/m³
	cohesion: number; // kPa
	frictionAngle: number; // degrees
	hydraulicConductivity: number; // ×10⁻⁶ m/s

	// Reliability analysis
	coefficientOfVariation: number; // 0.05-0.5
}

// ============================================================================
// Hazard Statistics
// ============================================================================

/**
 * Statistics for hazard zones in the current view
 */
export interface HazardStatistics {
	/** Total number of features */
	total: number;
	/** Count by hazard level */
	byLevel: {
		low: number;
		moderate: number;
		high: number;
	};
	/** Total area by hazard level (square meters) */
	areaByLevel: {
		low: number;
		moderate: number;
		high: number;
	};
}

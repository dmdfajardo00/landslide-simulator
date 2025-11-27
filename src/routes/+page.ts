import type { PageLoad } from './$types';

export const load: PageLoad = ({ url }) => {
	const params = url.searchParams;

	// Parse query parameters with defaults
	const getFloat = (key: string, defaultValue: number) => {
		const value = params.get(key);
		return value !== null ? parseFloat(value) : defaultValue;
	};

	return {
		// Check if params were passed from map
		fromMap: params.has('slopeAngle'),
		// Slope Geometry
		slopeAngle: getFloat('slopeAngle', 30),
		maxElevation: getFloat('maxElevation', 50),
		soilDepth: getFloat('soilDepth', 3.0),
		// Soil Properties
		cohesion: getFloat('cohesion', 15),
		frictionAngle: getFloat('frictionAngle', 32),
		unitWeight: getFloat('unitWeight', 19.0),
		porosity: getFloat('porosity', 0.35),
		// Hydrological
		porePressure: getFloat('porePressure', 30),
		rainfallIntensity: getFloat('rainfallIntensity', 25),
		// Vegetation
		vegetationCover: getFloat('vegetationCover', 70)
	};
};

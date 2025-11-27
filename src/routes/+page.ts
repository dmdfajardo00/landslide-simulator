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
		// Terrain parameters
		slopeAngle: getFloat('slopeAngle', 30),
		maxElevation: getFloat('maxElevation', 50),
		// Environmental parameters
		vegetationCover: getFloat('vegetationCover', 70),
		erosion: getFloat('erosion', 20),
		soilMoisture: getFloat('soilMoisture', 30),
		rainfallIntensity: getFloat('rainfallIntensity', 25),
		// Geotechnical parameters
		soilDepth: getFloat('soilDepth', 3.0),
		unitWeight: getFloat('unitWeight', 19.0),
		cohesion: getFloat('cohesion', 15),
		frictionAngle: getFloat('frictionAngle', 32),
		hydraulicConductivity: getFloat('hydraulicConductivity', 5.0),
		// Reliability
		coefficientOfVariation: getFloat('coefficientOfVariation', 0.15)
	};
};

import type { HydrologicalState } from './types';

/**
 * Updates hydrological state based on infiltration processes.
 *
 * Models water infiltration into soil considering rainfall intensity,
 * hydraulic conductivity, vegetation effects, and current saturation state.
 *
 * @param state - Current hydrological state
 * @param params - Parameters affecting infiltration
 * @param params.rainfallIntensity - Rainfall rate in mm/hr
 * @param params.hydraulicConductivity - Soil permeability in ×10⁻⁶ m/s
 * @param params.vegetation - Vegetation coverage factor (0-1)
 * @param params.soilDepth - Total soil depth in meters
 * @param params.porosity - Soil porosity (0-1), defaults to 0.35
 * @param deltaTime - Time step in seconds
 * @returns Updated hydrological state
 */
export function updateInfiltration(
	state: HydrologicalState,
	params: {
		rainfallIntensity: number;
		hydraulicConductivity: number;
		vegetation: number;
		soilDepth: number;
		porosity?: number;
	},
	deltaTime: number
): HydrologicalState {
	const { rainfallIntensity, hydraulicConductivity, vegetation, soilDepth, porosity = 0.35 } =
		params;

	// Convert hydraulic conductivity from ×10⁻⁶ m/s to mm/hr
	// 1 m/s = 3,600,000 mm/hr
	const k_mmhr = hydraulicConductivity * 3600;

	// Calculate current saturation ratio
	const saturationRatio = state.saturationDepth / soilDepth;

	// Vegetation enhancement factor (increases infiltration capacity)
	// α represents root system effects on soil structure
	const alpha = vegetation * 0.5; // Vegetation can increase capacity by up to 50%

	// Calculate potential infiltration capacity
	// Uses modified Green-Ampt approach: capacity increases with unsaturated depth
	const infiltrationCapacity = k_mmhr * (1 + alpha * (1 - saturationRatio));

	// Actual infiltration is the minimum of rainfall and capacity
	const infiltrationRate = Math.min(rainfallIntensity, infiltrationCapacity);

	// Convert infiltration rate from mm/hr to m/s for depth calculation
	const infiltrationRate_ms = infiltrationRate / 3600000;

	// Calculate change in saturation depth
	// Accounts for porosity (only pore space can be filled)
	const deltaSaturation = (infiltrationRate_ms * deltaTime) / porosity;

	// Update saturation depth
	let newSaturationDepth = state.saturationDepth + deltaSaturation;

	// Cap saturation depth at soil depth
	newSaturationDepth = Math.max(0, Math.min(soilDepth, newSaturationDepth));

	// Calculate pore pressure (simplified)
	const WATER_UNIT_WEIGHT = 9.81; // kN/m³
	const newPorePressure = WATER_UNIT_WEIGHT * newSaturationDepth;

	// Calculate pore pressure ratio
	const SOIL_UNIT_WEIGHT = 18; // kN/m³ (typical value)
	const totalStress = SOIL_UNIT_WEIGHT * soilDepth;
	const newRu = totalStress > 0 ? Math.min(1, newPorePressure / totalStress) : 0;

	return {
		saturationDepth: newSaturationDepth,
		porePressure: newPorePressure,
		porePressureRatio: newRu,
		infiltrationRate: infiltrationRate
	};
}

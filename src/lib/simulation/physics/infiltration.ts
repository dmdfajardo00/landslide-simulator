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

	// Rainfall interception - canopy intercepts up to 30% of rainfall
	const interceptionFraction = vegetation * 0.30; // 0-30% intercepted
	const effectiveRainfall = rainfallIntensity * (1 - interceptionFraction);

	// Convert hydraulic conductivity from ×10⁻⁶ m/s to mm/hr
	// 1 m/s = 3,600,000 mm/hr
	const k_mmhr = hydraulicConductivity * 3600;

	// Calculate current saturation ratio (guard against division by zero)
	const saturationRatio = soilDepth > 0 ? state.saturationDepth / soilDepth : 1;

	// Vegetation enhancement factor (increases infiltration capacity)
	// α represents root system effects on soil structure
	const alpha = vegetation * 0.5; // Vegetation can increase capacity by up to 50%

	// Calculate potential infiltration capacity
	// Uses modified Green-Ampt approach: capacity increases with unsaturated depth
	const infiltrationCapacity = k_mmhr * (1 + alpha * (1 - saturationRatio));

	// Actual infiltration is the minimum of effective rainfall and capacity
	const infiltrationRate = Math.min(effectiveRainfall, infiltrationCapacity);

	// Convert infiltration rate from mm/hr to m/s for depth calculation
	const infiltrationRate_ms = infiltrationRate / 3600000;

	// Calculate change in saturation depth
	// Accounts for porosity (only pore space can be filled)
	// Guard against division by zero if porosity is 0
	const deltaSaturation = porosity > 0 ? (infiltrationRate_ms * deltaTime) / porosity : 0;

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

/**
 * Calculate evapotranspiration rate based on vegetation and saturation
 * @param vegetation - Vegetation cover fraction (0-1)
 * @param saturation - Current saturation ratio (0-1)
 * @param potentialET - Potential ET rate in mm/day (default 4.0 for temperate climate)
 * @returns ET rate in m/s (for direct use with deltaTime)
 */
export function calculateEvapotranspiration(
	vegetation: number,
	saturation: number,
	potentialET: number = 4.0 // mm/day reference for grass
): number {
	// ET only occurs if there's water and vegetation
	// Guard against negative values that would cause NaN from Math.sqrt
	if (vegetation <= 0 || saturation <= 0) return 0;

	// Clamp saturation to valid range to prevent Math.sqrt(negative) = NaN
	const safeSaturation = Math.max(0, Math.min(1, saturation));

	// Actual ET depends on vegetation density and water availability
	// At full vegetation and saturation: ET = potentialET
	// Reduced proportionally by vegetation cover and available water
	const actualET_mm_day = potentialET * vegetation * Math.sqrt(safeSaturation);

	// Convert mm/day to m/s for use with simulation time steps
	// 1 mm/day = 1e-3 m / (24 * 3600 s) = 1.157e-8 m/s
	const ET_m_per_s = actualET_mm_day * 1.157e-8;

	return ET_m_per_s;
}

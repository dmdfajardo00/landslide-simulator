/**
 * Calculates pore water pressure and pore pressure ratio.
 *
 * Pore pressure develops from water within soil pores and reduces
 * effective stress, potentially leading to slope instability.
 *
 * @param saturationDepth - Depth of water saturation in the soil (m)
 * @param soilDepth - Total depth of the soil layer (m)
 * @param unitWeight - Unit weight of soil (kN/m³), defaults to 18
 * @returns Object containing Pw (pore pressure in kPa) and ru (pore pressure ratio, 0-1)
 */
export function calculatePorePressure(
	saturationDepth: number,
	soilDepth: number,
	unitWeight: number = 18
): { Pw: number; ru: number } {
	// Water unit weight (γw = 9.81 kN/m³)
	const WATER_UNIT_WEIGHT = 9.81;

	// Calculate pore pressure: Pw = γw × hw
	// where hw is the height of water (saturation depth)
	const Pw = WATER_UNIT_WEIGHT * saturationDepth;

	// Calculate pore pressure ratio: ru = Pw / (γ × H)
	// This represents the proportion of total stress carried by pore water
	const totalStress = unitWeight * soilDepth;
	let ru = totalStress > 0 ? Pw / totalStress : 0;

	// Normalize ru to [0, 1] range
	ru = Math.max(0, Math.min(1, ru));

	return { Pw, ru };
}

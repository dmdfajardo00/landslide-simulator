import type { GeotechnicalParams } from './types';

/**
 * Calculates the Factor of Safety (FoS) using the infinite slope analysis method.
 *
 * The FoS represents the ratio of resisting forces to driving forces on a slope.
 * Values > 1.0 indicate stability, < 1.0 indicate potential failure.
 *
 * Formula: FoS = [c' + (γ·z·cos²β - u)·tan(φ')] / [γ·z·sin(β)·cos(β)]
 *
 * @param params - Geotechnical parameters including slope geometry and soil properties
 * @param porePressure - Pore water pressure (u) in kPa
 * @returns Factor of Safety value clamped between 0.1 and 5.0
 */
export function calculateFoS(params: GeotechnicalParams, porePressure: number): number {
	const { slopeAngle, soilDepth, unitWeight, cohesion, frictionAngle } = params;

	// Handle edge cases
	if (slopeAngle <= 0) {
		return 5.0; // Flat slope - maximum stability
	}
	if (slopeAngle >= 90) {
		return 0.1; // Vertical slope - minimum stability
	}

	// Convert angles to radians
	const betaRad = (slopeAngle * Math.PI) / 180;
	const phiRad = (frictionAngle * Math.PI) / 180;

	// Calculate trigonometric values
	const sinBeta = Math.sin(betaRad);
	const cosBeta = Math.cos(betaRad);
	const cos2Beta = cosBeta * cosBeta;
	const tanPhi = Math.tan(phiRad);

	// Calculate normal stress component
	const normalStress = unitWeight * soilDepth * cos2Beta;

	// Calculate effective normal stress (accounting for pore pressure)
	const effectiveNormalStress = normalStress - porePressure;

	// Calculate resisting forces
	const cohesiveResistance = cohesion;
	const frictionalResistance = effectiveNormalStress * tanPhi;
	const totalResistance = cohesiveResistance + frictionalResistance;

	// Calculate driving forces
	const drivingForce = unitWeight * soilDepth * sinBeta * cosBeta;

	// Avoid division by zero
	if (drivingForce <= 0.001) {
		return 5.0;
	}

	// Calculate Factor of Safety
	const fos = totalResistance / drivingForce;

	// Guard against NaN/Infinity propagation
	if (!isFinite(fos)) {
		return fos > 0 ? 5.0 : 0.1;
	}

	// Clamp to realistic range [0.1, 5.0]
	return Math.max(0.1, Math.min(5.0, fos));
}

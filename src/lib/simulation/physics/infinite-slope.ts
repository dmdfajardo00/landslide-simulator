import type { GeotechnicalParams } from './types';

/**
 * Core FoS calculation without edge case handling.
 * Used internally for calculating base values at specific angles.
 */
function calculateFoSCore(
	slopeAngle: number,
	soilDepth: number,
	unitWeight: number,
	cohesion: number,
	frictionAngle: number,
	porePressure: number
): number {
	const betaRad = (slopeAngle * Math.PI) / 180;
	const phiRad = (frictionAngle * Math.PI) / 180;

	const sinBeta = Math.sin(betaRad);
	const cosBeta = Math.cos(betaRad);
	const cos2Beta = cosBeta * cosBeta;
	const tanPhi = Math.tan(phiRad);

	const normalStress = unitWeight * soilDepth * cos2Beta;
	const effectiveNormalStress = normalStress - porePressure;
	const totalResistance = cohesion + effectiveNormalStress * tanPhi;
	const drivingForce = unitWeight * soilDepth * sinBeta * cosBeta;

	if (drivingForce <= 0.001) return 5.0;
	return totalResistance / drivingForce;
}

/**
 * Calculates the Factor of Safety (FoS) using the infinite slope analysis method.
 *
 * The FoS represents the ratio of resisting forces to driving forces on a slope.
 * Values > 1.0 indicate stability, < 1.0 indicate potential failure.
 *
 * Formula: FoS = [c' + (γ·z·cos²β - u)·tan(φ')] / [γ·z·sin(β)·cos(β)]
 *
 * Note: The infinite slope model is only valid for shallow slopes (typically < 45°).
 * For steeper slopes (> 60°), an exponential decay is applied to account for
 * model breakdown and transition toward vertical slope instability.
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
	// Infinite slope model breaks down at steep angles (>60°)
	// Apply exponential decay for angles beyond the model's validity
	if (slopeAngle > 60) {
		// Calculate base FoS at 60° then decay exponentially toward 0.1
		const steepnessFactor = (slopeAngle - 60) / 30; // 0 at 60°, 1 at 90°
		const decayRate = 3; // Controls how fast FoS drops
		const baseFoS = calculateFoSCore(60, soilDepth, unitWeight, cohesion, frictionAngle, porePressure);
		const decayedFoS = 0.1 + (baseFoS - 0.1) * Math.exp(-decayRate * steepnessFactor);
		return Math.max(0.1, Math.min(5.0, decayedFoS));
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

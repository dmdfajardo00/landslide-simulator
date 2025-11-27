/**
 * Calculates Probability of Failure (PoF) using First-Order Second-Moment (FOSM) method.
 *
 * This reliability analysis approach accounts for uncertainty in soil parameters
 * to estimate failure probability rather than just deterministic FoS.
 *
 * @param fos - Factor of Safety value
 * @param cov - Coefficient of Variation (ratio of standard deviation to mean), typical range 0.1-0.3
 * @returns Probability of Failure as a percentage (0-100)
 */
export function calculatePoF(fos: number, cov: number): number {
	// Guard against invalid inputs that would cause division by zero or NaN
	if (cov <= 0 || fos <= 0) {
		return fos < 1 ? 100 : 0; // If FoS < 1, failure is certain; otherwise safe
	}

	// Calculate reliability index (β)
	// β represents the number of standard deviations between mean and failure point
	// β = (FoS - 1) / (FoS × COV)
	const denominator = fos * cov;
	const beta = denominator > 0.0001 ? (fos - 1) / denominator : 0;

	// Guard against NaN/Infinity propagation
	if (!isFinite(beta)) {
		return fos < 1 ? 100 : 0;
	}

	// Calculate probability of failure using standard normal CDF
	// PoF = Φ(-β) where Φ is the cumulative distribution function
	const pof = standardNormalCDF(-beta);

	// Return as percentage [0-100]
	return Math.max(0, Math.min(100, pof * 100));
}

/**
 * Approximates the standard normal cumulative distribution function Φ(x).
 *
 * Uses the error function (erf) approximation for computational efficiency.
 * Accurate to within 0.00015 of the true value.
 *
 * @param x - Standard normal variable
 * @returns Cumulative probability P(X ≤ x)
 */
function standardNormalCDF(x: number): number {
	// CDF(x) = 0.5 × (1 + erf(x / √2))
	return 0.5 * (1 + erf(x / Math.SQRT2));
}

/**
 * Error function approximation using Abramowitz and Stegun method.
 *
 * Provides a fast, accurate approximation of the error function
 * without requiring external math libraries.
 *
 * @param x - Input value
 * @returns erf(x) approximation
 */
function erf(x: number): number {
	// Constants for Abramowitz and Stegun approximation
	const a1 = 0.254829592;
	const a2 = -0.284496736;
	const a3 = 1.421413741;
	const a4 = -1.453152027;
	const a5 = 1.061405429;
	const p = 0.3275911;

	// Save the sign of x
	const sign = x >= 0 ? 1 : -1;
	const absX = Math.abs(x);

	// A&S formula 7.1.26
	const t = 1.0 / (1.0 + p * absX);
	const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

	return sign * y;
}

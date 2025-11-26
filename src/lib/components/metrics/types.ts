/**
 * Status levels for landslide metrics
 */
export type Status = 'safe' | 'marginal' | 'critical' | 'failure';

/**
 * Metrics thresholds for landslide analysis
 */
export const THRESHOLDS = {
	fos: {
		safe: 1.5,
		marginal: 1.2,
		critical: 1.0
	},
	pof: {
		safe: 5,
		marginal: 20,
		critical: 50
	},
	ru: {
		safe: 0.25,
		marginal: 0.35,
		critical: 0.5
	},
	cohesion: {
		safe: 20,
		marginal: 10,
		critical: 5
	}
} as const;

/**
 * Calculate overall system status from FoS and PoF
 * Uses the most critical status between the two primary metrics
 */
export function calculateOverallStatus(fos: number, pof: number): Status {
	// Calculate individual statuses
	const fosStatus = getFosStatus(fos);
	const pofStatus = getPofStatus(pof);

	// Return the most critical status
	const statusPriority: Record<Status, number> = {
		safe: 0,
		marginal: 1,
		critical: 2,
		failure: 3
	};

	const fosPriority = statusPriority[fosStatus];
	const pofPriority = statusPriority[pofStatus];

	return fosPriority > pofPriority ? fosStatus : pofStatus;
}

/**
 * Calculate Factor of Safety status
 * Safe: FoS ≥ 1.5
 * Marginal: FoS 1.2-1.5
 * Critical: FoS 1.0-1.2
 * Failure: FoS < 1.0
 */
export function getFosStatus(value: number): Status {
	if (value >= THRESHOLDS.fos.safe) return 'safe';
	if (value >= THRESHOLDS.fos.marginal) return 'marginal';
	if (value >= THRESHOLDS.fos.critical) return 'critical';
	return 'failure';
}

/**
 * Calculate Probability of Failure status
 * Safe: PoF < 5%
 * Marginal: PoF 5-20%
 * Critical: PoF 20-50%
 * Failure: PoF > 50%
 */
export function getPofStatus(value: number): Status {
	if (value < THRESHOLDS.pof.safe) return 'safe';
	if (value < THRESHOLDS.pof.marginal) return 'marginal';
	if (value < THRESHOLDS.pof.critical) return 'critical';
	return 'failure';
}

/**
 * Calculate Pore Pressure Ratio status
 * Higher ru values indicate more critical conditions
 * Safe: ru < 0.25
 * Marginal: ru 0.25-0.35
 * Critical: ru 0.35-0.5
 * Failure: ru ≥ 0.5
 */
export function getRuStatus(value: number): Status {
	if (value < THRESHOLDS.ru.safe) return 'safe';
	if (value < THRESHOLDS.ru.marginal) return 'marginal';
	if (value < THRESHOLDS.ru.critical) return 'critical';
	return 'failure';
}

/**
 * Calculate Effective Cohesion status
 * Higher cohesion is safer
 * Safe: cohesion ≥ 20 kPa
 * Marginal: cohesion 10-20 kPa
 * Critical: cohesion 5-10 kPa
 * Failure: cohesion < 5 kPa
 */
export function getCohesionStatus(value: number): Status {
	if (value >= THRESHOLDS.cohesion.safe) return 'safe';
	if (value >= THRESHOLDS.cohesion.marginal) return 'marginal';
	if (value >= THRESHOLDS.cohesion.critical) return 'critical';
	return 'failure';
}

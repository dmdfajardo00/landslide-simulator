/**
 * Landslide Physics Module
 *
 * Implements terrain-based landslide simulation using progressive deformation.
 * The landslide is visualized through terrain mesh deformation, not particles.
 *
 * Model: Shallow translational slide with:
 * - Head scarp formation (terrain lowering at failure head)
 * - Progressive mass transport downslope
 * - Toe deposition (terrain bulging at runout zone)
 */

export interface FailureZone {
	// Failure zone spans horizontally across the slope
	startX: number;       // World X start (left edge)
	endX: number;         // World X end (right edge)
	headZ: number;        // World Z of head scarp (upper edge)
	toeZ: number;         // World Z of toe (lower edge, deposition zone)
	depth: number;        // Maximum failure depth (m)
	angle: number;        // Slope angle at failure (degrees)
	width: number;        // Horizontal span (endX - startX)
	length: number;       // Downslope length (toeZ - headZ)
}

export interface LandslideState {
	phase: 'dormant' | 'initiating' | 'flowing' | 'depositing' | 'complete';
	progress: number;     // 0-1 animation progress (controls deformation intensity)
	failureZone: FailureZone | null;
	totalVolume: number;  // m³ of displaced material
	runoutDistance: number;
	elapsedTime: number;
}

export interface TerrainDeformation {
	scarpDepth: Float32Array;      // Erosion at each vertex (positive = terrain lowered)
	depositionDepth: Float32Array; // Deposition at each vertex (positive = terrain raised)
}

/**
 * Initialize a new landslide state
 */
export function createLandslideState(): LandslideState {
	return {
		phase: 'dormant',
		progress: 0,
		failureZone: null,
		totalVolume: 0,
		runoutDistance: 0,
		elapsedTime: 0
	};
}

/**
 * Calculate the failure zone - spans horizontally across the slope
 *
 * TERRAIN ORIENTATION:
 * - HIGH Z = TOP of slope (high elevation, where head scarp forms)
 * - LOW Z = BOTTOM of slope (low elevation, where toe bulge forms)
 *
 * Parameters significantly affect the failure characteristics:
 * - slopeAngle: Steeper slopes = deeper failures, longer runout
 * - soilDepth: Deeper soil = larger failure mass
 * - saturation: Higher saturation = deeper failure, longer runout
 * - maxElevation: Scales the visual impact of deformation
 */
export function calculateFailureZone(
	heightmap: Float32Array,
	width: number,
	height: number,
	worldScale: number,
	maxElevation: number,
	slopeAngle: number,
	soilDepth: number,
	saturation: number
): FailureZone {
	// Failure zone spans most of the slope width (70-90% of terrain width)
	const marginX = worldScale * 0.1; // 10% margin on each side
	const startX = marginX;
	const endX = worldScale - marginX;

	// HEAD SCARP is at TOP of slope (HIGH Z values, near 70-85% of worldScale)
	// Steeper slopes fail higher up
	const headPosition = 0.70 + (slopeAngle / 60) * 0.15; // 0.70-0.85 from origin
	const headZ = worldScale * headPosition;

	// Runout distance - material flows DOWNHILL (toward LOW Z values)
	// Steeper slopes and wetter conditions = longer runout
	const slopeFactor = slopeAngle / 30; // 1.0 at 30°, 2.0 at 60°
	const runoutFactor = 1.5 + slopeFactor * 1.5 + saturation * 1.5;
	const runoutLength = worldScale * 0.35 * runoutFactor;

	// TOE is at BOTTOM of slope (LOW Z values) - material accumulates here
	const toeZ = Math.max(headZ - runoutLength, worldScale * 0.1);

	// Failure depth scales significantly with parameters
	// Base depth from soil, amplified by slope steepness and saturation
	// Scaled relative to maxElevation for visual impact
	const baseDepth = soilDepth * 0.8; // 80% of soil depth as base
	const slopeAmplifier = 1 + (slopeAngle - 20) / 30; // 1.0 at 20°, 2.0 at 50°
	const saturationAmplifier = 1 + saturation * 1.5; // 1.0 at 0%, 2.5 at 100%

	// Scale depth to be visually significant (2-15% of max elevation)
	const rawDepth = baseDepth * slopeAmplifier * saturationAmplifier;
	const minVisibleDepth = maxElevation * 0.02; // At least 2% of max elevation
	const maxDepth = maxElevation * 0.15; // Cap at 15% of max elevation
	const failureDepth = Math.max(minVisibleDepth, Math.min(rawDepth, maxDepth));

	return {
		startX,
		endX,
		headZ,  // TOP of slope (high Z)
		toeZ,   // BOTTOM of slope (low Z)
		depth: failureDepth,
		angle: slopeAngle,
		width: endX - startX,
		length: headZ - toeZ  // Length is headZ - toeZ since head > toe
	};
}

/**
 * Update landslide state - advances the deformation progress
 */
export function updateLandslideState(
	state: LandslideState,
	deltaTime: number
): LandslideState {
	if (state.phase === 'dormant' || state.phase === 'complete') {
		return state;
	}

	const newElapsedTime = state.elapsedTime + deltaTime;
	let newProgress = state.progress;
	let newPhase: LandslideState['phase'] = state.phase;

	// Progress advances over time (faster initially, then slowing)
	// Total duration ~15-20 seconds for complete slide
	const progressRate = 0.08 * (1 - state.progress * 0.7); // Slows as it progresses
	newProgress = Math.min(1.0, state.progress + progressRate * deltaTime);

	// Phase transitions based on progress
	if (newProgress < 0.2) {
		newPhase = 'initiating';
	} else if (newProgress < 0.7) {
		newPhase = 'flowing';
	} else if (newProgress < 1.0) {
		newPhase = 'depositing';
	} else {
		newPhase = 'complete';
	}

	return {
		...state,
		phase: newPhase,
		progress: newProgress,
		elapsedTime: newElapsedTime
	};
}

/**
 * Calculate terrain deformation based on landslide progress
 *
 * TERRAIN ORIENTATION:
 * - HIGH Z = TOP of slope (head scarp forms here - terrain DROPS)
 * - LOW Z = BOTTOM of slope (toe bulge forms here - terrain RISES)
 *
 * Realistic rotational/translational slump model:
 * - HEAD SCARP: Near-vertical drop at TOP where terrain broke away
 * - SLUMP BODY: Rotated backward blocks with internal fractures
 * - TOE BULGE: Raised terrain at BOTTOM where material accumulated
 *
 * All deformation is controlled by the progress value (0-1)
 */
export function calculateTerrainDeformation(
	failureZone: FailureZone,
	progress: number,
	width: number,
	height: number,
	worldScale: number,
	existingScarp?: Float32Array,
	existingDeposition?: Float32Array
): TerrainDeformation {
	// Reuse existing arrays or create new ones
	const scarpDepth = existingScarp || new Float32Array(width * height);
	const depositionDepth = existingDeposition || new Float32Array(width * height);

	// Clear arrays
	scarpDepth.fill(0);
	depositionDepth.fill(0);

	if (progress <= 0) {
		return { scarpDepth, depositionDepth };
	}

	const { startX, endX, headZ, toeZ, depth, length: slideLength } = failureZone;

	// Deformation front progresses from head (top, high Z) toward toe (bottom, low Z)
	const deformationFront = headZ - slideLength * progress;

	// Define internal fracture locations (normalized: 0 = head/top, 1 = toe/bottom)
	const fractures = [0.15, 0.28, 0.42, 0.55];
	const fractureWidthNorm = 0.025;

	for (let gz = 0; gz < height; gz++) {
		for (let gx = 0; gx < width; gx++) {
			const worldX = (gx / (width - 1)) * worldScale;
			const worldZ = (gz / (height - 1)) * worldScale;
			const idx = gz * width + gx;

			// Check if within failure zone X bounds (with soft edges)
			const xMargin = (endX - startX) * 0.1;
			let xFactor = 1.0;
			if (worldX < startX) {
				xFactor = Math.max(0, 1 - (startX - worldX) / xMargin);
			} else if (worldX > endX) {
				xFactor = Math.max(0, 1 - (worldX - endX) / xMargin);
			}

			if (xFactor <= 0) continue;

			// Calculate Z position relative to slide
			// relativeZ = 0 at headZ (top), = 1 at toeZ (bottom)
			const relativeZ = (headZ - worldZ) / slideLength;

			// Only process if deformation has reached this point
			if (worldZ < deformationFront) continue;

			// ========== HEAD SCARP ZONE (relativeZ 0-0.12) ==========
			// Near-vertical drop at TOP of slope where terrain broke away
			if (relativeZ >= -0.02 && relativeZ <= 0.12) {
				const scarpRelZ = (relativeZ + 0.02) / 0.14;

				// Steep exponential curve for dramatic back wall
				const scarpCurve = Math.pow(1 - scarpRelZ, 3.5);

				// Head scarp is 70-100% of failure depth
				const headScarpDepth = depth * (0.7 + progress * 0.3);
				const scarpAmount = headScarpDepth * scarpCurve * xFactor;

				const variation = 0.95 + ((gx * 7 + gz * 13) % 100) * 0.001;
				scarpDepth[idx] = scarpAmount * variation;
			}

			// ========== SLUMP BODY (relativeZ 0.12-0.60) ==========
			// Step-like terraces with internal fractures
			else if (relativeZ > 0.12 && relativeZ < 0.60) {
				let blockDepth = 0;
				let isInFracture = false;

				// Check if at a fracture line
				for (const fracturePos of fractures) {
					if (relativeZ > fracturePos - fractureWidthNorm && relativeZ <= fracturePos + fractureWidthNorm) {
						isInFracture = true;
						const fractureRelPos = (relativeZ - (fracturePos - fractureWidthNorm)) / (fractureWidthNorm * 2);
						const fractureCurve = Math.pow(1 - fractureRelPos, 2.5);
						const fractureDepthRatio = 0.4 - (fracturePos * 0.3);
						blockDepth = depth * fractureDepthRatio * fractureCurve;
						break;
					}
				}

				if (!isInFracture) {
					// Between fractures: backward-tilted blocks
					let blockStart = 0.12;
					let blockEnd = fractures[0];
					for (let i = 0; i < fractures.length; i++) {
						if (relativeZ >= fractures[i]) {
							blockStart = fractures[i];
							blockEnd = i < fractures.length - 1 ? fractures[i + 1] : 0.60;
						}
					}

					const blockRelZ = (relativeZ - blockStart) / (blockEnd - blockStart);
					const rotationTilt = 0.3 + blockRelZ * 0.5;
					const depthFactor = Math.max(0, 0.5 - (relativeZ - 0.12) / 1.0);
					blockDepth = depth * depthFactor * rotationTilt;
				}

				const variation = 0.9 + ((gx * 11 + gz * 17) % 100) * 0.002;
				scarpDepth[idx] = Math.max(0, blockDepth * xFactor * variation);
			}

			// ========== TOE BULGE ZONE (relativeZ 0.60-1.05) ==========
			// Raised terrain at BOTTOM where material accumulated
			else if (relativeZ >= 0.60 && relativeZ <= 1.1) {
				const depositionProgress = Math.min(1, Math.max(0, progress - 0.2) / 0.8);

				if (depositionProgress > 0) {
					const peakZ = 0.75 + progress * 0.1;
					const distFromPeak = Math.abs(relativeZ - peakZ);

					let bulgeIntensity;
					if (relativeZ < peakZ) {
						bulgeIntensity = Math.pow(Math.max(0, 1 - distFromPeak / 0.2), 1.5);
					} else {
						bulgeIntensity = Math.pow(Math.max(0, 1 - distFromPeak / 0.4), 2.0);
					}

					bulgeIntensity = Math.max(0, bulgeIntensity * depositionProgress);

					// Toe bulge rises 80-120% of failure depth
					const bulgeFactor = 0.8 + progress * 0.4;
					const depositionAmount = depth * bulgeFactor * bulgeIntensity * xFactor;

					const variation = 0.85 + ((gx * 13 + gz * 11) % 100) * 0.003;
					depositionDepth[idx] = depositionAmount * variation;
				}
			}
		}
	}

	return { scarpDepth, depositionDepth };
}

/**
 * Calculate total displaced volume (for metrics display)
 */
export function calculateDisplacedVolume(
	failureZone: FailureZone,
	progress: number
): number {
	const { width, length, depth } = failureZone;
	const sourceLength = length * 0.5; // Only count source area (head scarp + transport)
	const effectiveDepth = depth * progress * 0.7; // Average effective depth

	return width * sourceLength * effectiveDepth;
}

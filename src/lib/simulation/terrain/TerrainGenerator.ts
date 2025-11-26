import { createNoise2D, type NoiseFunction2D } from 'simplex-noise';

/**
 * Configuration for terrain generation
 */
export interface TerrainConfig {
	width: number;
	height: number;
	worldScale: number;
	maxElevation: number;
	slopeAngle: number;
	noiseOctaves: number;
	noisePersistence: number;
	noiseScale: number;
	ridgeSharpness: number;
}

export const DEFAULT_TERRAIN_CONFIG: TerrainConfig = {
	width: 128,
	height: 128,
	worldScale: 100,
	maxElevation: 40,
	slopeAngle: 30,
	noiseOctaves: 5,
	noisePersistence: 0.5,
	noiseScale: 0.025,
	ridgeSharpness: 0.4
};

/**
 * TerrainGenerator - Creates realistic mountain slope terrain
 * Outputs normalized [0, 1] heightmap values
 */
export class TerrainGenerator {
	private config: TerrainConfig;
	private heightmap: Float32Array | null = null;
	private noiseGenerator: NoiseFunction2D;

	constructor(config: Partial<TerrainConfig> = {}) {
		this.config = { ...DEFAULT_TERRAIN_CONFIG, ...config };
		this.noiseGenerator = createNoise2D();
	}

	/**
	 * Generate heightmap with mountain slope shape
	 * Returns normalized values [0, 1] - multiply by maxElevation for world units
	 */
	generateHeightmap(config?: Partial<TerrainConfig>): Float32Array {
		if (config) {
			this.config = { ...this.config, ...config };
		}

		const { width, height, slopeAngle, noiseOctaves, noisePersistence, noiseScale, ridgeSharpness } = this.config;
		const vertexCount = width * height;
		this.heightmap = new Float32Array(vertexCount);

		// Convert slope angle to a height ratio
		const slopeRadians = (slopeAngle * Math.PI) / 180;
		const slopeRatio = Math.tan(slopeRadians);

		// Track min/max for normalization
		let minHeight = Infinity;
		let maxHeight = -Infinity;

		// First pass: generate raw heights
		const rawHeights = new Float32Array(vertexCount);

		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const index = z * width + x;

				// Normalized coordinates [0, 1]
				const normX = x / (width - 1);
				const normZ = z / (height - 1);

				// Base slope: rises from front (z=0) to back (z=1)
				// Creates the main hillside slope
				const baseSlope = normZ * slopeRatio;

				// Add a mountain ridge shape - higher in the center-back
				const centerX = 0.5;
				const ridgeCenter = 0.7; // Ridge positioned toward back
				const distFromCenter = Math.abs(normX - centerX);
				const distFromRidge = Math.abs(normZ - ridgeCenter);

				// Create a rounded peak shape
				const peakFalloff = 1 - Math.sqrt(distFromCenter * distFromCenter * 0.5 + distFromRidge * distFromRidge);
				const peakContribution = Math.max(0, peakFalloff) * 0.6;

				// Multi-octave fractal noise for natural variation
				let noiseValue = 0;
				let amplitude = 1;
				let frequency = noiseScale;
				let maxAmplitude = 0;

				for (let octave = 0; octave < noiseOctaves; octave++) {
					const nx = x * frequency;
					const nz = z * frequency;
					noiseValue += this.noiseGenerator(nx, nz) * amplitude;
					maxAmplitude += amplitude;
					amplitude *= noisePersistence;
					frequency *= 2;
				}

				noiseValue /= maxAmplitude; // Normalize to [-1, 1]

				// Ridge enhancement - creates sharper peaks
				const ridgeNoise = (1 - Math.abs(noiseValue)) * ridgeSharpness + noiseValue * (1 - ridgeSharpness);

				// Combine all contributions
				const terrainNoise = ridgeNoise * 0.35; // Noise adds ±35% variation

				// Edge falloff to create natural boundaries
				const edgeFalloff = this.calculateEdgeFalloff(normX, normZ);

				// Final height combining slope, peak, and noise
				const rawHeight = (baseSlope * 0.5 + peakContribution + terrainNoise * 0.5) * edgeFalloff;
				rawHeights[index] = rawHeight;

				minHeight = Math.min(minHeight, rawHeight);
				maxHeight = Math.max(maxHeight, rawHeight);
			}
		}

		// Second pass: normalize to [0, 1]
		const heightRange = maxHeight - minHeight;
		if (heightRange > 0) {
			for (let i = 0; i < vertexCount; i++) {
				this.heightmap[i] = (rawHeights[i] - minHeight) / heightRange;
			}
		}

		return this.heightmap;
	}

	/**
	 * Calculate edge falloff to prevent harsh terrain boundaries
	 */
	private calculateEdgeFalloff(normX: number, normZ: number): number {
		const edgeWidth = 0.08;

		// Calculate distance from each edge
		const falloffX = Math.min(
			this.smoothstep(0, edgeWidth, normX),
			this.smoothstep(0, edgeWidth, 1 - normX)
		);
		const falloffZ = Math.min(
			this.smoothstep(0, edgeWidth, normZ),
			this.smoothstep(0, edgeWidth, 1 - normZ)
		);

		return falloffX * falloffZ;
	}

	private smoothstep(edge0: number, edge1: number, x: number): number {
		const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
		return t * t * (3 - 2 * t);
	}

	/**
	 * Get height at world position (returns normalized [0, 1])
	 */
	getHeightAt(worldX: number, worldZ: number): number {
		if (!this.heightmap) return 0;

		const { width, height, worldScale } = this.config;

		// Convert world to grid coordinates
		const gridX = (worldX / worldScale) * (width - 1);
		const gridZ = (worldZ / worldScale) * (height - 1);

		if (gridX < 0 || gridX >= width - 1 || gridZ < 0 || gridZ >= height - 1) {
			return 0;
		}

		// Bilinear interpolation
		const x0 = Math.floor(gridX);
		const z0 = Math.floor(gridZ);
		const fx = gridX - x0;
		const fz = gridZ - z0;

		const h00 = this.heightmap[z0 * width + x0];
		const h10 = this.heightmap[z0 * width + x0 + 1];
		const h01 = this.heightmap[(z0 + 1) * width + x0];
		const h11 = this.heightmap[(z0 + 1) * width + x0 + 1];

		return (h00 * (1 - fx) + h10 * fx) * (1 - fz) + (h01 * (1 - fx) + h11 * fx) * fz;
	}

	getConfig(): TerrainConfig {
		return { ...this.config };
	}

	setConfig(config: Partial<TerrainConfig>): void {
		this.config = { ...this.config, ...config };
	}

	getHeightmap(): Float32Array | null {
		return this.heightmap;
	}
}

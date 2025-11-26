<script lang="ts">
	import { T } from '@threlte/core';
	import { onDestroy } from 'svelte';
	import * as THREE from 'three';

	interface Props {
		heightmap: Float32Array;
		width?: number;
		height?: number;
		worldScale?: number;
		maxElevation?: number;
		vegetationCover?: number; // 0-100%
		soilDepth?: number; // meters
		saturation?: number; // 0-1, represents saturationDepth/soilDepth ratio
		porePressureRatio?: number; // ru, 0-0.5, controls blue tint intensity
		// Landslide deformation
		scarpDepth?: Float32Array | null; // Erosion depth per vertex
		depositionDepth?: Float32Array | null; // Deposition height per vertex
		// Version counter to force updates when arrays change in-place
		deformationVersion?: number;
	}

	let {
		heightmap,
		width = 128,
		height = 128,
		worldScale = 100,
		maxElevation = 50,
		vegetationCover = 70,
		soilDepth = 3.0,
		saturation = 0,
		porePressureRatio = 0,
		scarpDepth = null,
		depositionDepth = null,
		deformationVersion = 0
	}: Props = $props();

	// Stable geometry reference - created once, reused
	// Using $state to trigger re-render when geometry is first created
	let geometry = $state<THREE.PlaneGeometry | null>(null);
	let colorAttribute: THREE.BufferAttribute | null = null;

	// Terrain color palettes - lush vs barren
	const COLORS_LUSH = {
		grass: new THREE.Color(0x4a7c23),      // Green grass
		grassDry: new THREE.Color(0x6b8e3d),   // Yellow-green
		dirt: new THREE.Color(0x8b7355),       // Brown dirt
		rock: new THREE.Color(0x7a7a7a),       // Gray rock
		scarp: new THREE.Color(0xc9bba8),      // Light exposed
	};

	const COLORS_BARREN = {
		grass: new THREE.Color(0x9a8b6d),      // Dry tan/brown
		grassDry: new THREE.Color(0x8a7b5d),   // Dusty brown
		dirt: new THREE.Color(0x7a6b55),       // Darker brown
		rock: new THREE.Color(0x6a6a6a),       // Gray rock
		scarp: new THREE.Color(0xc9bba8),      // Light exposed (same)
	};

	// Wet terrain color palette
	const COLORS_WET = {
		grass: new THREE.Color(0x3d6b1f),      // Darker wet green
		grassDry: new THREE.Color(0x5a7b4d),   // Darker yellow-green
		dirt: new THREE.Color(0x5c4a3a),       // Darker wet brown
		rock: new THREE.Color(0x5a5a5a),       // Darker wet gray
		scarp: new THREE.Color(0xa9a090),      // Slightly darker
	};

	// Bedrock color palette - darker grays and browns
	const COLORS_BEDROCK = {
		light: new THREE.Color(0x555555),      // Medium gray
		medium: new THREE.Color(0x4a4a4a),     // Darker gray
		dark: new THREE.Color(0x3a3a3a),       // Very dark gray
	};

	// Scarp (exposed failure surface) colors - lighter exposed subsoil
	const COLORS_SCARP_EXPOSED = {
		fresh: new THREE.Color(0xd4c4a8),      // Light tan/cream (fresh exposure)
		subsoil: new THREE.Color(0xb8a080),    // Tan subsoil
		saprolite: new THREE.Color(0xa09078),  // Weathered rock
	};

	// Debris deposition colors
	const COLORS_DEPOSITION = {
		fresh: new THREE.Color(0x4a3828),      // Dark wet debris
		dried: new THREE.Color(0x6b5848),      // Drying debris
	};

	// Interpolate between barren and lush based on vegetation
	function getColors() {
		const t = vegetationCover / 100; // 0 = barren, 1 = lush
		return {
			grass: new THREE.Color().lerpColors(COLORS_BARREN.grass, COLORS_LUSH.grass, t),
			grassDry: new THREE.Color().lerpColors(COLORS_BARREN.grassDry, COLORS_LUSH.grassDry, t),
			dirt: new THREE.Color().lerpColors(COLORS_BARREN.dirt, COLORS_LUSH.dirt, t),
			rock: new THREE.Color().lerpColors(COLORS_BARREN.rock, COLORS_LUSH.rock, t),
			scarp: new THREE.Color().lerpColors(COLORS_BARREN.scarp, COLORS_LUSH.scarp, t),
		};
	}

	let COLORS = $derived(getColors());

	// Pre-allocate reusable Color objects to avoid GC pressure
	// These are used in tight loops (16K+ iterations per frame)
	const tempColorA = new THREE.Color();
	const tempColorB = new THREE.Color();
	const tempColorResult = new THREE.Color();
	const blueColor = new THREE.Color(0x0d47a1); // Deep blue (constant)

	// Lerp between two colors INTO target (no allocation)
	function lerpColorInto(target: THREE.Color, c1: THREE.Color, c2: THREE.Color, t: number): void {
		target.r = c1.r + (c2.r - c1.r) * t;
		target.g = c1.g + (c2.g - c1.g) * t;
		target.b = c1.b + (c2.b - c1.b) * t;
	}

	// Apply wetness effect in-place (no allocation)
	function applyWetnessInPlace(color: THREE.Color, sat: number, ru: number): void {
		// Darken based on saturation (0.85 to 1.0 multiplier)
		const darkenFactor = 0.85 + (1 - sat) * 0.15;
		color.r *= darkenFactor;
		color.g *= darkenFactor;
		color.b *= darkenFactor;

		// Add blue tint based on pore pressure ratio
		const tintStrength = ru * 0.3;
		color.lerp(blueColor, tintStrength);
	}

	// Get color based on slope angle INTO target (no allocation)
	function getColorForSlopeInto(target: THREE.Color, slopeDegrees: number): void {
		if (slopeDegrees < 20) {
			target.copy(COLORS.grass);
		} else if (slopeDegrees < 30) {
			const t = (slopeDegrees - 20) / 10;
			lerpColorInto(target, COLORS.grass, COLORS.grassDry, t);
		} else if (slopeDegrees < 45) {
			const t = (slopeDegrees - 30) / 15;
			lerpColorInto(target, COLORS.grassDry, COLORS.dirt, t);
		} else if (slopeDegrees < 60) {
			const t = (slopeDegrees - 45) / 15;
			lerpColorInto(target, COLORS.dirt, COLORS.rock, t);
		} else if (slopeDegrees < 75) {
			const t = (slopeDegrees - 60) / 15;
			lerpColorInto(target, COLORS.rock, COLORS.scarp, t);
		} else {
			target.copy(COLORS.scarp);
		}
	}

	// Calculate slope at a heightmap position
	function calculateSlope(x: number, z: number): number {
		const idx = z * width + x;
		const h = heightmap[idx] * maxElevation;
		const cellSize = worldScale / (width - 1);

		// Get neighboring heights with boundary clamping
		const hL = (x > 0 ? heightmap[idx - 1] : heightmap[idx]) * maxElevation;
		const hR = (x < width - 1 ? heightmap[idx + 1] : heightmap[idx]) * maxElevation;
		const hD = (z > 0 ? heightmap[idx - width] : heightmap[idx]) * maxElevation;
		const hU = (z < height - 1 ? heightmap[idx + width] : heightmap[idx]) * maxElevation;

		// Calculate gradient
		const dhdx = (hR - hL) / (2 * cellSize);
		const dhdz = (hU - hD) / (2 * cellSize);

		// Slope angle in degrees
		const gradient = Math.sqrt(dhdx * dhdx + dhdz * dhdz);
		return Math.atan(gradient) * (180 / Math.PI);
	}

	// Initialize geometry once (lazy initialization)
	function initializeGeometry() {
		if (geometry) return;

		// Create plane geometry - segments are one less than vertices
		geometry = new THREE.PlaneGeometry(
			worldScale,
			worldScale,
			width - 1,
			height - 1
		);

		// Rotate to horizontal (XZ plane with Y up) - only once during init
		geometry.rotateX(-Math.PI / 2);

		// Pre-allocate color attribute
		const vertexCount = width * height;
		const colors = new Float32Array(vertexCount * 3);
		colorAttribute = new THREE.BufferAttribute(colors, 3);
		geometry.setAttribute('color', colorAttribute);
	}

	// Update geometry positions and colors in-place (no recreation)
	function updateGeometry() {
		if (!heightmap || heightmap.length !== width * height) {
			return;
		}

		initializeGeometry();
		if (!geometry || !colorAttribute) return;

		const positions = geometry.attributes.position.array as Float32Array;
		const colors = colorAttribute.array as Float32Array;
		const vertexCount = width * height;

		// PlaneGeometry after rotateX(-PI/2): X stays X, Y becomes -Z, Z becomes Y
		// So we update Y coordinate (which is elevation after rotation)
		for (let i = 0; i < vertexCount; i++) {
			let heightValue = heightmap[i] * maxElevation;

			// Apply landslide deformation
			if (scarpDepth && scarpDepth[i] > 0) {
				heightValue -= scarpDepth[i]; // Subtract erosion
			}
			if (depositionDepth && depositionDepth[i] > 0) {
				heightValue += depositionDepth[i]; // Add deposition
			}

			positions[i * 3 + 1] = heightValue; // Y is up after rotation
		}

		geometry.attributes.position.needsUpdate = true;

		// Calculate soil layer threshold based on soilDepth
		const soilLayerThreshold = maxElevation * (soilDepth / 10);

		// Update vertex colors in-place (using pre-allocated temp colors)
		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const idx = z * width + x;
				const slope = calculateSlope(x, z);
				const heightValue = heightmap[idx] * maxElevation;

				// Get base color from slope into tempColorResult
				getColorForSlopeInto(tempColorResult, slope);

				// Apply soil layer visualization
				if (heightValue < soilLayerThreshold) {
					const bedrockBlend = 1 - (heightValue / soilLayerThreshold);
					lerpColorInto(tempColorA, COLORS_BEDROCK.light, COLORS_BEDROCK.dark, bedrockBlend * 0.5);
					lerpColorInto(tempColorB, tempColorResult, tempColorA, bedrockBlend * 0.7);
					tempColorResult.copy(tempColorB);
				}

				// Apply scarp coloring (exposed failure surface)
				if (scarpDepth && scarpDepth[idx] > 0) {
					const erosionIntensity = Math.min(1, scarpDepth[idx] / 2);
					lerpColorInto(tempColorA, COLORS_SCARP_EXPOSED.subsoil, COLORS_SCARP_EXPOSED.fresh, erosionIntensity);
					lerpColorInto(tempColorB, tempColorResult, tempColorA, erosionIntensity * 0.9);
					tempColorResult.copy(tempColorB);
				}

				// Apply deposition coloring (debris accumulation)
				if (depositionDepth && depositionDepth[idx] > 0.1) {
					const depositionIntensity = Math.min(1, depositionDepth[idx] / 1.5);
					lerpColorInto(tempColorA, tempColorResult, COLORS_DEPOSITION.fresh, depositionIntensity * 0.8);
					tempColorResult.copy(tempColorA);
				}

				// Apply wetness effect in-place
				applyWetnessInPlace(tempColorResult, saturation, porePressureRatio);

				// Add slight noise variation (deterministic based on index)
				const variation = 0.95 + ((idx * 7) % 100) * 0.001;

				colors[idx * 3] = tempColorResult.r * variation;
				colors[idx * 3 + 1] = tempColorResult.g * variation;
				colors[idx * 3 + 2] = tempColorResult.b * variation;
			}
		}

		colorAttribute.needsUpdate = true;

		// Recompute normals after displacement
		geometry.computeVertexNormals();
	}

	// Reactive effect to update geometry when props change
	$effect(() => {
		// Track all dependencies (including version to force updates on in-place array changes)
		const _heightmap = heightmap;
		const _vegCover = vegetationCover;
		const _saturation = saturation;
		const _porePressureRatio = porePressureRatio;
		const _soilDepth = soilDepth;
		const _scarpDepth = scarpDepth;
		const _depositionDepth = depositionDepth;
		const _version = deformationVersion; // Forces update when arrays change in-place

		updateGeometry();
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (geometry) {
			geometry.dispose();
			geometry = null;
		}
		material.dispose();
		colorAttribute = null;
	});

	// Create material
	const material = new THREE.MeshStandardMaterial({
		vertexColors: true,
		side: THREE.DoubleSide,
		flatShading: false,
		roughness: 0.85,
		metalness: 0.0
	});
</script>

{#if geometry}
	<T.Mesh
		{geometry}
		{material}
		position.x={worldScale / 2}
		position.z={worldScale / 2}
		receiveShadow
		castShadow
	/>
{/if}

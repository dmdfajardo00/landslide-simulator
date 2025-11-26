<script lang="ts">
	import { T } from '@threlte/core';
	import * as THREE from 'three';

	interface Props {
		heightmap: Float32Array;
		width?: number;
		height?: number;
		worldScale?: number;
		maxElevation?: number;
	}

	let {
		heightmap,
		width = 128,
		height = 128,
		worldScale = 100,
		maxElevation = 50
	}: Props = $props();

	// Terrain color palette based on slope angle
	const COLORS = {
		grass: new THREE.Color(0x4a7c23),      // Green grass: 0-20°
		grassDry: new THREE.Color(0x6b8e3d),   // Yellow-green: 20-30°
		dirt: new THREE.Color(0x8b7355),       // Brown dirt: 30-45°
		rock: new THREE.Color(0x7a7a7a),       // Gray rock: 45-60°
		scarp: new THREE.Color(0xc9bba8),      // Light exposed: >60°
	};

	// Lerp between two colors
	function lerpColor(c1: THREE.Color, c2: THREE.Color, t: number): THREE.Color {
		return new THREE.Color(
			c1.r + (c2.r - c1.r) * t,
			c1.g + (c2.g - c1.g) * t,
			c1.b + (c2.b - c1.b) * t
		);
	}

	// Get color based on slope angle with smooth transitions
	function getColorForSlope(slopeDegrees: number): THREE.Color {
		if (slopeDegrees < 20) {
			return COLORS.grass;
		} else if (slopeDegrees < 30) {
			const t = (slopeDegrees - 20) / 10;
			return lerpColor(COLORS.grass, COLORS.grassDry, t);
		} else if (slopeDegrees < 45) {
			const t = (slopeDegrees - 30) / 15;
			return lerpColor(COLORS.grassDry, COLORS.dirt, t);
		} else if (slopeDegrees < 60) {
			const t = (slopeDegrees - 45) / 15;
			return lerpColor(COLORS.dirt, COLORS.rock, t);
		} else if (slopeDegrees < 75) {
			const t = (slopeDegrees - 60) / 15;
			return lerpColor(COLORS.rock, COLORS.scarp, t);
		}
		return COLORS.scarp;
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

	// Create the terrain geometry reactively
	let geometry = $derived.by(() => {
		if (!heightmap || heightmap.length !== width * height) {
			return null;
		}

		// Create plane geometry - segments are one less than vertices
		const geo = new THREE.PlaneGeometry(
			worldScale,
			worldScale,
			width - 1,
			height - 1
		);

		// Get position buffer
		const positions = geo.attributes.position.array as Float32Array;
		const vertexCount = width * height;

		// Apply heightmap to Z coordinate (before rotation)
		// PlaneGeometry lays out vertices row by row from -height/2 to +height/2
		for (let i = 0; i < vertexCount; i++) {
			const heightValue = heightmap[i] * maxElevation;
			positions[i * 3 + 2] = heightValue; // Z is up before rotation
		}

		// Rotate to horizontal (XZ plane with Y up)
		geo.rotateX(-Math.PI / 2);

		// Update position attribute
		geo.attributes.position.needsUpdate = true;

		// Generate vertex colors based on slope
		const colors = new Float32Array(vertexCount * 3);

		for (let z = 0; z < height; z++) {
			for (let x = 0; x < width; x++) {
				const idx = z * width + x;
				const slope = calculateSlope(x, z);
				const color = getColorForSlope(slope);

				// Add slight noise variation to colors for natural look
				const variation = 0.95 + Math.random() * 0.1;

				colors[idx * 3] = color.r * variation;
				colors[idx * 3 + 1] = color.g * variation;
				colors[idx * 3 + 2] = color.b * variation;
			}
		}

		geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

		// Recompute normals after displacement
		geo.computeVertexNormals();

		return geo;
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

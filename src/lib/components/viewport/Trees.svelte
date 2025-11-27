<script lang="ts">
	import { T } from '@threlte/core';
	import { onDestroy } from 'svelte';
	import * as THREE from 'three';
	import type { FailureZone } from '$lib/simulation/physics';

	interface Props {
		heightmap: Float32Array;
		width?: number;
		height?: number;
		worldScale?: number;
		maxElevation?: number;
		maxTreeCount?: number;
		maxSlope?: number;
		vegetationCover?: number; // 0-100%
		soilDepth?: number; // For height scaling
		failureZone?: FailureZone | null;
		landslideProgress?: number;
		isLandslideActive?: boolean;
	}

	let {
		heightmap,
		width = 128,
		height = 128,
		worldScale = 100,
		maxElevation = 50,
		maxTreeCount = 150,
		maxSlope = 30,
		vegetationCover = 70,
		soilDepth = 3.0,
		failureZone = null,
		landslideProgress = 0,
		isLandslideActive = false
	}: Props = $props();

	// Pre-create shared geometries (created once, reused)
	const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.25, 2, 6);
	const foliageGeometry = new THREE.ConeGeometry(1.5, 4, 6);

	// Pre-create shared materials (created once, reused)
	const trunkMaterial = new THREE.MeshStandardMaterial({
		color: 0x5a4332,
		roughness: 0.9
	});
	const foliageMaterial = new THREE.MeshStandardMaterial({
		color: 0x4a8b3d,
		roughness: 0.8,
		flatShading: true
	});

	// Stable mesh references - created once with max capacity
	let trunkMesh = $state<THREE.InstancedMesh | null>(null);
	let foliageMesh = $state<THREE.InstancedMesh | null>(null);
	let initialized = false;

	// Pre-allocate reusable objects for matrix calculations
	const tempMatrix = new THREE.Matrix4();
	const tempPosition = new THREE.Vector3();
	const tempQuaternion = new THREE.Quaternion();
	const tempEuler = new THREE.Euler();
	const tempScale = new THREE.Vector3();
	const trunkOffset = new THREE.Matrix4().makeTranslation(0, 1, 0);
	const foliageOffset = new THREE.Matrix4().makeTranslation(0, 3.5, 0);
	const tempColor = new THREE.Color();
	const baseColor = new THREE.Color(0x4a8b3d);

	// Store tree data for position updates
	let treeData: { normX: number; normZ: number; scale: number; rotation: number; tiltRandomX: number; tiltRandomZ: number }[] = [];

	// Calculate tree count from vegetation
	let treeCount = $derived(
		vegetationCover <= 30 ? 0 : Math.floor(((vegetationCover - 30) / 70) * maxTreeCount)
	);

	// Get height at normalized position (accounting for soilDepth scaling)
	function getHeightAt(normX: number, normZ: number): number {
		const x = Math.floor(normX * (width - 1));
		const z = Math.floor(normZ * (height - 1));
		const idx = Math.min(z * width + x, heightmap.length - 1);
		const heightScale = soilDepth / 3.0;
		return heightmap[idx] * maxElevation * heightScale;
	}

	// Calculate slope at position (accounting for soilDepth scaling)
	function getSlopeAt(normX: number, normZ: number): number {
		const cellSize = worldScale / (width - 1);
		const x = Math.floor(normX * (width - 1));
		const z = Math.floor(normZ * (height - 1));
		const idx = z * width + x;
		const heightScale = soilDepth / 3.0;

		const hL = (x > 0 ? heightmap[idx - 1] : heightmap[idx]) * maxElevation * heightScale;
		const hR = (x < width - 1 ? heightmap[idx + 1] : heightmap[idx]) * maxElevation * heightScale;
		const hD = (z > 0 ? heightmap[idx - width] : heightmap[idx]) * maxElevation * heightScale;
		const hU = (z < height - 1 ? heightmap[idx + width] : heightmap[idx]) * maxElevation * heightScale;

		const dhdx = (hR - hL) / (2 * cellSize);
		const dhdz = (hU - hD) / (2 * cellSize);
		const gradient = Math.sqrt(dhdx * dhdx + dhdz * dhdz);
		return Math.atan(gradient) * (180 / Math.PI);
	}

	// Initialize meshes once with max capacity
	function initializeMeshes() {
		if (initialized) return;

		trunkMesh = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, maxTreeCount);
		trunkMesh.count = 0;
		trunkMesh.castShadow = true;
		trunkMesh.receiveShadow = true;

		foliageMesh = new THREE.InstancedMesh(foliageGeometry, foliageMaterial, maxTreeCount);
		foliageMesh.count = 0;
		foliageMesh.castShadow = true;
		foliageMesh.receiveShadow = true;

		initialized = true;
	}

	// Calculate tree tilt based on position in failure zone
	function calculateTreeTilt(worldX: number, worldZ: number, tree: { tiltRandomX: number; tiltRandomZ: number }): { tiltX: number; tiltZ: number; sinkDepth: number } {
		if (!isLandslideActive || !failureZone || landslideProgress <= 0) {
			return { tiltX: 0, tiltZ: 0, sinkDepth: 0 };
		}

		const { startX, endX, headZ, toeZ } = failureZone;

		// Check if tree is within failure zone bounds
		if (worldX < startX || worldX > endX || worldZ < toeZ || worldZ > headZ) {
			return { tiltX: 0, tiltZ: 0, sinkDepth: 0 };
		}

		// Calculate deformation front position (matches landslide.ts line 197)
		const slideLength = headZ - toeZ;
		const deformationFront = headZ - slideLength * landslideProgress;

		// Tree is only affected when deformation front has reached it (matches landslide.ts line 225)
		// worldZ >= deformationFront means deformation has reached this tree
		if (worldZ < deformationFront) {
			return { tiltX: 0, tiltZ: 0, sinkDepth: 0 };
		}

		// Calculate relative position in failure zone
		// relativeZ: 0 = head (top of slope), 1 = toe (bottom of slope)
		const relativeZ = (headZ - worldZ) / slideLength;

		// Calculate how much deformation has progressed past this tree
		// This creates a smooth transition zone as the front passes
		const distancePastFront = worldZ - deformationFront;
		const transitionWidth = slideLength * 0.15; // 15% of slide length for smooth transition
		const deformationReached = Math.min(1, distancePastFront / transitionWidth);

		if (deformationReached <= 0) {
			return { tiltX: 0, tiltZ: 0, sinkDepth: 0 };
		}

		let tiltX = 0;
		let tiltZ = 0;
		let sinkDepth = 0;

		// Use tree's random seed for deterministic but varied tilts
		const tiltVariation = Math.abs(tree.tiltRandomZ) * 3.0; // 0-0.45 -> 0-1.35
		const xVariation = tree.tiltRandomX * 3.0; // -0.45 to 0.45

		// HEAD SCARP ZONE (relativeZ 0-0.15): Trees tilt backward (uphill) dramatically
		if (relativeZ < 0.15) {
			const intensity = (0.15 - relativeZ) / 0.15;
			// Tilt backward (negative Z direction, toward uphill) - VERY dramatic
			const maxTilt = 70 + tiltVariation * 25; // 70-100+ degrees - nearly falling backward
			tiltZ = -intensity * maxTilt * (Math.PI / 180) * deformationReached;
			// Significant random X tilt for chaotic appearance
			tiltX = xVariation * 1.2 * intensity * deformationReached;
		}
		// SLUMP BODY (relativeZ 0.15-0.60): Trees tilt forward (downhill) dramatically
		else if (relativeZ < 0.60) {
			const intensity = 0.8 + (relativeZ - 0.15) * 0.5;
			// Tilt forward (positive Z direction, downhill) - dramatic angles
			const maxTilt = 60 + tiltVariation * 35; // 60-107+ degrees - heavily tilted/fallen
			tiltZ = intensity * maxTilt * (Math.PI / 180) * deformationReached;
			// Strong random X variation in slump body (chaotic tumbling)
			tiltX = xVariation * 1.5 * intensity * deformationReached;
		}
		// TOE ZONE (relativeZ 0.60-1.0): Trees partially buried, heavily tilted
		else if (relativeZ >= 0.60) {
			const intensity = (relativeZ - 0.60) / 0.40;
			// Trees at toe sink deeply into accumulating debris
			sinkDepth = intensity * 4.0 * deformationReached;
			// Significant forward tilt even when buried
			const maxTilt = 50 + tiltVariation * 30; // 50-90+ degrees
			tiltZ = maxTilt * (Math.PI / 180) * deformationReached * (1 - intensity * 0.3);
			tiltX = xVariation * 1.0 * deformationReached;
		}

		// Apply progress-based smoothing (gradual increase)
		const smoothFactor = Math.min(1, deformationReached * 1.5);
		tiltX *= smoothFactor;
		tiltZ *= smoothFactor;
		sinkDepth *= smoothFactor;

		return { tiltX, tiltZ, sinkDepth };
	}

	// Generate tree positions (only when tree count changes)
	function generateTreeData(count: number) {
		treeData = [];
		const margin = 0.08;
		let attempts = 0;
		const maxAttempts = count * 10;

		while (treeData.length < count && attempts < maxAttempts) {
			attempts++;

			const normX = margin + Math.random() * (1 - 2 * margin);
			const normZ = margin + Math.random() * (1 - 2 * margin);

			const slope = getSlopeAt(normX, normZ);
			if (slope > maxSlope) continue;

			treeData.push({
				normX,
				normZ,
				scale: 0.6 + Math.random() * 0.8,
				rotation: Math.random() * Math.PI * 2,
				tiltRandomX: (Math.random() - 0.5) * 0.8, // Larger random variation for dramatic tilt X
				tiltRandomZ: Math.random() * 0.5 + 0.3    // 0.3-0.8 for consistent strong tilt Z direction
			});
		}
	}

	// Update mesh matrices in-place (no object creation)
	function updateMeshes() {
		if (!heightmap || heightmap.length === 0) {
			if (trunkMesh) trunkMesh.count = 0;
			if (foliageMesh) foliageMesh.count = 0;
			return;
		}

		initializeMeshes();
		if (!trunkMesh || !foliageMesh) return;

		// Regenerate positions only if tree count changed
		if (treeData.length !== treeCount) {
			generateTreeData(treeCount);
		}

		const actualCount = treeData.length;
		trunkMesh.count = actualCount;
		foliageMesh.count = actualCount;

		// Update matrices in-place
		for (let i = 0; i < actualCount; i++) {
			const tree = treeData[i];
			const worldX = tree.normX * worldScale;
			const worldZ = tree.normZ * worldScale;
			let worldY = getHeightAt(tree.normX, tree.normZ);

			// Calculate tree tilt and sinking based on landslide
			const { tiltX, tiltZ, sinkDepth } = calculateTreeTilt(worldX, worldZ, tree);

			// Apply sinking (tree base moves down into debris)
			worldY -= sinkDepth;

			// Compose base matrix with tilt (reusing temp objects)
			tempPosition.set(worldX, worldY, worldZ);
			// Apply tilt rotation first (X and Z rotation), then Y rotation (base tree rotation)
			tempEuler.set(tiltX, tree.rotation, tiltZ);
			tempQuaternion.setFromEuler(tempEuler);
			tempScale.set(tree.scale, tree.scale, tree.scale);
			tempMatrix.compose(tempPosition, tempQuaternion, tempScale);

			// Trunk matrix (base + offset)
			tempMatrix.multiply(trunkOffset);
			trunkMesh.setMatrixAt(i, tempMatrix);

			// Foliage matrix (recalculate base + foliage offset)
			tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
			tempMatrix.multiply(foliageOffset);
			foliageMesh.setMatrixAt(i, tempMatrix);

			// Color variation (reuse tempColor)
			const colorVariation = 0.85 + (i % 10) * 0.03; // Deterministic variation
			tempColor.copy(baseColor).multiplyScalar(colorVariation);
			foliageMesh.setColorAt(i, tempColor);
		}

		trunkMesh.instanceMatrix.needsUpdate = true;
		foliageMesh.instanceMatrix.needsUpdate = true;
		if (foliageMesh.instanceColor) foliageMesh.instanceColor.needsUpdate = true;
	}

	// Reactive update when props change
	$effect(() => {
		const _heightmap = heightmap;
		const _treeCount = treeCount;
		const _vegetationCover = vegetationCover;
		const _landslideProgress = landslideProgress;
		const _isLandslideActive = isLandslideActive;
		const _failureZone = failureZone;
		updateMeshes();
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (trunkMesh) {
			trunkMesh.dispose();
			trunkMesh = null;
		}
		if (foliageMesh) {
			foliageMesh.dispose();
			foliageMesh = null;
		}
		trunkGeometry.dispose();
		foliageGeometry.dispose();
		trunkMaterial.dispose();
		foliageMaterial.dispose();
	});
</script>

{#if trunkMesh && trunkMesh.count > 0}
	<T is={trunkMesh} />
{/if}

{#if foliageMesh && foliageMesh.count > 0}
	<T is={foliageMesh} />
{/if}

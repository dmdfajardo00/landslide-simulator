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
		maxTreeCount?: number;
		maxSlope?: number;
		vegetationCover?: number; // 0-100%
	}

	let {
		heightmap,
		width = 128,
		height = 128,
		worldScale = 100,
		maxElevation = 50,
		maxTreeCount = 150,
		maxSlope = 30,
		vegetationCover = 70
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
	let treeData: { normX: number; normZ: number; scale: number; rotation: number }[] = [];

	// Calculate tree count from vegetation
	let treeCount = $derived(
		vegetationCover <= 30 ? 0 : Math.floor(((vegetationCover - 30) / 70) * maxTreeCount)
	);

	// Get height at normalized position
	function getHeightAt(normX: number, normZ: number): number {
		const x = Math.floor(normX * (width - 1));
		const z = Math.floor(normZ * (height - 1));
		const idx = Math.min(z * width + x, heightmap.length - 1);
		return heightmap[idx] * maxElevation;
	}

	// Calculate slope at position
	function getSlopeAt(normX: number, normZ: number): number {
		const cellSize = worldScale / (width - 1);
		const x = Math.floor(normX * (width - 1));
		const z = Math.floor(normZ * (height - 1));
		const idx = z * width + x;

		const hL = (x > 0 ? heightmap[idx - 1] : heightmap[idx]) * maxElevation;
		const hR = (x < width - 1 ? heightmap[idx + 1] : heightmap[idx]) * maxElevation;
		const hD = (z > 0 ? heightmap[idx - width] : heightmap[idx]) * maxElevation;
		const hU = (z < height - 1 ? heightmap[idx + width] : heightmap[idx]) * maxElevation;

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
				rotation: Math.random() * Math.PI * 2
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
			const worldY = getHeightAt(tree.normX, tree.normZ);

			// Compose base matrix (reusing temp objects)
			tempPosition.set(worldX, worldY, worldZ);
			tempEuler.set(0, tree.rotation, 0);
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

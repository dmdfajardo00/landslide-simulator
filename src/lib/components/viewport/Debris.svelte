<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { onDestroy } from 'svelte';
	import * as THREE from 'three';
	import type { DebrisParticle } from '$lib/simulation/physics';
	import type { FailureZone } from '$lib/simulation/physics';

	interface Props {
		isActive?: boolean;
		failureZone?: FailureZone | null;
		heightmap: Float32Array;
		width?: number;
		height?: number;
		worldScale?: number;
		maxElevation?: number;
		progress?: number;
	}

	let {
		isActive = false,
		failureZone = null,
		heightmap,
		width = 128,
		height = 128,
		worldScale = 100,
		maxElevation = 50,
		progress = 0
	}: Props = $props();

	// Physics constants
	const GRAVITY = 30; // World units per second squared
	const FRICTION = 0.6; // Ground friction coefficient
	const RESTITUTION = 0.3; // Bounce factor
	const MAX_PARTICLES = 400; // Realistic amount
	const MAX_BOULDERS = 40; // Occasional large rocks only

	// Debris colors - VISIBLE BROWNS against green terrain
	const ROCK_COLOR = new THREE.Color(0x8b6b4f); // Warm brown - visible
	const SOIL_COLOR = new THREE.Color(0x9a7a5a); // Tan/brown - very visible

	// Boulder color variations - BRIGHT and visible
	const BOULDER_COLORS = [
		new THREE.Color(0x9a8a7a), // Light tan - very visible
		new THREE.Color(0xaa8a5a), // Bright tan/brown - visible against green
		new THREE.Color(0x8a6a4a)  // Medium brown
	];

	// Pre-create shared geometries
	const rockGeometry = new THREE.IcosahedronGeometry(1, 0);
	const soilGeometry = new THREE.SphereGeometry(1, 4, 3);
	const boulderGeometry = new THREE.IcosahedronGeometry(1, 1); // More angular with detail 1

	// Shared materials - with emissive for visibility
	const rockMaterial = new THREE.MeshStandardMaterial({
		color: ROCK_COLOR,
		roughness: 0.8,
		metalness: 0.1,
		flatShading: true,
		emissive: ROCK_COLOR,
		emissiveIntensity: 0.12 // Visible in shadows
	});

	const soilMaterial = new THREE.MeshStandardMaterial({
		color: SOIL_COLOR,
		roughness: 0.9,
		metalness: 0,
		flatShading: true,
		emissive: SOIL_COLOR,
		emissiveIntensity: 0.12 // Visible in shadows
	});

	// Create multiple boulder materials for color variation - VERY VISIBLE
	const boulderMaterials = BOULDER_COLORS.map(color =>
		new THREE.MeshStandardMaterial({
			color,
			roughness: 0.7,
			metalness: 0.1,
			flatShading: true,
			emissive: color,
			emissiveIntensity: 0.15 // Higher emissive for better visibility
		})
	);

	// Stable mesh references
	let rockMesh = $state<THREE.InstancedMesh | null>(null);
	let soilMesh = $state<THREE.InstancedMesh | null>(null);
	// Store boulder meshes for each color variation
	let boulderMeshes = $state<THREE.InstancedMesh[]>([]);

	// Particle pool
	let particles: DebrisParticle[] = [];
	let particleIdCounter = 0;
	let spawnAccumulator = 0;

	// Initialize meshes once
	function initializeMeshes() {
		if (!rockMesh) {
			rockMesh = new THREE.InstancedMesh(rockGeometry, rockMaterial, MAX_PARTICLES);
			rockMesh.count = 0;
			rockMesh.castShadow = true;
			rockMesh.receiveShadow = true;
		}
		if (!soilMesh) {
			soilMesh = new THREE.InstancedMesh(soilGeometry, soilMaterial, MAX_PARTICLES);
			soilMesh.count = 0;
			soilMesh.castShadow = true;
		}
		// Initialize boulder meshes for each color variation
		if (boulderMeshes.length === 0) {
			boulderMeshes = boulderMaterials.map(material => {
				const mesh = new THREE.InstancedMesh(boulderGeometry, material, MAX_BOULDERS);
				mesh.count = 0;
				mesh.castShadow = true;
				mesh.receiveShadow = true;
				mesh.renderOrder = 1; // Render boulders on top for better visibility
				return mesh;
			});
		}
	}

	// Get terrain height at world position
	function getTerrainHeight(worldX: number, worldZ: number): number {
		const gx = Math.floor((worldX / worldScale) * (width - 1));
		const gz = Math.floor((worldZ / worldScale) * (height - 1));

		if (gx < 0 || gx >= width || gz < 0 || gz >= height) {
			return 0;
		}

		const idx = gz * width + gx;
		return heightmap[idx] * maxElevation;
	}

	// Calculate spawn rate based on phase - REALISTIC amounts
	function getSpawnRate(): number {
		if (progress < 0.2) {
			// Initiating phase: sparse initial debris
			return 15;
		} else if (progress < 0.7) {
			// Flowing phase: moderate spawn rate
			const phaseProgress = (progress - 0.2) / 0.5;
			return 40 + phaseProgress * 30; // 40-70 particles/sec
		} else if (progress < 1.0) {
			// Depositing phase: decreasing spawn rate
			const phaseProgress = (progress - 0.7) / 0.3;
			return 30 - phaseProgress * 20; // 30 → 10 particles/sec
		}
		// Complete phase: no spawning
		return 0;
	}

	// Spawn a new particle in the failure zone
	function spawnParticle() {
		if (!failureZone || particles.length >= MAX_PARTICLES) return;

		const { startX, endX, headZ, toeZ, length: slideLength } = failureZone;

		// HEAD is at HIGH Z (top of slope), TOE is at LOW Z (bottom)
		// Spawn progressively from head toward toe as progress increases
		// Progress 0 = spawn at head, progress 1 = spawn near toe
		const spawnProgress = Math.min(progress * 1.5, 0.8);
		const spawnZ = headZ - slideLength * spawnProgress;
		const spawnRange = slideLength * 0.15;

		const x = startX + Math.random() * (endX - startX);
		const z = spawnZ + (Math.random() - 0.5) * spawnRange;
		const y = getTerrainHeight(x, z) + 0.5;

		// Calculate boulder spawn probability - REALISTIC (rare large rocks)
		// Boulders are rare - only 8-12% of debris
		let boulderProbability = 0;
		if (progress >= 0.1 && progress < 0.3) {
			boulderProbability = 0.08;
		} else if (progress >= 0.3 && progress < 0.7) {
			boulderProbability = 0.12; // Peak: 12% boulders
		} else if (progress >= 0.7) {
			boulderProbability = 0.08;
		}

		const rand = Math.random();
		let type: 'rock' | 'soil' | 'boulder';
		let colorVariant: number | undefined;

		// REALISTIC sizes - scaled to terrain
		let baseSize: number;
		if (rand < boulderProbability) {
			// Boulder: occasional larger rocks - 0.8-1.5 units (realistic)
			type = 'boulder';
			baseSize = 0.8 + Math.random() * 0.7;
			colorVariant = Math.floor(Math.random() * BOULDER_COLORS.length);
		} else if (rand < 0.4) {
			// Rock - medium debris - 0.4-0.8 units
			type = 'rock';
			baseSize = 0.4 + Math.random() * 0.4;
		} else {
			// Soil - small debris (majority) - 0.25-0.5 units
			type = 'soil';
			baseSize = 0.25 + Math.random() * 0.25;
		}

		// All particles have good momentum
		const velocityMultiplier = type === 'boulder' ? 1.8 : 1.2;
		const verticalMultiplier = type === 'boulder' ? 2.0 : 1.5;

		particles.push({
			id: particleIdCounter++,
			x,
			y,
			z,
			vx: (Math.random() - 0.5) * 3 * velocityMultiplier,
			vy: Math.random() * 3 * verticalMultiplier,
			vz: -(6 + Math.random() * 6) * velocityMultiplier, // NEGATIVE = downhill (toward low Z)
			size: baseSize, // Start with base size, will grow as it travels
			baseSize,
			spawnZ: z, // Track spawn position for growth calculation
			type,
			grounded: false,
			lifetime: 0,
			colorVariant
		});
	}

	// Update particle physics
	function updateParticle(p: DebrisParticle, delta: number): boolean {
		if (p.grounded) return true; // Keep grounded particles

		p.lifetime += delta;

		// Size-based physics parameters
		const isBoulder = p.type === 'boulder';
		const inertiaMultiplier = isBoulder ? 0.65 : 1.0; // Boulders accelerate slower (more mass)
		const restitution = isBoulder ? RESTITUTION * 0.7 : RESTITUTION; // Boulders bounce slightly more
		// Boulders have MUCH lower friction - they roll farther
		const effectiveFriction = isBoulder
			? FRICTION / (p.size * 3.0) // Boulders roll much further
			: FRICTION / (p.size * 1.5); // Normal friction for smaller particles

		// Apply gravity (with inertia for larger particles)
		p.vy -= GRAVITY * delta * inertiaMultiplier;

		// Update position
		p.x += p.vx * delta;
		p.y += p.vy * delta;
		p.z += p.vz * delta;

		// GROW particle as it travels downhill (accumulating debris effect)
		// Particles grow exponentially as they move from spawnZ toward toe
		if (failureZone && !p.grounded) {
			const travelDistance = p.spawnZ - p.z; // Positive when moving downhill (toward low Z)
			const maxTravelDistance = failureZone.headZ - failureZone.toeZ;

			if (travelDistance > 0 && maxTravelDistance > 0) {
				// Normalize travel progress (0 = just spawned, 1 = reached toe)
				const travelProgress = Math.min(1, travelDistance / maxTravelDistance);

				// EXPONENTIAL growth: particles grow 2-4x their base size as they travel
				// Growth is more dramatic for smaller particles (soil/rock accumulate more)
				const growthExponent = isBoulder ? 1.5 : 2.2;
				const maxGrowthMultiplier = isBoulder ? 2.0 : 3.5;
				const growthMultiplier = 1 + (maxGrowthMultiplier - 1) * Math.pow(travelProgress, growthExponent);

				p.size = p.baseSize * growthMultiplier;
			}
		}

		// Get terrain height at new position
		const terrainHeight = getTerrainHeight(p.x, p.z);

		// Terrain collision
		if (p.y - p.size <= terrainHeight) {
			p.y = terrainHeight + p.size;

			// Check if in toe zone (slow down and stop)
			// Toe is at LOW Z, so check if z <= toeZ + some margin
			const inToeZone = failureZone && p.z <= failureZone.toeZ * 1.2;

			if (inToeZone || Math.abs(p.vy) < 1) {
				// Stop particle
				p.grounded = true;
				p.vx = 0;
				p.vy = 0;
				p.vz = 0;
			} else {
				// Bounce with size-based restitution
				p.vy = Math.abs(p.vy) * restitution;

				// Apply size-based friction to horizontal velocity
				const speed = Math.sqrt(p.vx * p.vx + p.vz * p.vz);
				if (speed > 0.1) {
					const friction = Math.min(1, effectiveFriction * delta * 10);
					p.vx *= (1 - friction);
					p.vz *= (1 - friction);
				}
			}
		}

		// Remove particles that fall off the world or are very old
		if (p.y < -10 || p.lifetime > 30) {
			return false;
		}

		return true;
	}

	// Update mesh matrices
	function updateMeshes() {
		if (!rockMesh || !soilMesh || boulderMeshes.length === 0) return;

		const rockParticles = particles.filter(p => p.type === 'rock');
		const soilParticles = particles.filter(p => p.type === 'soil');
		const boulderParticles = particles.filter(p => p.type === 'boulder');

		const matrix = new THREE.Matrix4();
		const position = new THREE.Vector3();
		const quaternion = new THREE.Quaternion();
		const scale = new THREE.Vector3();
		const euler = new THREE.Euler();

		// Update rock instances
		const rockCount = Math.min(rockParticles.length, MAX_PARTICLES);
		rockMesh.count = rockCount;

		for (let i = 0; i < rockCount; i++) {
			const p = rockParticles[i];
			position.set(p.x, p.y, p.z);
			euler.set(p.lifetime * 2 + p.id * 0.1, p.lifetime * 1.5 + p.id * 0.2, p.lifetime + p.id * 0.15);
			quaternion.setFromEuler(euler);
			scale.set(p.size, p.size * 0.8, p.size * 0.9);
			matrix.compose(position, quaternion, scale);
			rockMesh.setMatrixAt(i, matrix);
		}
		rockMesh.instanceMatrix.needsUpdate = true;

		// Update soil instances
		const soilCount = Math.min(soilParticles.length, MAX_PARTICLES);
		soilMesh.count = soilCount;

		for (let i = 0; i < soilCount; i++) {
			const p = soilParticles[i];
			position.set(p.x, p.y, p.z);
			euler.set(p.id * 0.5, p.id * 0.3, p.id * 0.7);
			quaternion.setFromEuler(euler);
			scale.set(p.size, p.size * 0.6, p.size * 0.8);
			matrix.compose(position, quaternion, scale);
			soilMesh.setMatrixAt(i, matrix);
		}
		soilMesh.instanceMatrix.needsUpdate = true;

		// Update boulder instances - organize by color variant
		// Group boulders by color variant
		const bouldersByColor: DebrisParticle[][] = [[], [], []];
		for (const p of boulderParticles) {
			const colorIdx = p.colorVariant ?? 0;
			bouldersByColor[colorIdx].push(p);
		}

		// Update each boulder mesh with its color group
		for (let colorIdx = 0; colorIdx < boulderMeshes.length; colorIdx++) {
			const mesh = boulderMeshes[colorIdx];
			const colorGroup = bouldersByColor[colorIdx];
			const count = Math.min(colorGroup.length, MAX_BOULDERS);
			mesh.count = count;

			for (let i = 0; i < count; i++) {
				const p = colorGroup[i];
				position.set(p.x, p.y, p.z);

				// MORE DRAMATIC tumbling for boulders - faster rotation to show movement
				// Calculate angular velocity based on horizontal speed for realism
				const horizontalSpeed = Math.sqrt(p.vx * p.vx + p.vz * p.vz);
				const rotationSpeed = p.grounded ? 0.2 : 1.0 + horizontalSpeed * 0.3;

				euler.set(
					p.lifetime * 1.5 * rotationSpeed + p.id * 0.15,
					p.lifetime * 1.2 * rotationSpeed + p.id * 0.18,
					p.lifetime * 1.0 * rotationSpeed + p.id * 0.12
				);
				quaternion.setFromEuler(euler);

				// Slight size variation over lifetime (minimal shrinking)
				const sizeMultiplier = 1.0 - p.lifetime * 0.005;
				const effectiveSize = p.size * Math.max(0.9, sizeMultiplier);
				// Irregular boulder shape (not perfectly spherical)
				scale.set(effectiveSize * 1.15, effectiveSize * 0.92, effectiveSize * 1.05);
				matrix.compose(position, quaternion, scale);
				mesh.setMatrixAt(i, matrix);
			}
			mesh.instanceMatrix.needsUpdate = true;
		}
	}

	// Animation loop
	useTask((delta) => {
		if (!isActive || !failureZone) {
			// Clear particles when not active
			if (particles.length > 0) {
				particles = [];
				if (rockMesh) rockMesh.count = 0;
				if (soilMesh) soilMesh.count = 0;
				for (const mesh of boulderMeshes) {
					mesh.count = 0;
				}
			}
			return;
		}

		initializeMeshes();

		// Spawn new particles with phase-based spawn rate
		const currentSpawnRate = getSpawnRate();
		if (currentSpawnRate > 0) {
			spawnAccumulator += delta * currentSpawnRate;
			while (spawnAccumulator >= 1 && particles.length < MAX_PARTICLES) {
				spawnParticle();
				spawnAccumulator -= 1;
			}
		}

		// Update existing particles
		particles = particles.filter(p => updateParticle(p, delta));

		// Update meshes
		updateMeshes();
	});

	// Reset when isActive changes to false - clear ALL debris
	$effect(() => {
		if (!isActive) {
			particles = [];
			spawnAccumulator = 0;
			particleIdCounter = 0;
			// Also clear mesh counts immediately
			if (rockMesh) rockMesh.count = 0;
			if (soilMesh) soilMesh.count = 0;
			for (const mesh of boulderMeshes) {
				if (mesh) mesh.count = 0;
			}
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (rockMesh) {
			rockMesh.dispose();
			rockMesh = null;
		}
		if (soilMesh) {
			soilMesh.dispose();
			soilMesh = null;
		}
		for (const mesh of boulderMeshes) {
			mesh.dispose();
		}
		boulderMeshes = [];

		rockGeometry.dispose();
		soilGeometry.dispose();
		boulderGeometry.dispose();
		rockMaterial.dispose();
		soilMaterial.dispose();
		for (const material of boulderMaterials) {
			material.dispose();
		}
		particles = [];
	});
</script>

<!-- Rock debris -->
{#if rockMesh && rockMesh.count > 0}
	<T is={rockMesh} />
{/if}

<!-- Soil debris -->
{#if soilMesh && soilMesh.count > 0}
	<T is={soilMesh} />
{/if}

<!-- Boulder debris (multiple color variants) -->
{#each boulderMeshes as boulderMesh}
	{#if boulderMesh && boulderMesh.count > 0}
		<T is={boulderMesh} />
	{/if}
{/each}

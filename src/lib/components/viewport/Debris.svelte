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
	const MAX_PARTICLES = 700;
	const SPAWN_RATE = 120; // Particles per second during active phase

	// Debris colors
	const ROCK_COLOR = new THREE.Color(0x6b5b4f);
	const SOIL_COLOR = new THREE.Color(0x5c4a3a);

	// Pre-create shared geometries
	const rockGeometry = new THREE.IcosahedronGeometry(1, 0);
	const soilGeometry = new THREE.SphereGeometry(1, 4, 3);

	// Shared materials
	const rockMaterial = new THREE.MeshStandardMaterial({
		color: ROCK_COLOR,
		roughness: 0.9,
		metalness: 0.1,
		flatShading: true
	});

	const soilMaterial = new THREE.MeshStandardMaterial({
		color: SOIL_COLOR,
		roughness: 1.0,
		metalness: 0,
		flatShading: true
	});

	// Stable mesh references
	let rockMesh = $state<THREE.InstancedMesh | null>(null);
	let soilMesh = $state<THREE.InstancedMesh | null>(null);

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

		const type = Math.random() > 0.6 ? 'rock' : 'soil';
		const size = type === 'rock' ? 0.3 + Math.random() * 0.4 : 0.2 + Math.random() * 0.3;

		particles.push({
			id: particleIdCounter++,
			x,
			y,
			z,
			vx: (Math.random() - 0.5) * 2,
			vy: Math.random() * 2,
			vz: -(5 + Math.random() * 5), // NEGATIVE = downhill (toward low Z)
			size,
			type,
			grounded: false,
			lifetime: 0
		});
	}

	// Update particle physics
	function updateParticle(p: DebrisParticle, delta: number): boolean {
		if (p.grounded) return true; // Keep grounded particles

		p.lifetime += delta;

		// Apply gravity
		p.vy -= GRAVITY * delta;

		// Update position
		p.x += p.vx * delta;
		p.y += p.vy * delta;
		p.z += p.vz * delta;

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
				// Bounce with restitution
				p.vy = Math.abs(p.vy) * RESTITUTION;

				// Apply friction to horizontal velocity
				const speed = Math.sqrt(p.vx * p.vx + p.vz * p.vz);
				if (speed > 0.1) {
					const friction = Math.min(1, FRICTION * delta * 10);
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
		if (!rockMesh || !soilMesh) return;

		const rockParticles = particles.filter(p => p.type === 'rock');
		const soilParticles = particles.filter(p => p.type === 'soil');

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
	}

	// Animation loop
	useTask((delta) => {
		if (!isActive || !failureZone) {
			// Clear particles when not active
			if (particles.length > 0) {
				particles = [];
				if (rockMesh) rockMesh.count = 0;
				if (soilMesh) soilMesh.count = 0;
			}
			return;
		}

		initializeMeshes();

		// Spawn new particles during active phase
		if (progress > 0.1 && progress < 0.9) {
			spawnAccumulator += delta * SPAWN_RATE;
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

	// Reset when isActive changes to false
	$effect(() => {
		if (!isActive) {
			particles = [];
			spawnAccumulator = 0;
			particleIdCounter = 0;
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
		rockGeometry.dispose();
		soilGeometry.dispose();
		rockMaterial.dispose();
		soilMaterial.dispose();
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

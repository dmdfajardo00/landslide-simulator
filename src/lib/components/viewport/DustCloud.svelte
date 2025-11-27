<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { onDestroy } from 'svelte';
	import * as THREE from 'three';
	import type { FailureZone } from '$lib/simulation/physics';

	interface DustParticle {
		id: number;
		x: number;
		y: number;
		z: number;
		vx: number;
		vy: number;
		vz: number;
		size: number;
		opacity: number;
		lifetime: number;
		maxLifetime: number;
	}

	interface Props {
		isActive?: boolean;
		failureZone?: FailureZone | null;
		progress?: number;
		worldScale?: number;
		maxElevation?: number;
	}

	let {
		isActive = false,
		failureZone = null,
		progress = 0,
		worldScale = 100,
		maxElevation = 50
	}: Props = $props();

	// Dust configuration
	const MAX_PARTICLES = 600;
	const SPAWN_RATE = 80; // Particles per second during flowing phase
	const DUST_COLOR = new THREE.Color(0xc4a882); // Tan/brown dusty color
	const RISE_SPEED = 3.0; // Base upward velocity
	const DRIFT_SPEED = 1.5; // Horizontal drift variation
	const FADE_DURATION = 3.0; // Seconds for particle to fade out

	// Particle pool
	let particles: DustParticle[] = [];
	let particleIdCounter = 0;
	let spawnAccumulator = 0;

	// Stable mesh references
	let pointsGeometry = $state<THREE.BufferGeometry | null>(null);
	let pointsMaterial = $state<THREE.PointsMaterial | null>(null);
	let pointsMesh = $state<THREE.Points | null>(null);
	let initialized = $state(false);

	// Sprite texture for soft circular particles
	function createDustTexture(): THREE.Texture {
		const canvas = document.createElement('canvas');
		const size = 64;
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d')!;

		// Radial gradient for soft sphere effect
		const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
		gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
		gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
		gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)');
		gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, size, size);

		const texture = new THREE.Texture(canvas);
		texture.needsUpdate = true;
		return texture;
	}

	// Initialize particle system once
	function initialize() {
		if (initialized) return;

		pointsGeometry = new THREE.BufferGeometry();
		const positions = new Float32Array(MAX_PARTICLES * 3);
		const sizes = new Float32Array(MAX_PARTICLES);
		const opacities = new Float32Array(MAX_PARTICLES);

		pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		pointsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
		pointsGeometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

		const dustTexture = createDustTexture();
		pointsMaterial = new THREE.PointsMaterial({
			color: DUST_COLOR,
			size: 2.0,
			transparent: true,
			opacity: 0.4,
			map: dustTexture,
			blending: THREE.NormalBlending,
			depthWrite: false,
			sizeAttenuation: true,
			vertexColors: false
		});

		pointsMesh = new THREE.Points(pointsGeometry, pointsMaterial);
		pointsMesh.frustumCulled = false;

		initialized = true;
	}

	// Spawn a new dust particle in the active deformation zone
	function spawnParticle() {
		if (!failureZone || particles.length >= MAX_PARTICLES) return;

		const { startX, endX, headZ, length: slideLength } = failureZone;

		// Spawn dust at the deformation front (where terrain is actively changing)
		// More dust during flowing phase (progress 0.2-0.7)
		const deformationFront = headZ - slideLength * progress;
		const spawnRange = slideLength * 0.2;

		// Bias spawn toward deformation front (more dust where terrain is actively breaking)
		const frontBias = Math.random() * Math.random(); // Skew toward 0
		const x = startX + Math.random() * (endX - startX);
		const z = deformationFront + (Math.random() - 0.5 - frontBias * 0.5) * spawnRange;
		const y = maxElevation * 0.3 + Math.random() * maxElevation * 0.2; // Spawn at mid-height

		// Random upward and drift velocities
		const vy = RISE_SPEED + Math.random() * 2.0;
		const vx = (Math.random() - 0.5) * DRIFT_SPEED;
		const vz = (Math.random() - 0.5) * DRIFT_SPEED * 0.5; // Less Z drift

		const size = 1.5 + Math.random() * 2.0; // Larger, softer particles
		const maxLifetime = FADE_DURATION + Math.random() * 1.5;

		particles.push({
			id: particleIdCounter++,
			x,
			y,
			z,
			vx,
			vy,
			vz,
			size,
			opacity: 0.6 + Math.random() * 0.4,
			lifetime: 0,
			maxLifetime
		});
	}

	// Update particle physics
	function updateParticle(p: DustParticle, delta: number): boolean {
		p.lifetime += delta;

		// Fade out over time
		const fadeProgress = p.lifetime / p.maxLifetime;
		if (fadeProgress >= 1.0) return false;

		// Update position
		p.x += p.vx * delta;
		p.y += p.vy * delta;
		p.z += p.vz * delta;

		// Reduce opacity and size as particle ages (fade out)
		const fadeOutCurve = 1 - Math.pow(fadeProgress, 1.5);
		p.opacity = (0.6 + Math.random() * 0.2) * fadeOutCurve;
		p.size = (1.5 + Math.random() * 2.0) * (0.8 + fadeOutCurve * 0.2);

		// Slow down upward velocity over time (particles decelerate)
		p.vy *= 0.98;

		// Remove if faded out or too high
		if (p.opacity <= 0.01 || p.y > maxElevation * 2) {
			return false;
		}

		return true;
	}

	// Update geometry buffers
	function updateGeometry() {
		if (!pointsGeometry || !pointsMaterial) return;

		const positions = pointsGeometry.attributes.position.array as Float32Array;
		const sizes = pointsGeometry.attributes.size.array as Float32Array;
		const opacities = pointsGeometry.attributes.opacity?.array as Float32Array;

		const count = Math.min(particles.length, MAX_PARTICLES);

		for (let i = 0; i < count; i++) {
			const p = particles[i];
			positions[i * 3] = p.x;
			positions[i * 3 + 1] = p.y;
			positions[i * 3 + 2] = p.z;
			sizes[i] = p.size;
			if (opacities) opacities[i] = p.opacity;
		}

		// Update material opacity based on average particle opacity
		const avgOpacity = count > 0
			? particles.slice(0, count).reduce((sum, p) => sum + p.opacity, 0) / count
			: 0;
		pointsMaterial.opacity = Math.min(0.5, avgOpacity * 0.6);

		pointsGeometry.setDrawRange(0, count);
		pointsGeometry.attributes.position.needsUpdate = true;
		pointsGeometry.attributes.size.needsUpdate = true;
		if (opacities) pointsGeometry.attributes.opacity.needsUpdate = true;
	}

	// Animation loop
	useTask((delta) => {
		if (!isActive || !failureZone) {
			// Clear particles when not active
			if (particles.length > 0) {
				particles = [];
				if (pointsGeometry) pointsGeometry.setDrawRange(0, 0);
			}
			return;
		}

		initialize();

		// Spawn dust during flowing phase (progress 0.2-0.7)
		// More dust at deformation front
		if (progress >= 0.2 && progress <= 0.7) {
			const flowingIntensity = Math.sin((progress - 0.2) / 0.5 * Math.PI); // Peak at 0.45
			const spawnRate = SPAWN_RATE * flowingIntensity;

			spawnAccumulator += delta * spawnRate;
			while (spawnAccumulator >= 1 && particles.length < MAX_PARTICLES) {
				spawnParticle();
				spawnAccumulator -= 1;
			}
		}

		// Update existing particles
		particles = particles.filter(p => updateParticle(p, delta));

		// Update geometry
		updateGeometry();
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
		if (pointsGeometry) {
			pointsGeometry.dispose();
			pointsGeometry = null;
		}
		if (pointsMaterial) {
			if (pointsMaterial.map) pointsMaterial.map.dispose();
			pointsMaterial.dispose();
			pointsMaterial = null;
		}
		pointsMesh = null;
		particles = [];
	});
</script>

{#if initialized && pointsMesh && particles.length > 0}
	<T is={pointsMesh} />
{/if}

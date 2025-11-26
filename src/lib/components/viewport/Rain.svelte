<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import { onDestroy } from 'svelte';
	import * as THREE from 'three';

	interface Props {
		isRaining?: boolean;
		intensity?: number;
		worldScale?: number;
		maxElevation?: number;
	}

	let {
		isRaining = false,
		intensity = 25,
		worldScale = 100,
		maxElevation = 50
	}: Props = $props();

	// Rain configuration - fixed allocation for max capacity
	const BASE_DROP_COUNT = 1500;
	const MAX_DROP_COUNT = 6000;

	// Derived values (no object creation, just numbers)
	let dropCount = $derived(Math.floor(BASE_DROP_COUNT + (intensity / 100) * (MAX_DROP_COUNT - BASE_DROP_COUNT)));
	let fallSpeed = $derived(40 + (intensity / 100) * 50);
	let streakLength = $derived(1.5 + (intensity / 100) * 2.5);

	// Rain bounds
	const rainHeight = 80;
	const rainSpread = worldScale * 1.2;

	// Stable references - created once, never recreated
	// Using $state for template reactivity on first initialization
	let rainGeometry = $state<THREE.BufferGeometry | null>(null);
	let rainMaterial = $state<THREE.LineBasicMaterial | null>(null);
	let positions: Float32Array | null = null;
	let velocities: Float32Array | null = null;
	let initialized = $state(false);

	// Initialize geometry and material once
	function initialize() {
		if (initialized) return;

		// Pre-allocate for maximum capacity
		rainGeometry = new THREE.BufferGeometry();
		positions = new Float32Array(MAX_DROP_COUNT * 6);
		velocities = new Float32Array(MAX_DROP_COUNT);

		// Initialize all drops (even unused ones)
		for (let i = 0; i < MAX_DROP_COUNT; i++) {
			const x = (Math.random() - 0.5) * rainSpread + worldScale / 2;
			const y = Math.random() * rainHeight + maxElevation;
			const z = (Math.random() - 0.5) * rainSpread + worldScale / 2;
			const streak = 2.5; // Default streak length

			positions[i * 6] = x;
			positions[i * 6 + 1] = y;
			positions[i * 6 + 2] = z;
			positions[i * 6 + 3] = x;
			positions[i * 6 + 4] = y - streak;
			positions[i * 6 + 5] = z;

			velocities[i] = 0.85 + Math.random() * 0.3;
		}

		rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		rainGeometry.setDrawRange(0, dropCount * 2); // 2 vertices per drop

		// Create material once
		rainMaterial = new THREE.LineBasicMaterial({
			color: 0x8ab4f8,
			transparent: true,
			opacity: 0.5,
			linewidth: 1,
			blending: THREE.NormalBlending
		});

		initialized = true;
	}

	// Animation loop - updates positions in-place
	useTask((delta) => {
		if (!isRaining) {
			if (rainGeometry) rainGeometry.setDrawRange(0, 0);
			return;
		}

		initialize();
		if (!rainGeometry || !rainMaterial || !positions || !velocities) return;

		// Update draw range based on current intensity
		rainGeometry.setDrawRange(0, dropCount * 2);

		// Update material opacity based on intensity
		rainMaterial.opacity = 0.3 + (intensity / 100) * 0.4;

		const groundLevel = -5;
		const currentStreakLength = streakLength;
		const currentFallSpeed = fallSpeed;

		// Only animate visible drops
		for (let i = 0; i < dropCount; i++) {
			const idx = i * 6;
			const speed = currentFallSpeed * velocities[i] * delta;

			// Move both top and bottom of streak down
			positions[idx + 1] -= speed;
			positions[idx + 4] -= speed;

			// Slight wind drift
			const windDrift = (Math.random() - 0.5) * 0.1 * delta * (intensity / 50);
			positions[idx] += windDrift;
			positions[idx + 3] += windDrift;

			// Reset when bottom hits ground
			if (positions[idx + 4] < groundLevel) {
				const newX = (Math.random() - 0.5) * rainSpread + worldScale / 2;
				const newY = rainHeight + maxElevation + Math.random() * 20;
				const newZ = (Math.random() - 0.5) * rainSpread + worldScale / 2;

				positions[idx] = newX;
				positions[idx + 1] = newY;
				positions[idx + 2] = newZ;
				positions[idx + 3] = newX;
				positions[idx + 4] = newY - currentStreakLength;
				positions[idx + 5] = newZ;
			}
		}

		rainGeometry.attributes.position.needsUpdate = true;
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (rainGeometry) {
			rainGeometry.dispose();
			rainGeometry = null;
		}
		if (rainMaterial) {
			rainMaterial.dispose();
			rainMaterial = null;
		}
		positions = null;
		velocities = null;
	});
</script>

{#if isRaining && initialized && rainGeometry && rainMaterial}
	<T.LineSegments geometry={rainGeometry} material={rainMaterial} />
{/if}

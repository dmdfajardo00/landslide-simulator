<script lang="ts">
	import Icon from '@iconify/svelte';

	interface Props {
		isRaining?: boolean;
	}

	let { isRaining = false }: Props = $props();
</script>

<main class="flex-1 bg-gradient-to-br from-neutral-100 to-neutral-200 relative flex items-center justify-center overflow-hidden">
	<!-- Rain overlay effect -->
	{#if isRaining}
		<div class="absolute inset-0 pointer-events-none z-20 overflow-hidden">
			{#each Array(50) as _, i}
				<div
					class="absolute w-0.5 bg-gradient-to-b from-transparent via-blue-400/30 to-blue-400/10 animate-rain"
					style="
						left: {Math.random() * 100}%;
						height: {20 + Math.random() * 30}px;
						animation-delay: {Math.random() * 2}s;
						animation-duration: {0.5 + Math.random() * 0.5}s;
					"
				></div>
			{/each}
		</div>
		<div class="absolute inset-0 bg-blue-900/5 pointer-events-none z-10"></div>
	{/if}

	<!-- Placeholder with topographic pattern background -->
	<div class="absolute inset-0 opacity-10">
		<svg class="w-full h-full" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<pattern id="topo" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
					<path d="M0,50 Q25,40 50,50 T100,50" stroke="#1e40af" fill="none" stroke-width="1"/>
					<path d="M0,60 Q25,50 50,60 T100,60" stroke="#06b6d4" fill="none" stroke-width="1"/>
					<path d="M0,70 Q25,60 50,70 T100,70" stroke="#10b981" fill="none" stroke-width="1"/>
					<path d="M0,80 Q25,70 50,80 T100,80" stroke="#84cc16" fill="none" stroke-width="1"/>
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#topo)"/>
		</svg>
	</div>

	<!-- Placeholder Content -->
	<div class="text-center z-10">
		<div class="mb-6">
			<Icon
				icon={isRaining ? "fluent:weather-rain-24-filled" : "fluent:mountain-location-24-regular"}
				class="w-24 h-24 mx-auto {isRaining ? 'text-blue-400' : 'text-neutral-400'}"
			/>
		</div>
		<h2 class="text-3xl font-bold text-neutral-700 mb-2">
			{isRaining ? 'Rain Active' : '3D Terrain Viewport'}
		</h2>
		<p class="text-neutral-500 mb-8 max-w-md mx-auto">
			{isRaining
				? 'Rainfall simulation in progress. Soil moisture increasing...'
				: 'Threlte canvas with topographical visualization and particle physics will render here'}
		</p>

		<div class="bg-white/80 backdrop-blur-sm border border-neutral-300 rounded-xl p-6 max-w-sm mx-auto">
			<p class="text-sm text-neutral-600 mb-4">Canvas features coming soon:</p>
			<ul class="text-xs text-left space-y-2 text-neutral-600">
				<li class="flex items-center gap-2">
					<Icon icon="fluent:checkmark-circle-24-filled" class="w-4 h-4 text-green-500"/>
					3D terrain with contour lines
				</li>
				<li class="flex items-center gap-2">
					<Icon icon="fluent:checkmark-circle-24-filled" class="w-4 h-4 text-green-500"/>
					Rain particle systems
				</li>
				<li class="flex items-center gap-2">
					<Icon icon="fluent:checkmark-circle-24-filled" class="w-4 h-4 text-green-500"/>
					Soil & debris physics
				</li>
				<li class="flex items-center gap-2">
					<Icon icon="fluent:checkmark-circle-24-filled" class="w-4 h-4 text-green-500"/>
					Vegetation rendering
				</li>
			</ul>
		</div>
	</div>
</main>

<style>
	@keyframes rain {
		0% {
			transform: translateY(-100%);
			opacity: 0;
		}
		10% {
			opacity: 1;
		}
		90% {
			opacity: 1;
		}
		100% {
			transform: translateY(100vh);
			opacity: 0;
		}
	}

	.animate-rain {
		animation: rain linear infinite;
	}
</style>


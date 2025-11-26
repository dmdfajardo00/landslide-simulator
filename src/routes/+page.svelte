<script lang="ts">
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import ViewportPlaceholder from '$lib/components/layout/ViewportPlaceholder.svelte';
	import MetricsPanel from '$lib/components/layout/MetricsPanel.svelte';
	import ActionButtons from '$lib/components/controls/ActionButtons.svelte';

	// Simulation state
	let isRaining = $state(false);
	let isTriggered = $state(false);
	let elapsedTime = $state(0);
	let rainfallAccumulated = $state(0);

	// Metrics state (will be calculated based on simulation)
	let fos = $state(1.468);
	let pof = $state(1.68);
	let ru = $state(0.316);
	let cohesion = $state(14.7);
	let displacedParticles = $state(0);

	// Simulation interval
	let simulationInterval: ReturnType<typeof setInterval> | null = null;

	function startSimulation() {
		if (simulationInterval) return;

		simulationInterval = setInterval(() => {
			elapsedTime += 1;

			if (isRaining) {
				rainfallAccumulated += 0.5;
				// Gradually increase pore pressure and decrease FoS when raining
				ru = Math.min(0.8, ru + 0.002);
				fos = Math.max(0.8, fos - 0.003);
				pof = Math.min(95, pof + 0.05);
				cohesion = Math.max(5, cohesion - 0.02);
			}

			if (isTriggered) {
				// Rapid changes when landslide is triggered
				displacedParticles += Math.floor(Math.random() * 50) + 10;
				fos = Math.max(0.5, fos - 0.01);
				pof = Math.min(99, pof + 0.2);
			}
		}, 100);
	}

	function stopSimulation() {
		if (simulationInterval) {
			clearInterval(simulationInterval);
			simulationInterval = null;
		}
	}

	function handleToggleRain() {
		if (isRaining && !isTriggered) {
			// Only start simulation when rain starts
			startSimulation();
		}
	}

	function handleTrigger() {
		isTriggered = true;
		startSimulation();
	}

	function handleReset() {
		stopSimulation();
		isRaining = false;
		isTriggered = false;
		elapsedTime = 0;
		rainfallAccumulated = 0;
		fos = 1.468;
		pof = 1.68;
		ru = 0.316;
		cohesion = 14.7;
		displacedParticles = 0;
	}

	// Start/stop simulation based on rain state
	$effect(() => {
		if (isRaining || isTriggered) {
			startSimulation();
		} else if (!isRaining && !isTriggered) {
			stopSimulation();
		}
	});
</script>

<div class="flex h-screen bg-white relative">
	<!-- Left Sidebar - Full Height -->
	<Sidebar />

	<!-- Main Content Area -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Center Viewport -->
		<ViewportPlaceholder {isRaining} />

		<!-- Right Metrics Panel -->
		<MetricsPanel {fos} {pof} {ru} {cohesion} {displacedParticles} />
	</div>

	<!-- Fixed Bottom Left Action Buttons -->
	<div class="fixed bottom-0 left-0 w-80 p-4 bg-white border-t border-r border-neutral-200 z-10">
		<ActionButtons
			bind:isRaining
			{isTriggered}
			onToggleRain={handleToggleRain}
			onTrigger={handleTrigger}
			onReset={handleReset}
		/>
	</div>
</div>

<script lang="ts">
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';

	let { isRaining = $bindable(false) }: { isRaining?: boolean } = $props();

	function toggleRain() {
		isRaining = !isRaining;
	}

	function triggerLandslide() {
		alert('Landslide triggered!');
	}

	function resetSimulation() {
		isRaining = false;
		alert('Simulation reset!');
	}
</script>

<div class="space-y-3">
	<Button
		onclick={toggleRain}
		class="w-full {isRaining
			? 'bg-neutral-600 hover:bg-neutral-700'
			: 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'} text-white"
	>
		<Icon
			icon="fluent:weather-rain-20-filled"
			class="w-5 h-5 mr-2"
		/>
		{isRaining ? 'Stop Rain' : 'Start Rain'}
	</Button>

	<Button
		onclick={triggerLandslide}
		class="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
	>
		<Icon icon="fluent:warning-24-filled" class="w-5 h-5 mr-2" />
		Trigger Landslide
	</Button>

	<Button onclick={resetSimulation} variant="outline" class="w-full">
		<Icon icon="fluent:arrow-reset-24-regular" class="w-5 h-5 mr-2" />
		Reset
	</Button>
</div>

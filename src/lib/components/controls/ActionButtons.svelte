<script lang="ts">
	import Icon from '@iconify/svelte';

	interface Props {
		isRaining?: boolean;
		isTriggered?: boolean;
		onToggleRain?: () => void;
		onTrigger?: () => void;
		onReset?: () => void;
		showMapLink?: boolean;
	}

	let {
		isRaining = $bindable(false),
		isTriggered = false,
		onToggleRain,
		onTrigger,
		onReset,
		showMapLink = true
	}: Props = $props();

	function handleToggleRain() {
		isRaining = !isRaining;
		onToggleRain?.();
	}

	function handleTrigger() {
		onTrigger?.();
	}

	function handleReset() {
		isRaining = false;
		onReset?.();
	}
</script>

<div class="space-y-2">
	<div class="flex gap-2 flex-wrap">
		<button
			onclick={handleToggleRain}
			class="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors {isRaining
				? 'bg-neutral-600 text-white hover:bg-neutral-500'
				: 'bg-neutral-900 text-white hover:bg-neutral-800'}"
		>
			<Icon icon={isRaining ? "fluent:weather-rain-20-filled" : "fluent:weather-rain-20-regular"} class="w-4 h-4" />
			{isRaining ? 'Stop Rain' : 'Start Rain'}
		</button>

		<button
			onclick={handleTrigger}
			disabled={isTriggered}
			class="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors
				{isTriggered
					? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
					: 'bg-stone-600 text-white hover:bg-stone-500'}"
		>
			<Icon icon="fluent:warning-24-filled" class="w-4 h-4" />
			{isTriggered ? 'Triggered' : 'Trigger'}
		</button>

		<button
			onclick={handleReset}
			class="flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
		>
			<Icon icon="fluent:arrow-reset-24-regular" class="w-4 h-4" />
			Reset
		</button>
	</div>

	{#if showMapLink}
		<a
			href="/map"
			class="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium border border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 transition-colors"
		>
			<Icon icon="fluent:map-24-regular" class="w-4 h-4" />
			View Hazard Map
		</a>
	{/if}
</div>

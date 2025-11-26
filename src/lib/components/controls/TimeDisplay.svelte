<script lang="ts">
	let {
		elapsedTime = 0,
		rainfallAmount = 0
	}: {
		elapsedTime?: number;
		rainfallAmount?: number;
	} = $props();
</script>

<div class="bg-neutral-100 rounded-lg p-3 font-mono text-sm text-neutral-700">
	<div class="flex items-center justify-between">
		<span>Elapsed: {elapsedTime.toFixed(1)} min</span>
		<span class="text-neutral-400">|</span>
		<span>Rain: {rainfallAmount.toFixed(1)} mm</span>
	</div>
</div>

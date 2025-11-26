<script lang="ts">
	import { Slider } from '$lib/components/ui/slider';
	import { Label } from '$lib/components/ui/label';

	let {
		label,
		value = $bindable(),
		min,
		max,
		step = 1,
		unit = ''
	}: {
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		unit?: string;
	} = $props();

	let sliderValue = $state([value]);

	$effect(() => {
		value = sliderValue[0];
	});
</script>

<div class="space-y-2">
	<div class="flex justify-between items-baseline">
		<Label class="text-sm text-neutral-600">{label}</Label>
		<span class="font-mono text-sm text-neutral-900 font-medium">
			{value.toFixed(step < 1 ? 1 : 0)}{unit}
		</span>
	</div>

	<Slider bind:value={sliderValue} {min} {max} {step} class="w-full" />
</div>

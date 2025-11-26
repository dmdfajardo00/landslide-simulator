<script lang="ts">
	import { Sky as ThrelteSky } from '@threlte/extras';

	interface Props {
		isRaining?: boolean;
	}

	let { isRaining = false }: Props = $props();

	// Adjust sky parameters based on weather
	// Normal sky: brighter, more atmospheric scattering
	// Rainy sky: darker, less scattering, more turbidity
	const turbidity = $derived(isRaining ? 20 : 10);
	const rayleigh = $derived(isRaining ? 0.5 : 3);
	const mieCoefficient = $derived(isRaining ? 0.01 : 0.005);
	const mieDirectionalG = $derived(isRaining ? 0.95 : 0.7);
</script>

<ThrelteSky
	{turbidity}
	{rayleigh}
	{mieCoefficient}
	{mieDirectionalG}
	elevation={2}
	azimuth={180}
/>

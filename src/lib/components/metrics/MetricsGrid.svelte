<script lang="ts">
	import MetricCard from './MetricCard.svelte';
	import { getFosStatus, getPofStatus, getRuStatus, getCohesionStatus } from './types';

	interface Props {
		fos: number;
		pof: number;
		ru: number;
		cohesion: number;
	}

	let { fos, pof, ru, cohesion }: Props = $props();

	const fosStatus = $derived(getFosStatus(fos));
	const pofStatus = $derived(getPofStatus(pof));
	const ruStatus = $derived(getRuStatus(ru));
	const cohesionStatus = $derived(getCohesionStatus(cohesion));

	const fosFormatted = $derived(fos.toFixed(3));
	const pofFormatted = $derived(pof.toFixed(2));
	const ruFormatted = $derived(ru.toFixed(3));
	const cohesionFormatted = $derived(cohesion.toFixed(1));
</script>

<div class="grid grid-cols-2 gap-3">
	<MetricCard label="Factor of Safety (FoS)" value={fosFormatted} status={fosStatus} />
	<MetricCard label="Failure Probability (PoF)" value={pofFormatted} status={pofStatus} unit="%" />
	<MetricCard label="Pore Pressure Ratio (ru)" value={ruFormatted} status={ruStatus} />
	<MetricCard
		label="Effective Cohesion"
		value={cohesionFormatted}
		status={cohesionStatus}
		unit="kPa"
	/>
</div>

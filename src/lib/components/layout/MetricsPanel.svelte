<script lang="ts">
	import { getFosStatus, getPofStatus, getRuStatus, getCohesionStatus, calculateOverallStatus } from '$lib/components/metrics';

	interface Props {
		fos?: number;
		pof?: number;
		ru?: number;
		cohesion?: number;
		displacedParticles?: number;
	}

	let {
		fos = 1.468,
		pof = 1.68,
		ru = 0.316,
		cohesion = 14.7,
		displacedParticles = 0
	}: Props = $props();

	let overallStatus = $derived(calculateOverallStatus(fos, pof));

	const statusConfig = {
		safe: { label: 'Stable', color: 'bg-green-500' },
		marginal: { label: 'Caution', color: 'bg-yellow-500' },
		critical: { label: 'Unstable', color: 'bg-orange-500' },
		failure: { label: 'Failing', color: 'bg-red-500' }
	};

	const fosStatus = $derived(getFosStatus(fos));
	const pofStatus = $derived(getPofStatus(pof));
	const ruStatus = $derived(getRuStatus(ru));
	const cohesionStatus = $derived(getCohesionStatus(cohesion));

	interface Metric {
		label: string;
		abbrev: string;
		value: string;
		unit: string;
		status: 'safe' | 'marginal' | 'critical' | 'failure';
	}

	const metrics: Metric[] = $derived([
		{ label: 'Factor of Safety', abbrev: 'FoS', value: fos.toFixed(3), unit: '', status: fosStatus },
		{ label: 'Failure Probability', abbrev: 'PoF', value: pof.toFixed(2), unit: '%', status: pofStatus },
		{ label: 'Pore Pressure Ratio', abbrev: 'ru', value: ru.toFixed(3), unit: '', status: ruStatus },
		{ label: 'Effective Cohesion', abbrev: "c'", value: cohesion.toFixed(1), unit: 'kPa', status: cohesionStatus }
	]);
</script>

<aside class="w-56 bg-white border-l border-neutral-200 flex flex-col overflow-y-auto">
	<!-- Header -->
	<div class="px-3 py-2.5 border-b border-neutral-100">
		<div class="flex items-center justify-between">
			<span class="text-xs font-medium text-neutral-500">Status</span>
			<div class="flex items-center gap-1.5">
				<span class="w-1.5 h-1.5 {statusConfig[overallStatus].color}"></span>
				<span class="text-xs font-medium text-neutral-900">{statusConfig[overallStatus].label}</span>
			</div>
		</div>
	</div>

	<!-- Metrics -->
	<div class="flex-1">
		{#each metrics as metric, i (metric.abbrev)}
			<div class="px-3 py-2.5 flex items-center justify-between {i < metrics.length - 1 ? 'border-b border-neutral-100' : ''}">
				<div class="flex flex-col">
					<span class="text-xs text-neutral-400">{metric.label}</span>
					<span class="text-[10px] font-mono text-neutral-300">({metric.abbrev})</span>
				</div>
				<div class="flex items-baseline gap-0.5">
					<span class="text-sm font-semibold font-mono text-neutral-900">{metric.value}</span>
					{#if metric.unit}
						<span class="text-[10px] text-neutral-400">{metric.unit}</span>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Footer Stats -->
	<div class="px-3 py-2.5 border-t border-neutral-100">
		<div class="flex items-center justify-between">
			<span class="text-xs text-neutral-400">Displaced</span>
			<span class="text-xs font-mono font-medium text-neutral-700">{displacedParticles}</span>
		</div>
	</div>
</aside>

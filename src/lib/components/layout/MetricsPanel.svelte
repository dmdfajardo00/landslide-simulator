<script lang="ts">
	import Icon from '@iconify/svelte';
	import { Card } from '$lib/components/ui/card';
	import StatusBadge from '$lib/components/metrics/StatusBadge.svelte';
	import { getFosStatus, getPofStatus, getRuStatus, getCohesionStatus, calculateOverallStatus } from '$lib/components/metrics';

	// Mock data - will be replaced with real calculations
	let fos = $state(1.468);
	let pof = $state(1.68);
	let ru = $state(0.316);
	let cohesion = $state(14.7);
	let displacedParticles = $state(0);

	let overallStatus = $derived(calculateOverallStatus(fos, pof));

	const statusLabels = {
		safe: 'Stable',
		marginal: 'Caution',
		critical: 'Unstable',
		failure: 'Failing'
	};

	const statusDescriptions = {
		safe: 'Slope is stable.',
		marginal: 'Monitor closely.',
		critical: 'Action needed.',
		failure: 'Emergency!'
	};

	const fosStatus = $derived(getFosStatus(fos));
	const pofStatus = $derived(getPofStatus(pof));
	const ruStatus = $derived(getRuStatus(ru));
	const cohesionStatus = $derived(getCohesionStatus(cohesion));

	const statusColors = {
		safe: 'border-l-green-500 bg-green-50/50',
		marginal: 'border-l-yellow-500 bg-yellow-50/50',
		critical: 'border-l-orange-500 bg-orange-50/50',
		failure: 'border-l-red-500 bg-red-50/50'
	};

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

<aside class="w-64 bg-neutral-50 border-l border-neutral-200 flex flex-col overflow-y-auto">
	<!-- Header -->
	<div class="p-4 border-b border-neutral-200 bg-white">
		<div class="flex items-center justify-between mb-2">
			<h2 class="text-sm font-semibold text-neutral-700">System Status</h2>
			<StatusBadge status={overallStatus} label={statusLabels[overallStatus]} />
		</div>
		<p class="text-xs text-neutral-500">{statusDescriptions[overallStatus]}</p>
	</div>

	<!-- Metrics -->
	<div class="flex-1 p-3 space-y-2">
		{#each metrics as metric (metric.abbrev)}
			<div class="bg-white rounded-md border border-l-4 {statusColors[metric.status]} p-2.5 shadow-sm">
				<div class="flex items-center justify-between mb-1">
					<span class="text-xs text-neutral-500">{metric.label}</span>
					<span class="text-xs font-medium text-neutral-400">({metric.abbrev})</span>
				</div>
				<div class="flex items-baseline gap-1">
					<span class="text-lg font-bold font-mono text-neutral-900">{metric.value}</span>
					{#if metric.unit}
						<span class="text-xs text-neutral-500">{metric.unit}</span>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Footer Stats -->
	<div class="p-3 border-t border-neutral-200 bg-white">
		<div class="flex items-center justify-between text-xs">
			<span class="text-neutral-500">Displaced</span>
			<span class="font-mono font-medium text-neutral-700">{displacedParticles} particles</span>
		</div>
	</div>
</aside>

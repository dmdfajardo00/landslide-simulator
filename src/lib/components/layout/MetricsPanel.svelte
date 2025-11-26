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

	// Track history for charts - throttled updates
	const MAX_HISTORY = 60;
	let fosHistory = $state<number[]>([fos]);
	let pofHistory = $state<number[]>([pof]);
	let ruHistory = $state<number[]>([ru]);
	let lastUpdateTime = 0;

	// Throttled history update - only every 500ms to reduce SVG recalculations
	$effect(() => {
		const now = Date.now();
		if (now - lastUpdateTime < 500) return; // Throttle to 2 updates/sec
		lastUpdateTime = now;

		// Simple push with limit (much less frequent now)
		if (fosHistory.length >= MAX_HISTORY) {
			fosHistory = [...fosHistory.slice(-MAX_HISTORY + 1), fos];
			pofHistory = [...pofHistory.slice(-MAX_HISTORY + 1), pof];
			ruHistory = [...ruHistory.slice(-MAX_HISTORY + 1), ru];
		} else {
			fosHistory = [...fosHistory, fos];
			pofHistory = [...pofHistory, pof];
			ruHistory = [...ruHistory, ru];
		}
	});

	let overallStatus = $derived(calculateOverallStatus(fos, pof));

	const statusConfig = {
		safe: { label: 'Stable', color: 'bg-green-500', hex: '#22C55E' },
		marginal: { label: 'Caution', color: 'bg-yellow-500', hex: '#EAB308' },
		critical: { label: 'Unstable', color: 'bg-orange-500', hex: '#F97316' },
		failure: { label: 'Failing', color: 'bg-red-500', hex: '#EF4444' }
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
		history: number[];
		min: number;
		max: number;
	}

	const metrics: Metric[] = $derived([
		{ label: 'Factor of Safety', abbrev: 'FoS', value: fos.toFixed(3), unit: '', status: fosStatus, history: fosHistory, min: 0.5, max: 3 },
		{ label: 'Failure Probability', abbrev: 'PoF', value: pof.toFixed(2), unit: '%', status: pofStatus, history: pofHistory, min: 0, max: 100 },
		{ label: 'Pore Pressure Ratio', abbrev: 'ru', value: ru.toFixed(3), unit: '', status: ruStatus, history: ruHistory, min: 0, max: 1 },
		{ label: 'Effective Cohesion', abbrev: "c'", value: cohesion.toFixed(1), unit: 'kPa', status: cohesionStatus, history: [], min: 0, max: 30 }
	]);

	// Generate SVG path for sparkline
	function generatePath(data: number[], min: number, max: number, width: number = 240, height: number = 40) {
		if (data.length < 2) return '';

		const range = max - min || 1;
		const step = width / (data.length - 1);
		const points = data.map((val, i) => {
			const x = i * step;
			const y = height - ((val - min) / range) * height;
			return `${x},${y}`;
		});

		return `M${points.join(' L')}`;
	}

	// Get color for metric based on status
	function getMetricColor(status: string): string {
		const colorMap: Record<string, string> = {
			safe: '#22C55E',
			marginal: '#EAB308',
			critical: '#F97316',
			failure: '#EF4444'
		};
		return colorMap[status] || '#64748B';
	}
</script>

<aside class="w-96 bg-white border-l border-neutral-200 flex flex-col overflow-y-auto">
	<!-- Header -->
	<div class="px-4 py-3 border-b border-neutral-100">
		<div class="flex items-center justify-between">
			<span class="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Status</span>
			<div class="flex items-center gap-2">
				<span class="w-2 h-2 rounded-full {statusConfig[overallStatus].color}"></span>
				<span class="text-sm font-semibold text-neutral-900">{statusConfig[overallStatus].label}</span>
			</div>
		</div>
	</div>

	<!-- Metrics with Charts -->
	<div class="flex-1 space-y-4 p-4">
		{#each metrics as metric (metric.abbrev)}
			<div class="space-y-2">
				<!-- Metric Header -->
				<div class="flex items-baseline justify-between">
					<div class="flex flex-col">
						<span class="text-xs font-semibold text-neutral-700">{metric.label}</span>
						<span class="text-[10px] text-neutral-400">({metric.abbrev})</span>
					</div>
					<div class="flex items-baseline gap-1">
						<span class="text-base font-mono font-bold text-neutral-900">{metric.value}</span>
						{#if metric.unit}
							<span class="text-xs text-neutral-500">{metric.unit}</span>
						{/if}
					</div>
				</div>

				<!-- Sparkline Chart -->
				{#if metric.history.length > 1}
					<div class="h-10 bg-neutral-50 rounded border border-neutral-100 p-2">
						<svg width="100%" height="100%" viewBox="0 0 240 40" preserveAspectRatio="none">
							<!-- Grid lines -->
							<line x1="0" y1="40" x2="240" y2="40" stroke="#E5E7EB" stroke-width="0.5" />
							<line x1="0" y1="20" x2="240" y2="20" stroke="#F3F4F6" stroke-width="0.5" />

							<!-- Area fill -->
							<defs>
								<linearGradient id="grad-{metric.abbrev}" x1="0%" y1="0%" x2="0%" y2="100%">
									<stop offset="0%" style="stop-color:{getMetricColor(metric.status)};stop-opacity:0.2" />
									<stop offset="100%" style="stop-color:{getMetricColor(metric.status)};stop-opacity:0" />
								</linearGradient>
							</defs>

							<!-- Line path -->
							<path
								d="{generatePath(metric.history, metric.min, metric.max)} L 240 40 L 0 40 Z"
								fill="url(#grad-{metric.abbrev})"
								stroke="none"
							/>

							<!-- Stroke line -->
							<path
								d={generatePath(metric.history, metric.min, metric.max)}
								fill="none"
								stroke={getMetricColor(metric.status)}
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>

							<!-- Current point -->
							<circle
								cx="240"
								cy={40 - ((metric.history[metric.history.length - 1] - metric.min) / (metric.max - metric.min)) * 40}
								r="2"
								fill={getMetricColor(metric.status)}
							/>
						</svg>
					</div>
				{/if}

				<!-- Status indicator (no CSS transition - updates too frequently) -->
				<div class="flex items-center gap-2">
					<div class="h-1 flex-1 bg-neutral-100 rounded-full overflow-hidden">
						<div
							class="h-full"
							style="width: {Math.min(100, Math.max(0, ((parseFloat(metric.value) - metric.min) / (metric.max - metric.min)) * 100))}%; background-color: {getMetricColor(metric.status)};"
						></div>
					</div>
					<span class="text-[10px] font-semibold text-neutral-500">{metric.min}-{metric.max}</span>
				</div>
			</div>
		{/each}
	</div>

	<!-- Footer Stats -->
	<div class="px-4 py-3 border-t border-neutral-100 bg-neutral-50">
		<div class="flex items-center justify-between">
			<span class="text-xs font-semibold text-neutral-600 uppercase">Particles Displaced</span>
			<span class="text-sm font-mono font-bold text-neutral-900">{displacedParticles}</span>
		</div>
	</div>
</aside>

<script lang="ts">
	import { MetricsGrid, SystemStatus, calculateOverallStatus } from '$lib/components/metrics';

	// Mock data - will be replaced with real calculations
	let fos = $state(1.468);
	let pof = $state(1.68);
	let ru = $state(0.316);
	let cohesion = $state(14.7);

	let overallStatus = $derived(calculateOverallStatus(fos, pof));
</script>

<footer class="border-t border-neutral-200 bg-white p-4">
	<div class="max-w-full">
		<div class="flex items-center justify-between mb-3">
			<SystemStatus {overallStatus} />
			<div class="text-sm text-neutral-500">
				<span class="font-mono">Displaced: 0 particles</span>
			</div>
		</div>
		<MetricsGrid {fos} {pof} {ru} {cohesion} />
	</div>
</footer>

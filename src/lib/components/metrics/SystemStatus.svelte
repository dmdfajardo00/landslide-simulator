<script lang="ts">
	import StatusBadge from './StatusBadge.svelte';

	type Status = 'safe' | 'marginal' | 'critical' | 'failure';

	interface Props {
		overallStatus: Status;
	}

	let { overallStatus }: Props = $props();

	const statusLabels = {
		safe: 'Stable',
		marginal: 'Caution',
		critical: 'Unstable',
		failure: 'Failing'
	};

	const statusDescriptions = {
		safe: 'All metrics are within safe thresholds. The slope is stable under current conditions.',
		marginal:
			'Some metrics show marginal values. Monitor conditions closely and consider preventive measures.',
		critical:
			'Critical conditions detected. The slope is approaching failure. Immediate action recommended.',
		failure: 'Failure conditions present. The slope has failed or is actively failing. Emergency response required.'
	};

	const label = $derived(statusLabels[overallStatus]);
	const description = $derived(statusDescriptions[overallStatus]);
</script>

<div class="bg-white rounded-lg border p-4 shadow-sm">
	<div class="flex items-center gap-3 mb-3">
		<h3 class="text-lg font-semibold text-neutral-900">System Status:</h3>
		<StatusBadge status={overallStatus} {label} />
	</div>
	<p class="text-sm text-neutral-600 leading-relaxed">
		{description}
	</p>
</div>

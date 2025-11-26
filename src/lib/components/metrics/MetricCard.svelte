<script lang="ts">
	import Icon from '@iconify/svelte';

	type Status = 'safe' | 'marginal' | 'critical' | 'failure';

	interface Props {
		label: string;
		value: string | number;
		status: Status;
		unit?: string;
	}

	let { label, value, status, unit }: Props = $props();

	const statusConfig = {
		safe: {
			borderColor: 'border-l-green-500',
			iconColor: 'text-green-500',
			icon: 'fluent:checkmark-circle-24-filled'
		},
		marginal: {
			borderColor: 'border-l-yellow-500',
			iconColor: 'text-yellow-500',
			icon: 'fluent:warning-24-regular'
		},
		critical: {
			borderColor: 'border-l-orange-500',
			iconColor: 'text-orange-500',
			icon: 'fluent:warning-24-filled'
		},
		failure: {
			borderColor: 'border-l-red-500',
			iconColor: 'text-red-500',
			icon: 'fluent:dismiss-circle-24-filled'
		}
	};

	const config = statusConfig[status];
</script>

<div class="bg-white rounded-lg border border-l-4 {config.borderColor} p-3 shadow-sm">
	<div class="flex items-start justify-between mb-2">
		<span class="text-sm text-neutral-600">{label}</span>
		<Icon icon={config.icon} class="w-5 h-5 {config.iconColor}" />
	</div>
	<div class="flex items-baseline gap-1">
		<span class="text-2xl font-bold font-mono">{value}</span>
		{#if unit}
			<span class="text-sm text-neutral-500 font-medium">{unit}</span>
		{/if}
	</div>
</div>

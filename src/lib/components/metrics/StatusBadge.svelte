<script lang="ts">
	import Icon from '@iconify/svelte';

	type Status = 'safe' | 'marginal' | 'critical' | 'failure';

	interface Props {
		status: Status;
		label: string;
	}

	let { status, label }: Props = $props();

	const statusConfig = {
		safe: {
			classes: 'bg-green-50 text-green-700 border-green-200',
			icon: 'fluent:checkmark-circle-24-filled'
		},
		marginal: {
			classes: 'bg-yellow-50 text-yellow-700 border-yellow-200',
			icon: 'fluent:warning-24-regular'
		},
		critical: {
			classes: 'bg-orange-50 text-orange-700 border-orange-200',
			icon: 'fluent:warning-24-filled'
		},
		failure: {
			classes: 'bg-red-50 text-red-700 border-red-200',
			icon: 'fluent:dismiss-circle-24-filled'
		}
	};

	const config = statusConfig[status];
</script>

<span
	class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium {config.classes}"
>
	<Icon icon={config.icon} class="w-4 h-4" />
	{label}
</span>

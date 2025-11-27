<script lang="ts">
	import Icon from '@iconify/svelte';
	import { Card } from '$lib/components/ui/card';

	let { title, icon, children }: { title: string; icon: string; children?: any } = $props();
</script>

<Card class="bg-white border-neutral-200 shadow-sm p-4">
	<div class="flex items-center gap-2 mb-4">
		<Icon {icon} class="w-5 h-5 text-neutral-700" />
		<h3 class="font-semibold text-neutral-900">{title}</h3>
	</div>

	<div class="space-y-4">
		{@render children?.()}
	</div>
</Card>

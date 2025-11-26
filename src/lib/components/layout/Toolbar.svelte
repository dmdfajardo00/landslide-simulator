<script lang="ts">
	import Icon from '@iconify/svelte';

	interface ToolbarItem {
		id: string;
		icon: string;
		label: string;
		active?: boolean;
	}

	let items: ToolbarItem[] = $state([
		{
			id: 'layers',
			icon: 'fluent:layer-24-regular',
			label: 'Layers',
			active: false
		},
		{
			id: 'draw',
			icon: 'fluent:draw-24-regular',
			label: 'Draw Tools',
			active: false
		},
		{
			id: 'settings',
			icon: 'fluent:settings-24-regular',
			label: 'Settings',
			active: false
		}
	]);

	function toggleTool(id: string) {
		items = items.map((item) => ({
			...item,
			active: item.id === id ? !item.active : false
		}));
	}
</script>

<aside
	class="w-16 bg-white border-l border-neutral-200 flex flex-col items-center py-4 gap-4 flex-shrink-0"
>
	{#each items as item (item.id)}
		<button
			onclick={() => toggleTool(item.id)}
			class="relative p-3 rounded-lg transition-all group"
			class:bg-neutral-100={item.active}
			class:hover:bg-neutral-50={!item.active}
			title={item.label}
		>
			<Icon icon={item.icon} width="24" height="24" class="text-neutral-700" />

			<!-- Tooltip -->
			<div
				class="absolute left-full ml-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50"
			>
				{item.label}
			</div>

			<!-- Active indicator -->
			{#if item.active}
				<div class="absolute inset-0 rounded-lg border-2 border-neutral-400 pointer-events-none"></div>
			{/if}
		</button>
	{/each}

	<!-- Spacer -->
	<div class="flex-1"></div>

	<!-- Bottom spacer tools could go here -->
</aside>

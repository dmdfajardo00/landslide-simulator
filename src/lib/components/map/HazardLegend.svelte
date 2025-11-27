<script lang="ts">
	import { hazardLevels } from '$lib/utils/map-styles';
</script>

<div class="bg-white rounded-lg border border-neutral-200 p-3 shadow-sm">
	<h4 class="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-2">Hazard Level</h4>
	<div class="space-y-1.5">
		{#each hazardLevels as level}
			<div class="flex items-center gap-2">
				<div
					class="w-4 h-4 rounded"
					style="background-color: {level.color}; opacity: 0.7;"
				></div>
				<span class="text-xs text-neutral-700">{level.label}</span>
			</div>
		{/each}
	</div>
</div>

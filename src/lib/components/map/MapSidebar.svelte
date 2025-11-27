<script lang="ts">
	import Icon from '@iconify/svelte';
	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { hazardLevels, getHazardColor, getHazardLabel } from '$lib/utils/map-styles';
	import { hazardToSimulatorParams, getHazardDisplayLabel } from '$lib/utils/hazard-mapping';
	import type { LandslideHazardLevel, SimulatorParams } from '$lib/types/landslide';
	import type { MapGeoJSONFeature } from 'maplibre-gl';

	interface Props {
		selectedFeature?: MapGeoJSONFeature | null;
		hoveredFeature?: MapGeoJSONFeature | null;
		activeFilters?: LandslideHazardLevel[];
		onLoadInSimulator?: (params: SimulatorParams) => void;
		onResetView?: () => void;
		onGoToLocation?: () => void;
		isLocating?: boolean;
	}

	let {
		selectedFeature = null,
		hoveredFeature = null,
		activeFilters = $bindable([]),
		onLoadInSimulator,
		onResetView,
		onGoToLocation,
		isLocating = false
	}: Props = $props();

	function toggleFilter(level: LandslideHazardLevel) {
		if (activeFilters.includes(level)) {
			activeFilters = activeFilters.filter((l) => l !== level);
		} else {
			activeFilters = [...activeFilters, level];
		}
	}

	function clearFilters() {
		activeFilters = [];
	}

	function handleLoadInSimulator() {
		if (!selectedFeature) return;
		const lh = selectedFeature.properties.LH as LandslideHazardLevel;
		const params = hazardToSimulatorParams(lh);
		onLoadInSimulator?.(params);
	}

	const displayFeature = $derived(selectedFeature || hoveredFeature);
	const featureLH = $derived(displayFeature?.properties?.LH as LandslideHazardLevel | undefined);

	let hoveredLegendLevel = $state<number | null>(null);
</script>

<aside class="w-80 bg-white border-r border-neutral-200 overflow-y-auto flex flex-col h-full">
	<!-- Header -->
	<div class="p-4 border-b border-neutral-200">
		<div class="flex items-center gap-2">
			<a href="/" class="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors" title="Back to Simulator">
				<Icon icon="fluent:arrow-left-24-regular" class="w-5 h-5 text-neutral-600" />
			</a>
			<div>
				<h1 class="text-lg font-semibold text-neutral-900">Hazard Map</h1>
				<p class="text-xs text-neutral-500">Cebu Landslide Data</p>
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="flex-1 p-4 space-y-4">
		<!-- Hazard Filters -->
		<Card class="bg-white border-neutral-200 shadow-sm p-4">
			<div class="flex items-center justify-between mb-3">
				<div class="flex items-center gap-2">
					<Icon icon="fluent:filter-24-regular" class="w-5 h-5 text-neutral-700" />
					<h3 class="font-semibold text-neutral-900">Filter by Hazard</h3>
				</div>
				{#if activeFilters.length > 0}
					<button
						onclick={clearFilters}
						class="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
					>
						Clear
					</button>
				{/if}
			</div>

			<div class="space-y-2">
				{#each hazardLevels as level}
					{@const isActive = activeFilters.includes(level.value as LandslideHazardLevel)}
					<button
						onclick={() => toggleFilter(level.value as LandslideHazardLevel)}
						class="w-full flex items-center gap-3 p-2 rounded-lg transition-all {isActive
							? 'bg-neutral-100 ring-1 ring-neutral-300'
							: 'hover:bg-neutral-50'}"
					>
						<div
							class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
							style="border-color: {level.color}; background-color: {isActive ? level.color : 'transparent'};"
						>
							{#if isActive}
								<Icon icon="fluent:checkmark-12-filled" class="w-3 h-3 text-white" />
							{/if}
						</div>
						<div class="flex-1 text-left">
							<span class="text-sm text-neutral-800">{level.label}</span>
						</div>
						<div
							class="w-3 h-3 rounded-full"
							style="background-color: {level.color}; opacity: 0.8;"
						></div>
					</button>
				{/each}
			</div>

			<p class="text-xs text-neutral-500 mt-3">
				{#if activeFilters.length === 0}
					No hazard levels visible
				{:else if activeFilters.length === 3}
					Showing all hazard levels
				{:else}
					Showing {activeFilters.length} of 3 levels
				{/if}
			</p>
		</Card>

		<!-- Location Info -->
		{#if displayFeature}
			{@const hasHazardData = featureLH !== undefined && featureLH !== null}
			{@const lh = featureLH ?? 0}
			{@const color = hasHazardData ? getHazardColor(lh) : '#94a3b8'}
			{@const label = hasHazardData ? getHazardLabel(lh) : 'No Data'}
			<Card class="bg-white border-neutral-200 shadow-sm p-4">
				<div class="flex items-center gap-2 mb-3">
					<Icon icon="fluent:location-24-regular" class="w-5 h-5 text-neutral-700" />
					<h3 class="font-semibold text-neutral-900">
						{selectedFeature ? 'Selected Location' : 'Hovered Location'}
					</h3>
				</div>

				<div class="space-y-3">
					<div class="flex items-center gap-2">
						<div class="w-4 h-4 rounded" style="background-color: {color}; opacity: 0.8;"></div>
						<span class="text-sm font-medium text-neutral-800">{label}</span>
					</div>

					{#if hasHazardData}
						<div class="text-xs text-neutral-600 space-y-1">
							<div class="flex justify-between">
								<span>Hazard Level (LH)</span>
								<span class="font-medium">{lh}</span>
							</div>
							{#if displayFeature.id}
								<div class="flex justify-between">
									<span>Feature ID</span>
									<span class="font-mono">{displayFeature.id}</span>
								</div>
							{/if}
						</div>

						{#if selectedFeature}
							<div class="pt-2 border-t border-neutral-100">
								<Button
									onclick={handleLoadInSimulator}
									class="w-full bg-neutral-900 hover:bg-neutral-800 text-white text-sm"
								>
									<Icon icon="fluent:open-24-regular" class="w-4 h-4 mr-2" />
									Load in Simulator
								</Button>
							</div>
						{/if}
					{:else}
						<p class="text-xs text-neutral-500">
							This location has no landslide hazard data available.
						</p>
					{/if}
				</div>
			</Card>
		{:else}
			<Card class="bg-white border-neutral-200 shadow-sm p-4">
				<div class="flex items-center gap-2 mb-3">
					<Icon icon="fluent:cursor-click-24-regular" class="w-5 h-5 text-neutral-700" />
					<h3 class="font-semibold text-neutral-900">No Selection</h3>
				</div>
				<p class="text-xs text-neutral-500">
					Click on a hazard zone to view details and load parameters into the simulator.
				</p>
			</Card>
		{/if}

		<!-- Legend -->
		<Card class="bg-white border-neutral-200 shadow-sm p-4">
			<div class="flex items-center gap-2 mb-3">
				<Icon icon="fluent:color-24-regular" class="w-5 h-5 text-neutral-700" />
				<h3 class="font-semibold text-neutral-900">Legend</h3>
			</div>
			<div class="space-y-2">
				{#each hazardLevels as level}
					<div class="relative">
						<div
							class="flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-neutral-50 cursor-help"
							onmouseenter={() => (hoveredLegendLevel = level.value)}
							onmouseleave={() => (hoveredLegendLevel = null)}
						>
							<div
								class="w-4 h-4 rounded flex-shrink-0"
								style="background-color: {level.color}; opacity: 0.7;"
							></div>
							<div class="flex-1">
								<span class="text-xs text-neutral-700">{level.label}</span>
							</div>
							<Icon icon="fluent:info-16-regular" class="w-3.5 h-3.5 text-neutral-400" />
						</div>

						{#if hoveredLegendLevel === level.value}
							<div class="absolute left-0 right-0 top-full mt-1 z-10 bg-neutral-900 text-white text-xs rounded-lg p-3 shadow-xl">
								<div class="flex items-start gap-2">
									<Icon icon="fluent:info-16-filled" class="w-3.5 h-3.5 text-neutral-300 flex-shrink-0 mt-0.5" />
									<p class="leading-relaxed">{level.description}</p>
								</div>
								<div class="absolute -top-1 left-4 w-2 h-2 bg-neutral-900 rotate-45"></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</Card>

		<!-- Map Controls -->
		<Card class="bg-white border-neutral-200 shadow-sm p-4">
			<div class="flex items-center gap-2 mb-3">
				<Icon icon="fluent:map-24-regular" class="w-5 h-5 text-neutral-700" />
				<h3 class="font-semibold text-neutral-900">Map Controls</h3>
			</div>
			<div class="space-y-2">
				<Button
					onclick={onGoToLocation}
					disabled={isLocating}
					variant="outline"
					class="w-full text-sm border-neutral-200 hover:bg-neutral-50 {isLocating ? 'opacity-60' : ''}"
				>
					{#if isLocating}
						<div class="w-4 h-4 mr-2 border-2 border-neutral-300 border-t-neutral-700 rounded-full animate-spin"></div>
						Locating...
					{:else}
						<Icon icon="fluent:my-location-24-regular" class="w-4 h-4 mr-2" />
						My Location
					{/if}
				</Button>
				<Button
					onclick={onResetView}
					variant="outline"
					class="w-full text-sm border-neutral-200 hover:bg-neutral-50"
				>
					<Icon icon="fluent:arrow-reset-24-regular" class="w-4 h-4 mr-2" />
					Reset View
				</Button>
				<a
					href="/"
					class="flex items-center justify-center gap-2 w-full py-2 px-4 text-sm rounded-md border border-neutral-200 hover:bg-neutral-50 transition-colors text-neutral-700"
				>
					<Icon icon="fluent:cube-24-regular" class="w-4 h-4" />
					Back to Simulator
				</a>
			</div>
		</Card>
	</div>

	<!-- Footer -->
	<div class="p-4 border-t border-neutral-100 bg-neutral-50/50">
		<p class="text-xs text-neutral-500 text-center">
			Data: Cebu Landslide Hazards
		</p>
	</div>
</aside>

<script lang="ts">
	import ParameterCard from '$lib/components/controls/ParameterCard.svelte';
	import ParameterSlider from '$lib/components/controls/ParameterSlider.svelte';

	interface Props {
		// Slope Geometry
		slopeAngle?: number;
		soilDepth?: number;
		// Soil Properties
		cohesion?: number;
		frictionAngle?: number;
		unitWeight?: number;
		porosity?: number;
		// Hydrological
		porePressure?: number;
		rainfallIntensity?: number;
		elapsedTime?: number;
		rainfallAmount?: number;
		// Vegetation
		vegetationCover?: number;
		// Visualization (kept for 3D rendering)
		landslideSeverity?: number;
		boulderDensity?: number;
	}

	let {
		// Slope Geometry
		slopeAngle = $bindable(30),
		soilDepth = $bindable(3.0),
		// Soil Properties
		cohesion = $bindable(15),
		frictionAngle = $bindable(32),
		unitWeight = $bindable(19.0),
		porosity = $bindable(0.35),
		// Hydrological
		porePressure = $bindable(30),
		rainfallIntensity = $bindable(25),
		elapsedTime = $bindable(0),
		rainfallAmount = $bindable(0),
		// Vegetation
		vegetationCover = $bindable(70),
		// Visualization
		landslideSeverity = $bindable(50),
		boulderDensity = $bindable(15)
	}: Props = $props();

	// Format elapsed time as duration (seconds → minutes → hours)
	function formatDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = (seconds % 60).toFixed(1);
		if (hours > 0) {
			return `${hours}h ${mins}m`;
		}
		if (mins > 0) {
			return `${mins}m ${secs}s`;
		}
		return `${secs}s`;
	}
</script>

<aside class="w-80 h-full min-h-0 bg-white border-r border-neutral-200 overflow-y-auto flex flex-col">
	<!-- Sidebar Header -->
	<div class="p-4 border-b border-neutral-200">
		<h1 class="text-lg font-semibold text-neutral-900">Landslide Simulator</h1>
		<p class="text-xs text-neutral-500 mt-0.5">Physics-based simulation engine</p>
	</div>

	<!-- Sidebar Content -->
	<div class="flex-1 p-4 space-y-3 pb-40">
		<!-- 1. Slope Geometry -->
		<ParameterCard title="Slope Geometry" icon="fluent:triangle-24-regular">
			{#snippet children()}
				<ParameterSlider
					label="Slope Angle"
					bind:value={slopeAngle}
					min={0}
					max={90}
					step={1}
					unit="°"
				/>
				<ParameterSlider
					label="Slope Height"
					bind:value={soilDepth}
					min={0.8}
					max={5}
					step={0.1}
					unit=" m"
				/>
			{/snippet}
		</ParameterCard>

		<!-- 2. Soil / Material Properties -->
		<ParameterCard title="Soil Properties" icon="fluent:cube-24-regular">
			{#snippet children()}
				<ParameterSlider
					label="Cohesion (c')"
					bind:value={cohesion}
					min={0}
					max={50}
					step={1}
					unit=" kPa"
				/>
				<ParameterSlider
					label="Internal Friction Angle (φ')"
					bind:value={frictionAngle}
					min={15}
					max={45}
					step={1}
					unit="°"
				/>
				<ParameterSlider
					label="Unit Weight (γ)"
					bind:value={unitWeight}
					min={10}
					max={25}
					step={0.5}
					unit=" kN/m³"
				/>
				<ParameterSlider
					label="Porosity (n)"
					bind:value={porosity}
					min={0.1}
					max={0.6}
					step={0.01}
					unit=""
				/>
			{/snippet}
		</ParameterCard>

		<!-- 3. Hydrological / Water Conditions -->
		<ParameterCard title="Hydrological Conditions" icon="fluent:drop-24-regular">
			{#snippet children()}
				<!-- Initial Soil Moisture slider hidden - kept for future use
				<ParameterSlider
					label="Initial Soil Moisture"
					bind:value={porePressure}
					min={0}
					max={100}
					step={1}
					unit="%"
				/>
				-->
				<ParameterSlider
					label="Rainfall Intensity"
					bind:value={rainfallIntensity}
					min={0}
					max={100}
					step={1}
					unit=" mm/hr"
				/>
				<!-- Rainfall Duration Display -->
				<div class="flex items-center justify-between py-2">
					<span class="text-xs text-neutral-600">Rainfall Duration</span>
					<span class="text-xs font-medium text-neutral-900">{formatDuration(elapsedTime)}</span>
				</div>
				<div class="flex items-center justify-between py-2 border-t border-neutral-100">
					<span class="text-xs text-neutral-600">Accumulated Rainfall</span>
					<span class="text-xs font-medium text-neutral-900">{rainfallAmount.toFixed(2)} mm</span>
				</div>
			{/snippet}
		</ParameterCard>

		<!-- 4. Vegetation -->
		<ParameterCard title="Vegetation" icon="fluent:plant-grass-20-regular">
			{#snippet children()}
				<ParameterSlider
					label="Vegetation Cover"
					bind:value={vegetationCover}
					min={0}
					max={100}
					step={1}
					unit="%"
				/>
			{/snippet}
		</ParameterCard>

		<!-- Landslide Visualization (kept for 3D rendering control) -->
		<ParameterCard title="Landslide Visualization" icon="fluent:fire-24-regular">
			{#snippet children()}
				<ParameterSlider
					label="Severity"
					bind:value={landslideSeverity}
					min={1}
					max={100}
					step={1}
					unit="%"
				/>
				<ParameterSlider
					label="Boulder Density"
					bind:value={boulderDensity}
					min={0}
					max={50}
					step={1}
					unit=""
				/>
			{/snippet}
		</ParameterCard>
	</div>
</aside>

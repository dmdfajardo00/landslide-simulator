<script lang="ts">
	import ParameterCard from '$lib/components/controls/ParameterCard.svelte';
	import ParameterSlider from '$lib/components/controls/ParameterSlider.svelte';
	import TimeDisplay from '$lib/components/controls/TimeDisplay.svelte';

	interface Props {
		slopeAngle?: number;
		maxElevation?: number;
		elapsedTime?: number;
		rainfallAmount?: number;
		rainfallIntensity?: number;
		vegetationCover?: number;
		soilDepth?: number;
		// Environmental
		erosion?: number;
		soilMoisture?: number;
		// Geotechnical
		unitWeight?: number;
		cohesion?: number;
		frictionAngle?: number;
		hydraulicConductivity?: number;
		// Reliability
		coefficientOfVariation?: number;
	}

	let {
		slopeAngle = $bindable(30),
		maxElevation = $bindable(50),
		elapsedTime = $bindable(0),
		rainfallAmount = $bindable(0),
		rainfallIntensity = $bindable(25),
		vegetationCover = $bindable(70),
		soilDepth = $bindable(3.0),
		// Environmental
		erosion = $bindable(20),
		soilMoisture = $bindable(30),
		// Geotechnical
		unitWeight = $bindable(19.0),
		cohesion = $bindable(15),
		frictionAngle = $bindable(32),
		hydraulicConductivity = $bindable(5.0),
		// Reliability
		coefficientOfVariation = $bindable(0.15)
	}: Props = $props();
</script>

<aside class="w-80 bg-white border-r border-neutral-200 overflow-y-auto flex flex-col">
	<!-- Sidebar Header -->
	<div class="p-4 border-b border-neutral-200">
		<h1 class="text-lg font-semibold text-neutral-900">Landslide Simulator</h1>
		<p class="text-xs text-neutral-500 mt-0.5">Physics-based simulation engine</p>
	</div>

	<!-- Sidebar Content -->
	<div class="flex-1 p-4 space-y-3 pb-20">
		<!-- Environmental Factors -->
		<ParameterCard title="Environmental Factors" icon="fluent:plant-grass-20-regular">
			{#snippet children()}
				<ParameterSlider
					label="Vegetation Cover"
					bind:value={vegetationCover}
					min={0}
					max={100}
					step={1}
					unit="%"
				/>
				<ParameterSlider
					label="Soil Erosion Level"
					bind:value={erosion}
					min={0}
					max={100}
					step={1}
					unit="%"
				/>
				<ParameterSlider
					label="Initial Soil Moisture"
					bind:value={soilMoisture}
					min={0}
					max={100}
					step={1}
					unit="%"
				/>
				<ParameterSlider
					label="Rainfall Intensity"
					bind:value={rainfallIntensity}
					min={0}
					max={100}
					step={1}
					unit=" mm/hr"
				/>
			{/snippet}
		</ParameterCard>

		<!-- Geotechnical Parameters -->
		<ParameterCard title="Geotechnical Parameters" icon="fluent:cube-24-regular">
			{#snippet children()}
				<ParameterSlider
					label="Soil Depth"
					bind:value={soilDepth}
					min={0.5}
					max={10}
					step={0.1}
					unit=" m"
				/>
				<ParameterSlider
					label="Unit Weight"
					bind:value={unitWeight}
					min={10}
					max={25}
					step={0.5}
					unit=" kN/m³"
				/>
				<ParameterSlider
					label="Cohesion"
					bind:value={cohesion}
					min={0}
					max={50}
					step={1}
					unit=" kPa"
				/>
				<ParameterSlider
					label="Friction Angle"
					bind:value={frictionAngle}
					min={15}
					max={45}
					step={1}
					unit="°"
				/>
				<ParameterSlider
					label="Slope Angle"
					bind:value={slopeAngle}
					min={0}
					max={90}
					step={1}
					unit="°"
				/>
				<ParameterSlider
					label="Hydraulic Conductivity"
					bind:value={hydraulicConductivity}
					min={0.1}
					max={20}
					step={0.1}
					unit=" ×10⁻⁶ m/s"
				/>
			{/snippet}
		</ParameterCard>

		<!-- Reliability Analysis -->
		<ParameterCard title="Reliability Analysis" icon="fluent:data-bar-vertical-24-regular">
			{#snippet children()}
				<ParameterSlider
					label="Coefficient of Variation"
					bind:value={coefficientOfVariation}
					min={0.05}
					max={0.5}
					step={0.01}
					unit=""
				/>
			{/snippet}
		</ParameterCard>

		<!-- Time Display -->
		<TimeDisplay {elapsedTime} {rainfallAmount} />
	</div>
</aside>


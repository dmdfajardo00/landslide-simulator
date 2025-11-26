<script lang="ts">
	import ParameterCard from '$lib/components/controls/ParameterCard.svelte';
	import ParameterSlider from '$lib/components/controls/ParameterSlider.svelte';
	import ActionButtons from '$lib/components/controls/ActionButtons.svelte';
	import TimeDisplay from '$lib/components/controls/TimeDisplay.svelte';

	// Environmental Factors
	let vegetation = $state(50);
	let erosion = $state(20);
	let soilMoisture = $state(30);
	let rainfall = $state(10);

	// Geotechnical Parameters
	let soilDepth = $state(3.0);
	let unitWeight = $state(19.0);
	let cohesion = $state(15);
	let frictionAngle = $state(32);
	let slopeAngle = $state(30);
	let hydraulicConductivity = $state(5.0);

	// Reliability Analysis
	let coefficientOfVariation = $state(0.15);

	// Simulation state
	let isRaining = $state(false);
	let elapsedTime = $state(0);
	let rainfallAmount = $state(0);
</script>

<aside class="w-80 bg-white border-r border-neutral-200 overflow-y-auto flex flex-col">
	<!-- Sidebar Header -->
	<div class="p-6 border-b border-neutral-200">
		<h1 class="text-2xl font-bold text-neutral-900">Landslide Simulator</h1>
		<p class="text-sm text-neutral-600 mt-1">Physics-based simulation engine</p>
	</div>

	<!-- Sidebar Content -->
	<div class="flex-1 p-6 space-y-4">
		<!-- Environmental Factors -->
		<ParameterCard title="Environmental Factors" icon="fluent:plant-grass-20-regular">
			{#snippet children()}
				<ParameterSlider
					label="Vegetation Cover"
					bind:value={vegetation}
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
					bind:value={rainfall}
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

		<!-- Action Buttons -->
		<ActionButtons bind:isRaining />
	</div>
</aside>


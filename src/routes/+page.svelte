<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import ViewportPlaceholder from '$lib/components/layout/ViewportPlaceholder.svelte';
	import MetricsPanel from '$lib/components/layout/MetricsPanel.svelte';
	import ActionButtons from '$lib/components/controls/ActionButtons.svelte';
	import {
		calculateFoS,
		calculatePoF,
		calculatePorePressure,
		updateInfiltration,
		calculateEvapotranspiration,
		createLandslideState,
		calculateFailureZone,
		updateLandslideState,
		calculateTerrainDeformation,
		calculateDisplacedVolume,
		type FailureZone
	} from '$lib/simulation/physics';
	import { TerrainGenerator } from '$lib/simulation/terrain';
	import type { HydrologicalState, LandslideState } from '$lib/simulation/physics';

	// Page data from URL params (passed from map)
	let { data } = $props();

	// Simulation state
	let isRaining = $state(false);
	let isTriggered = $state(false);
	let elapsedTime = $state(0);
	let rainfallAccumulated = $state(0);

	// Slope Geometry
	let slopeAngle = $state(data.slopeAngle);
	let maxElevation = $state(data.maxElevation);
	let soilDepth = $state(data.soilDepth);

	// Soil Properties
	let cohesionInput = $state(data.cohesion);
	let frictionAngle = $state(data.frictionAngle);
	let unitWeight = $state(data.unitWeight);
	let porosity = $state(data.porosity);

	// Hydrological
	let porePressure = $state(data.porePressure); // Initial pore pressure ratio (0-100%)
	let rainfallIntensity = $state(data.rainfallIntensity);

	// Vegetation
	let vegetationCover = $state(data.vegetationCover);

	// Landslide visualization parameters
	let landslideSeverity = $state(50);
	let boulderDensity = $state(15);

	// Internal constants (removed from UI)
	const DEFAULT_HYDRAULIC_CONDUCTIVITY = 5.0; // ×10⁻⁶ m/s
	const DEFAULT_COEFFICIENT_OF_VARIATION = 0.15;
	const REFERENCE_POROSITY = 0.35; // Reference porosity for saturation calculations

	// Hydrological state for physics calculations
	// Initial saturation based on pore pressure parameter, scaled by porosity
	// Lower porosity = same water content fills more of available pore space
	let hydrologicalState = $state<HydrologicalState>({
		saturationDepth: (porePressure / 100) * soilDepth * (REFERENCE_POROSITY / porosity),
		porePressure: 0,
		porePressureRatio: 0,
		infiltrationRate: 0
	});

	// Metrics state (calculated from physics)
	let fos = $state(1.5);
	let pof = $state(1.0);
	let ru = $state(0.0);
	let cohesion = $state(15);
	let displacedParticles = $state(0);

	// Derived saturation for terrain visualization (0-1)
	let saturation = $derived(soilDepth > 0 ? hydrologicalState.saturationDepth / soilDepth : 0);

	// Landslide state
	let landslideState = $state<LandslideState>(createLandslideState());

	// Terrain constants for landslide calculations
	const TERRAIN_WIDTH = 128;
	const TERRAIN_HEIGHT = 128;
	const WORLD_SCALE = 100;

	// Pre-allocated deformation arrays (reused every tick to avoid GC)
	const deformationScarp = new Float32Array(TERRAIN_WIDTH * TERRAIN_HEIGHT);
	const deformationDeposition = new Float32Array(TERRAIN_WIDTH * TERRAIN_HEIGHT);
	let scarpDepth = $state<Float32Array | null>(null);
	let depositionDepth = $state<Float32Array | null>(null);
	// Version counter to force Svelte reactivity when arrays update in-place
	let deformationVersion = $state(0);

	// Generate heightmap for landslide calculations (synchronized with viewport)
	const terrainGenerator = new TerrainGenerator({
		width: TERRAIN_WIDTH,
		height: TERRAIN_HEIGHT,
		worldScale: WORLD_SCALE,
		maxElevation,
		slopeAngle,
		noiseOctaves: 5,
		noisePersistence: 0.5,
		noiseScale: 0.025,
		ridgeSharpness: 0.45
	});

	let currentHeightmap = $state<Float32Array>(terrainGenerator.generateHeightmap());

	// Regenerate heightmap when terrain parameters change
	$effect(() => {
		terrainGenerator.setConfig({ slopeAngle, maxElevation });
		currentHeightmap = terrainGenerator.generateHeightmap();
	});

	// Simulation interval
	let simulationInterval: ReturnType<typeof setInterval> | null = null;
	const DELTA_TIME = 0.1; // 100ms in seconds

	function updatePhysics() {
		// Update infiltration if raining
		if (isRaining) {
			hydrologicalState = updateInfiltration(
				hydrologicalState,
				{
					rainfallIntensity,
					hydraulicConductivity: DEFAULT_HYDRAULIC_CONDUCTIVITY,
					vegetation: vegetationCover / 100,
					soilDepth,
					porosity
				},
				DELTA_TIME
			);
			rainfallAccumulated += (rainfallIntensity * DELTA_TIME) / 3600; // Convert mm/hr to mm per tick
		}

		// Apply evapotranspiration - vegetation removes water from soil
		// ET occurs continuously (even without rain) if there's vegetation and saturation
		if (vegetationCover > 0 && hydrologicalState.saturationDepth > 0) {
			const currentSaturation = soilDepth > 0
				? hydrologicalState.saturationDepth / soilDepth
				: 0;
			const etRate = calculateEvapotranspiration(
				vegetationCover / 100,
				currentSaturation,
				4.0 // 4 mm/day potential ET (temperate climate)
			);
			// Reduce saturation depth by ET (convert rate to depth change)
			hydrologicalState.saturationDepth = Math.max(
				0,
				hydrologicalState.saturationDepth - etRate * DELTA_TIME
			);
		}

		// Calculate pore pressure from saturation
		const poreResult = calculatePorePressure(
			hydrologicalState.saturationDepth,
			soilDepth,
			unitWeight
		);
		hydrologicalState.porePressure = poreResult.Pw;
		hydrologicalState.porePressureRatio = poreResult.ru;
		ru = poreResult.ru;

		// Calculate effective cohesion with geotechnical model
		// Root cohesion from vegetation (0-12 kPa based on literature values for grassland/forest)
		const rootCohesion = (vegetationCover / 100) * 12; // 0-12 kPa

		// Saturation effect (matric suction loss at high pore pressure)
		const saturationEffect = Math.pow(ru, 1.5); // Non-linear reduction (accelerates at high ru)
		const minCohesionRatio = 0.15; // Cohesion retains at least 15% of input (residual strength)
		const saturationFactor = 1 - (1 - minCohesionRatio) * saturationEffect;

		// Final cohesion: base soil + root cohesion, reduced by saturation
		cohesion = Math.max(cohesionInput * minCohesionRatio, (cohesionInput + rootCohesion) * saturationFactor);

		// Calculate Factor of Safety
		fos = calculateFoS(
			{
				slopeAngle,
				soilDepth,
				unitWeight,
				cohesion,
				frictionAngle,
				hydraulicConductivity: DEFAULT_HYDRAULIC_CONDUCTIVITY
			},
			hydrologicalState.porePressure
		);

		// Calculate Probability of Failure
		pof = calculatePoF(fos, DEFAULT_COEFFICIENT_OF_VARIATION);
	}

	function startSimulation() {
		if (simulationInterval) return;

		simulationInterval = setInterval(() => {
			elapsedTime += DELTA_TIME; // Increment by physics timestep (0.1s) for real-time accuracy
			updatePhysics();

			if (isTriggered) {
				// Update landslide physics
				updateLandslidePhysics();
			}
		}, 100);
	}

	function stopSimulation() {
		if (simulationInterval) {
			clearInterval(simulationInterval);
			simulationInterval = null;
		}
	}

	function handleToggleRain() {
		if (isRaining && !isTriggered) {
			startSimulation();
		}
	}

	function handleTrigger() {
		isTriggered = true;

		// Initialize landslide if we have heightmap
		if (currentHeightmap && landslideState.phase === 'dormant') {
			// Calculate failure zone (spans horizontally across slope)
			// Uses current saturation, but also considers base instability from slope/soil
			const effectiveSaturation = Math.max(saturation, 0.3); // Minimum 30% for visible effect
			const failureZone = calculateFailureZone(
				currentHeightmap,
				TERRAIN_WIDTH,
				TERRAIN_HEIGHT,
				WORLD_SCALE,
				maxElevation,
				slopeAngle,
				soilDepth,
				effectiveSaturation,
				landslideSeverity / 100, // Normalize to 0-1 range
				vegetationCover / 100,   // Vegetation parameter (0-1)
				0                        // No erosion parameter
			);

			// Calculate initial terrain deformation (progress starts at 0)
			calculateTerrainDeformation(
				failureZone,
				0.05, // Initial progress to show initiation
				TERRAIN_WIDTH,
				TERRAIN_HEIGHT,
				WORLD_SCALE,
				deformationScarp,
				deformationDeposition
			);

			// Update state - no particles, just terrain deformation
			landslideState = {
				...landslideState,
				phase: 'initiating',
				progress: 0.05,
				failureZone,
				totalVolume: calculateDisplacedVolume(failureZone, 0.05),
				runoutDistance: failureZone.toeZ - failureZone.headZ,
				elapsedTime: 0
			};

			// Point state to pre-allocated arrays and increment version to trigger reactivity
			scarpDepth = deformationScarp;
			depositionDepth = deformationDeposition;
			deformationVersion++;
		}

		startSimulation();
	}

	function updateLandslidePhysics() {
		if (landslideState.phase === 'dormant' || landslideState.phase === 'complete') {
			return;
		}

		if (!currentHeightmap) return;

		// Update landslide state (advances progress over time)
		landslideState = updateLandslideState(landslideState, DELTA_TIME);

		// Update terrain deformation based on current progress (reusing pre-allocated arrays)
		if (landslideState.failureZone) {
			calculateTerrainDeformation(
				landslideState.failureZone,
				landslideState.progress,
				TERRAIN_WIDTH,
				TERRAIN_HEIGHT,
				WORLD_SCALE,
				deformationScarp,
				deformationDeposition
			);
			// Increment version to trigger Svelte reactivity (arrays updated in-place)
			deformationVersion++;

			// Update total displaced volume
			landslideState.totalVolume = calculateDisplacedVolume(
				landslideState.failureZone,
				landslideState.progress
			);
		}

		// Update displaced volume as integer for display (m³)
		displacedParticles = Math.round(landslideState.totalVolume);
	}

	function handleReset() {
		stopSimulation();
		isRaining = false;
		isTriggered = false;
		elapsedTime = 0;
		rainfallAccumulated = 0;
		// Porosity affects water storage capacity
		const porosityFactor = REFERENCE_POROSITY / porosity;
		hydrologicalState = {
			saturationDepth: (porePressure / 100) * soilDepth * porosityFactor,
			porePressure: 0,
			porePressureRatio: 0,
			infiltrationRate: 0
		};

		// Reset landslide state
		landslideState = createLandslideState();
		scarpDepth = null;
		depositionDepth = null;

		// Recalculate initial state
		ru = 0;
		const rootCohesion = (vegetationCover / 100) * 12; // 0-12 kPa
		cohesion = cohesionInput + rootCohesion;
		fos = calculateFoS(
			{ slopeAngle, soilDepth, unitWeight, cohesion, frictionAngle, hydraulicConductivity: DEFAULT_HYDRAULIC_CONDUCTIVITY },
			0
		);
		pof = calculatePoF(fos, DEFAULT_COEFFICIENT_OF_VARIATION);
		displacedParticles = 0;
	}

	// Initialize physics on mount and when parameters change
	$effect(() => {
		// Recalculate when any geotechnical or environmental parameter changes
		const _ = [slopeAngle, soilDepth, unitWeight, cohesionInput, frictionAngle, porePressure, porosity, vegetationCover];
		// Use untrack to prevent state modifications from re-triggering this effect
		untrack(() => {
			if (!isRaining && !isTriggered) {
				// Reset saturation depth when pore pressure or porosity changes
				// Porosity affects water storage capacity: lower porosity = same water fills more pore space
				const porosityFactor = REFERENCE_POROSITY / porosity;
				hydrologicalState.saturationDepth = (porePressure / 100) * soilDepth * porosityFactor;
				updatePhysics();
			}
		});
	});

	// Start/stop simulation based on rain state
	$effect(() => {
		if (isRaining || isTriggered) {
			startSimulation();
		} else if (!isRaining && !isTriggered) {
			stopSimulation();
		}
	});

	// Cleanup on component destroy to prevent memory leaks
	onDestroy(() => {
		stopSimulation();
	});
</script>

<div class="flex h-screen bg-white relative">
	<!-- Left Sidebar - Full Height -->
	<Sidebar
		bind:slopeAngle
		bind:soilDepth
		bind:cohesion={cohesionInput}
		bind:frictionAngle
		bind:unitWeight
		bind:porosity
		bind:porePressure
		bind:rainfallIntensity
		bind:elapsedTime
		bind:rainfallAmount={rainfallAccumulated}
		bind:vegetationCover
		bind:landslideSeverity
		bind:boulderDensity
	/>

	<!-- Main Content Area -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Center Viewport -->
		<ViewportPlaceholder
			{isRaining}
			{rainfallIntensity}
			{maxElevation}
			{vegetationCover}
			{soilDepth}
			{saturation}
			porePressureRatio={ru}
			heightmap={currentHeightmap}
			isLandslideActive={isTriggered && landslideState.phase !== 'dormant'}
			{scarpDepth}
			{depositionDepth}
			{deformationVersion}
			failureZone={landslideState.failureZone}
			landslideProgress={landslideState.progress}
			{landslideSeverity}
			{boulderDensity}
		/>

		<!-- Right Metrics Panel -->
		<MetricsPanel
			{fos}
			{pof}
			{ru}
			{cohesion}
			{displacedParticles}
			{slopeAngle}
			{soilDepth}
			{unitWeight}
			{frictionAngle}
			{porosity}
			{vegetationCover}
			initialMoisture={porePressure}
			{rainfallIntensity}
			{isRaining}
			{isTriggered}
		/>
	</div>

	<!-- Fixed Bottom Left Action Buttons -->
	<div class="fixed bottom-0 left-0 w-80 p-4 bg-white border-t border-r border-neutral-200 z-10">
		<ActionButtons
			bind:isRaining
			{isTriggered}
			onToggleRain={handleToggleRain}
			onTrigger={handleTrigger}
			onReset={handleReset}
		/>
	</div>
</div>

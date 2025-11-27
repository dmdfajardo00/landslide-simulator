/**
 * Simulation Store
 *
 * Central reactive store for landslide simulation state management.
 * Uses Svelte 5 runes ($state) for reactivity.
 */

import { Color } from 'three';
import {
	calculateFoS as calculateFoSPhysics,
	calculatePoF as calculatePoFPhysics,
	type GeotechnicalParams as PhysicsGeotechnicalParams
} from '$lib/simulation/physics';

// ============================================================================
// Type Definitions
// ============================================================================

export type SimulationStatus = 'stable' | 'marginal' | 'critical' | 'failing' | 'failed';
export type SlipSurfaceType = 'rotational' | 'translational' | 'compound';

// ============================================================================
// Terrain Configuration
// ============================================================================

export interface TerrainConfig {
  width: number;              // Grid width in vertices
  height: number;             // Grid height in vertices
  worldScale: number;         // Meters per unit
  maxElevation: number;       // Peak height in meters
  slopeAngle: number;         // Primary slope angle (degrees)
  noiseOctaves: number;       // Fractal noise layers
  noisePersistence: number;   // Amplitude decay per octave
  noiseScale: number;         // Base frequency
  ridgeSharpness: number;     // Mountain ridge definition
}

// ============================================================================
// Soil Profile
// ============================================================================

export interface SoilLayer {
  name: string;               // "Topsoil", "Clay", "Bedrock"
  thickness: number;          // Layer thickness (m)
  color: Color;               // Visual representation
  cohesion: number;           // c' (kPa)
  frictionAngle: number;      // φ' (degrees)
  unitWeight: number;         // γ (kN/m³)
  saturatedWeight: number;    // γ_sat (kN/m³)
  permeability: number;       // k (m/s)
  porosity: number;           // n (0-1)
}

export interface SoilProfile {
  layers: SoilLayer[];
  waterTable: number;         // Depth from surface (m)
}

// ============================================================================
// Simulation State
// ============================================================================

export interface SimulationState {
  status: SimulationStatus;
  fos: number;                // Factor of safety
  pof: number;                // Probability of failure (%)
  ru: number;                 // Pore pressure ratio
  cohesion: number;           // Effective cohesion (kPa)
  displacedVolume: number;    // Debris volume (m³)
  displacedParticles: number; // Particle count
  saturationDepth: number;    // Wetting front depth (m)
  runoffRate: number;         // Surface water (mm/hr)
}

// ============================================================================
// Environmental Parameters
// ============================================================================

export interface EnvironmentalParams {
  vegetation: number;         // Vegetation cover (0-1)
  erosion: number;            // Erosion level (0-1)
  soilMoisture: number;       // Initial soil moisture (0-1)
  rainfall: number;           // Rainfall intensity (mm/hr)
  isRaining: boolean;         // Rain active state
  isTriggered: boolean;       // Manual trigger state
}

// ============================================================================
// Geotechnical Parameters
// ============================================================================

/**
 * Store-specific geotechnical parameters.
 * Extends PhysicsGeotechnicalParams with additional properties for simulation state.
 */
export interface GeotechnicalParams {
  soilDepth: number;              // Soil thickness (m)
  unitWeight: number;             // Soil unit weight (kN/m³)
  cohesion: number;               // Effective cohesion (kPa)
  frictionAngle: number;          // Effective friction angle (degrees)
  slopeAngle: number;             // Slope angle (degrees)
  hydraulicConductivity: number;  // Permeability (m/s)
  coefficientOfVariation: number; // COV for reliability analysis
}

// ============================================================================
// Color Constants (from Appendix B)
// ============================================================================

export const TERRAIN_COLORS = {
  grassHealthy: new Color(0x4a7c23),  // #4a7c23
  grassDry: new Color(0x8b9a5b),      // #8b9a5b
  soilBrown: new Color(0x8b7355),     // #8b7355
  soilWet: new Color(0x5c4a3a),       // #5c4a3a
  rockGray: new Color(0x6b6b6b),      // #6b6b6b
  scarpExposed: new Color(0xd4c8b8),  // #d4c8b8
  bedrock: new Color(0x4a4a4a),       // #4a4a4a
} as const;

export const WATER_COLORS = {
  groundwater: new Color(0x2196F3),   // #2196F3, opacity 0.3
  surfaceWater: new Color(0x1976D2),  // #1976D2, opacity 0.5
  rainDrops: new Color(0x90CAF9),     // #90CAF9, opacity 0.6
  saturationTint: new Color(0x0D47A1), // #0D47A1, opacity 0.2
} as const;

export const STATUS_COLORS = {
  safe: new Color(0x22c55e),          // #22c55e, FoS > 1.5
  marginal: new Color(0xeab308),      // #eab308, FoS 1.2-1.5
  critical: new Color(0xf97316),      // #f97316, FoS 1.0-1.2
  failure: new Color(0xef4444),       // #ef4444, FoS < 1.0
} as const;

// ============================================================================
// Default Configuration Values (from spec)
// ============================================================================

const DEFAULT_TERRAIN_CONFIG: TerrainConfig = {
  width: 128,
  height: 128,
  worldScale: 100,
  maxElevation: 40,
  slopeAngle: 30,
  noiseOctaves: 4,
  noisePersistence: 0.5,
  noiseScale: 0.05,
  ridgeSharpness: 1.2,
};

const DEFAULT_SOIL_LAYERS: SoilLayer[] = [
  {
    name: 'Topsoil',
    thickness: 0.5,
    color: new Color(0x4a5d23),
    cohesion: 5,
    frictionAngle: 28,
    unitWeight: 16,
    saturatedWeight: 18,
    permeability: 1e-5,
    porosity: 0.4,
  },
  {
    name: 'Colluvium',
    thickness: 1.5,
    color: new Color(0x8b7355),
    cohesion: 10,
    frictionAngle: 30,
    unitWeight: 18,
    saturatedWeight: 20,
    permeability: 1e-6,
    porosity: 0.35,
  },
  {
    name: 'Weathered Rock',
    thickness: 3.0,
    color: new Color(0xa0937d),
    cohesion: 25,
    frictionAngle: 35,
    unitWeight: 20,
    saturatedWeight: 22,
    permeability: 1e-7,
    porosity: 0.25,
  },
  {
    name: 'Bedrock',
    thickness: Infinity,
    color: new Color(0x6b6b6b),
    cohesion: 100,
    frictionAngle: 40,
    unitWeight: 24,
    saturatedWeight: 25,
    permeability: 1e-9,
    porosity: 0.1,
  },
];

const DEFAULT_SOIL_PROFILE: SoilProfile = {
  layers: DEFAULT_SOIL_LAYERS,
  waterTable: 3.0,
};

const DEFAULT_SIMULATION_STATE: SimulationState = {
  status: 'stable',
  fos: 1.5,
  pof: 0,
  ru: 0.2,
  cohesion: 10,
  displacedVolume: 0,
  displacedParticles: 0,
  saturationDepth: 0,
  runoffRate: 0,
};

const DEFAULT_ENVIRONMENTAL_PARAMS: EnvironmentalParams = {
  vegetation: 0.7,
  erosion: 0.3,
  soilMoisture: 0.5,
  rainfall: 0,
  isRaining: false,
  isTriggered: false,
};

const DEFAULT_GEOTECHNICAL_PARAMS: GeotechnicalParams = {
  soilDepth: 3.0,
  unitWeight: 18,
  cohesion: 10,
  frictionAngle: 30,
  slopeAngle: 30,
  hydraulicConductivity: 1e-6,
  coefficientOfVariation: 0.2,
};

// ============================================================================
// Simulation Store
// ============================================================================

function createSimulationStore() {
  // Reactive state using Svelte 5 runes
  let terrain = $state<TerrainConfig>(structuredClone(DEFAULT_TERRAIN_CONFIG));
  let soilProfile = $state<SoilProfile>(structuredClone(DEFAULT_SOIL_PROFILE));
  let simulationState = $state<SimulationState>(structuredClone(DEFAULT_SIMULATION_STATE));
  let environmental = $state<EnvironmentalParams>(structuredClone(DEFAULT_ENVIRONMENTAL_PARAMS));
  let geotechnical = $state<GeotechnicalParams>(structuredClone(DEFAULT_GEOTECHNICAL_PARAMS));

  // Derived state
  const statusColor = $derived(() => {
    const fos = simulationState.fos;
    if (fos > 1.5) return STATUS_COLORS.safe;
    if (fos > 1.2) return STATUS_COLORS.marginal;
    if (fos >= 1.0) return STATUS_COLORS.critical;
    return STATUS_COLORS.failure;
  });

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Calculate Factor of Safety based on current parameters
   * Uses infinite slope analysis from physics module
   */
  function calculateFoS(): number {
    const { cohesion, frictionAngle, slopeAngle, unitWeight, soilDepth } = geotechnical;
    const { ru } = simulationState;

    // Calculate pore pressure from ru
    // ru = Pw / (γ·z·cos²θ), so Pw = ru · γ · z · cos²θ
    const thetaRad = (slopeAngle * Math.PI) / 180;
    const cos2Theta = Math.cos(thetaRad) * Math.cos(thetaRad);
    const porePressure = ru * unitWeight * soilDepth * cos2Theta;

    // Use physics module implementation
    return calculateFoSPhysics(
      { slopeAngle, soilDepth, unitWeight, cohesion, frictionAngle },
      porePressure
    );
  }

  /**
   * Calculate Probability of Failure using FOSM method
   * Uses reliability analysis from physics module
   */
  function calculatePoF(): number {
    const { coefficientOfVariation } = geotechnical;
    const fos = simulationState.fos;

    // Use physics module implementation
    return calculatePoFPhysics(fos, coefficientOfVariation);
  }

  /**
   * Update simulation status based on FoS
   */
  function updateStatus() {
    const fos = simulationState.fos;

    if (environmental.isTriggered || fos < 1.0) {
      simulationState.status = fos < 0.8 ? 'failed' : 'failing';
    } else if (fos < 1.2) {
      simulationState.status = 'critical';
    } else if (fos < 1.5) {
      simulationState.status = 'marginal';
    } else {
      simulationState.status = 'stable';
    }
  }

  /**
   * Calculate pore pressure ratio based on rainfall and water table
   */
  function updatePorePressure(deltaTime: number) {
    const { rainfall, soilMoisture } = environmental;
    const { hydraulicConductivity, soilDepth } = geotechnical;
    const { waterTable } = soilProfile;

    // Simplified infiltration model
    const infiltrationRate = Math.min(rainfall, hydraulicConductivity * 3600000); // mm/hr to m/s
    const saturationIncrease = (infiltrationRate / 1000) * deltaTime; // Convert to meters

    // Update saturation depth
    simulationState.saturationDepth = Math.min(
      simulationState.saturationDepth + saturationIncrease,
      soilDepth
    );

    // Calculate pore pressure ratio
    // ru = (γw · hw) / (γ · z)
    const hw = Math.max(0, soilDepth - waterTable + simulationState.saturationDepth);
    const z = soilDepth;
    const gammaW = 9.81; // kN/m³

    simulationState.ru = Math.min(0.5, (gammaW * hw) / (geotechnical.unitWeight * z));

    // Calculate runoff
    simulationState.runoffRate = Math.max(0, rainfall - infiltrationRate);
  }

  /**
   * Update all simulation metrics
   */
  function updateMetrics(deltaTime: number = 0) {
    // Update pore pressure based on rainfall
    if (environmental.isRaining && deltaTime > 0) {
      updatePorePressure(deltaTime);
    }

    // Recalculate FoS
    simulationState.fos = calculateFoS();

    // Update probability of failure
    simulationState.pof = calculatePoF();

    // Update status
    updateStatus();

    // Update effective cohesion (reduced by saturation)
    const saturationFactor = 1 - simulationState.ru * 0.5;
    simulationState.cohesion = geotechnical.cohesion * saturationFactor;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  return {
    // State getters (reactive)
    get terrain() { return terrain; },
    get soilProfile() { return soilProfile; },
    get simulationState() { return simulationState; },
    get environmental() { return environmental; },
    get geotechnical() { return geotechnical; },
    get statusColor() { return statusColor(); },

    // State setters
    setTerrain(config: Partial<TerrainConfig>) {
      terrain = { ...terrain, ...config };
    },

    setSoilProfile(profile: Partial<SoilProfile>) {
      soilProfile = { ...soilProfile, ...profile };
      updateMetrics();
    },

    setEnvironmental(params: Partial<EnvironmentalParams>) {
      environmental = { ...environmental, ...params };
      updateMetrics();
    },

    setGeotechnical(params: Partial<GeotechnicalParams>) {
      geotechnical = { ...geotechnical, ...params };
      updateMetrics();
    },

    // Actions
    startRain(intensity: number = 50) {
      environmental.rainfall = intensity;
      environmental.isRaining = true;
      updateMetrics();
    },

    stopRain() {
      environmental.rainfall = 0;
      environmental.isRaining = false;
      updateMetrics();
    },

    trigger() {
      environmental.isTriggered = true;
      simulationState.status = 'failing';
      updateMetrics();
    },

    reset() {
      terrain = structuredClone(DEFAULT_TERRAIN_CONFIG);
      soilProfile = structuredClone(DEFAULT_SOIL_PROFILE);
      simulationState = structuredClone(DEFAULT_SIMULATION_STATE);
      environmental = structuredClone(DEFAULT_ENVIRONMENTAL_PARAMS);
      geotechnical = structuredClone(DEFAULT_GEOTECHNICAL_PARAMS);
    },

    // Simulation step (call from animation loop)
    update(deltaTime: number) {
      updateMetrics(deltaTime);
    },

    // Utility
    getStatusColor() {
      return statusColor();
    },
  };
}

// ============================================================================
// Singleton Export
// ============================================================================

export const simulation = createSimulationStore();

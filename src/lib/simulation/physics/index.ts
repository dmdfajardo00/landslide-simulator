// Types
export type { PhysicsConstants, GeotechnicalParams, HydrologicalState, DebrisParticle } from './types';

// Infinite slope analysis
export { calculateFoS } from './infinite-slope';

// Pore pressure calculations
export { calculatePorePressure } from './pore-pressure';

// Infiltration modeling
export { updateInfiltration, calculateEvapotranspiration } from './infiltration';

// Reliability analysis
export { calculatePoF } from './reliability';

// Landslide dynamics (terrain deformation based)
export type { FailureZone, LandslideState, TerrainDeformation } from './landslide';
export {
	createLandslideState,
	calculateFailureZone,
	updateLandslideState,
	calculateTerrainDeformation,
	calculateDisplacedVolume
} from './landslide';

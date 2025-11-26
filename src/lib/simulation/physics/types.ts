export interface PhysicsConstants {
	waterUnitWeight: number; // 9.81 kN/m³
}

export interface GeotechnicalParams {
	slopeAngle: number; // degrees
	soilDepth: number; // m
	unitWeight: number; // kN/m³
	cohesion: number; // kPa
	frictionAngle: number; // degrees
	hydraulicConductivity: number; // m/s (×10⁻⁶)
}

export interface HydrologicalState {
	saturationDepth: number; // m
	porePressure: number; // kPa
	porePressureRatio: number; // ru (0-1)
	infiltrationRate: number; // mm/hr
}

export interface DebrisParticle {
	id: number;
	x: number; // World position X
	y: number; // World position Y (elevation)
	z: number; // World position Z
	vx: number; // Velocity X
	vy: number; // Velocity Y
	vz: number; // Velocity Z
	size: number; // Particle size (radius)
	type: 'rock' | 'soil';
	grounded: boolean; // Has particle stopped?
	lifetime: number; // Seconds since spawn
}

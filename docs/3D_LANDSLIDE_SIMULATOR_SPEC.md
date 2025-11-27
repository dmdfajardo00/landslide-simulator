# 3D Landslide Simulator - Technical Specification

## Overview

This document outlines the technical requirements and implementation plan for a physics-based 3D landslide simulator using Three.js (via Threlte) integrated with the existing SvelteKit application.

---

## 1. Visual Reference Analysis

### Reference Image 1: Real-World Landslide (Aerial View)
The first reference shows an aerial photograph of an actual rotational landslide on a mountainside:

- **Main Scarp**: Large white/cream exposed rock face at the crown of the landslide (headwall)
- **Failure Zone**: Spoon-shaped depression where material has displaced
- **Vegetation**: Lush green grass and scattered vegetation surrounding the scar
- **Secondary Erosion**: Multiple smaller erosion channels and debris flows
- **Toe/Runout**: Accumulated debris at the base of the slope
- **Infrastructure**: Roads/paths visible, showing scale and human context
- **Peak**: Mountain summit visible, establishing terrain relief

### Reference Image 2: 3D Cross-Section Model
The second reference shows a stylized 3D cutaway model demonstrating internal failure mechanics:

- **Cutaway View**: Reveals subsurface slip plane geometry
- **Slip Surface**: Curved, concave failure plane (cyan/blue) - classic rotational slide
- **Soil Stratification**: Multiple visible layers (topsoil, subsoil, bedrock)
- **Trees**: Scattered deciduous trees on the slope surface
- **Debris Field**: Rock and soil fragments accumulated at the toe
- **Water Table**: Groundwater visualization at slip surface interface
- **Stepped Terrain**: Terraced appearance from progressive failure blocks

---

## 2. Technical Architecture

### 2.1 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| 3D Renderer | Three.js via @threlte/core | WebGL rendering |
| Physics | @dimforge/rapier3d | Rigid body & particle physics |
| Framework | SvelteKit + Svelte 5 | Application shell |
| State | Svelte runes ($state, $derived) | Reactive simulation state |
| Shaders | GLSL (Three.js ShaderMaterial) | Custom terrain/water effects |

### 2.2 Core Modules

```
src/lib/
├── simulation/
│   ├── engine/
│   │   ├── SimulationEngine.ts      # Main simulation loop
│   │   ├── PhysicsWorld.ts          # Rapier3D integration
│   │   └── TimeController.ts        # Simulation time management
│   ├── terrain/
│   │   ├── TerrainGenerator.ts      # Procedural heightmap generation
│   │   ├── TerrainMesh.ts           # Three.js geometry builder
│   │   ├── SoilLayers.ts            # Stratified soil model
│   │   └── SlipSurface.ts           # Failure plane geometry
│   ├── physics/
│   │   ├── SlopeStability.ts        # FoS calculations (Limit Equilibrium)
│   │   ├── PoreWaterPressure.ts     # Groundwater/ru simulation
│   │   ├── MohrCoulomb.ts           # Shear strength calculations
│   │   └── ParticleSystem.ts        # Debris/soil particle physics
│   └── effects/
│       ├── RainSystem.ts            # Precipitation particles
│       ├── WaterFlow.ts             # Surface runoff visualization
│       └── DustCloud.ts             # Failure event dust effects
├── components/
│   └── viewport/
│       ├── Scene.svelte             # Main Threlte canvas
│       ├── Terrain.svelte           # Terrain mesh component
│       ├── SlipPlane.svelte         # Failure surface visualization
│       ├── Vegetation.svelte        # Instanced trees/grass
│       ├── Debris.svelte            # Displaced material
│       ├── Rain.svelte              # Rain particle system
│       └── CameraController.svelte  # Orbit/pan controls
```

---

## 3. Terrain System

### 3.1 Geometry Specifications

| Property | Value | Notes |
|----------|-------|-------|
| Grid Resolution | 128x128 vertices | Adjustable for performance |
| World Size | 100m x 100m | Realistic scale |
| Max Elevation | 40m | Peak height |
| Slope Angle | 20-45° | Configurable via UI |
| Vertex Density | ~1.6 verts/m² | Balance detail vs. performance |

### 3.2 Heightmap Generation

```typescript
interface TerrainConfig {
  width: number;           // Grid width in vertices
  height: number;          // Grid height in vertices
  worldScale: number;      // Meters per unit
  maxElevation: number;    // Peak height in meters
  slopeAngle: number;      // Primary slope angle (degrees)
  noiseOctaves: number;    // Fractal noise layers
  noisePersistence: number; // Amplitude decay per octave
  noiseScale: number;      // Base frequency
  ridgeSharpness: number;  // Mountain ridge definition
}
```

**Generation Algorithm:**
1. Base slope plane at configured angle
2. Simplex noise overlay for natural variation
3. Ridge enhancement using absolute noise values
4. Erosion channels via hydraulic erosion simulation
5. Smooth blending at boundaries

### 3.3 Soil Layer Model

```typescript
interface SoilProfile {
  layers: SoilLayer[];
  waterTable: number;  // Depth from surface (m)
}

interface SoilLayer {
  name: string;              // "Topsoil", "Clay", "Bedrock"
  thickness: number;         // Layer thickness (m)
  color: THREE.Color;        // Visual representation
  cohesion: number;          // c' (kPa)
  frictionAngle: number;     // φ' (degrees)
  unitWeight: number;        // γ (kN/m³)
  saturatedWeight: number;   // γ_sat (kN/m³)
  permeability: number;      // k (m/s)
  porosity: number;          // n (0-1)
}
```

**Default Layers:**
| Layer | Depth | Color | c' (kPa) | φ' (°) | γ (kN/m³) |
|-------|-------|-------|----------|--------|-----------|
| Topsoil | 0-0.5m | #4a5d23 (dark green) | 5 | 28 | 16 |
| Colluvium | 0.5-2m | #8b7355 (brown) | 10 | 30 | 18 |
| Weathered Rock | 2-5m | #a0937d (tan) | 25 | 35 | 20 |
| Bedrock | 5m+ | #6b6b6b (gray) | 100+ | 40 | 24 |

---

## 4. Slip Surface Modeling

### 4.1 Failure Geometry Types

**Rotational Slide (Primary):**
- Circular arc failure surface
- Classic "spoon-shaped" geometry
- Suitable for homogeneous soils

**Translational Slide (Secondary):**
- Planar failure surface
- Parallel to slope face
- For thin soil over bedrock

### 4.2 Slip Surface Generation

```typescript
interface SlipSurface {
  type: 'rotational' | 'translational' | 'compound';
  center: THREE.Vector3;    // Arc center (rotational)
  radius: number;           // Arc radius (rotational)
  entryPoint: THREE.Vector3; // Crown/scarp location
  exitPoint: THREE.Vector3;  // Toe location
  slices: SlipSlice[];      // Method of slices discretization
}

interface SlipSlice {
  index: number;
  width: number;            // Slice width (m)
  height: number;           // Slice height at center (m)
  baseAngle: number;        // Inclination of slice base (°)
  weight: number;           // Slice weight (kN/m)
  normalForce: number;      // N (kN/m)
  shearForce: number;       // S (kN/m)
  poreWaterForce: number;   // U (kN/m)
}
```

### 4.3 Visualization

The slip surface should be rendered as:
- Semi-transparent curved surface (cyan/blue, opacity 0.3-0.5)
- Visible in cross-section cutaway mode
- Animated pulsing when FoS approaches critical
- Color gradient: blue (stable) → yellow → red (failure)

---

## 5. Physics Simulation

### 5.1 Slope Stability Analysis

**Method:** Simplified Bishop Method (circular arc)

```
FoS = Σ[c'·b + (W - u·b)·tan(φ')] / [cos(α) + sin(α)·tan(φ')/FoS]
      ────────────────────────────────────────────────────────────
                          Σ[W·sin(α)]
```

Where:
- c' = effective cohesion (kPa)
- b = slice width (m)
- W = slice weight (kN/m)
- u = pore water pressure (kPa)
- φ' = effective friction angle (°)
- α = slice base inclination (°)

### 5.2 Pore Water Pressure Model

```typescript
interface PoreWaterModel {
  rainfallIntensity: number;     // mm/hr
  infiltrationRate: number;      // mm/hr (function of soil)
  waterTableDepth: number;       // m below surface
  poreWaterRatio: number;        // ru = u/(γ·z)
  saturationFront: number;       // Depth of wetting front (m)
}
```

**ru Calculation:**
```
ru = (γw · hw) / (γ · z)
```
Where:
- γw = unit weight of water (9.81 kN/m³)
- hw = height of water above slip surface
- γ = soil unit weight
- z = depth to slip surface

### 5.3 Failure Triggering

```typescript
interface FailureState {
  status: 'stable' | 'marginal' | 'critical' | 'failing' | 'failed';
  fos: number;
  fosHistory: number[];          // Time series
  criticalSlice: number;         // First slice to fail
  displacementRate: number;      // m/s during failure
  totalDisplacement: number;     // Cumulative (m)
  debrisVolume: number;          // m³ of displaced material
}
```

**Failure Sequence:**
1. FoS drops below 1.0
2. Progressive failure initiates at critical slice
3. Shear band propagates along slip surface
4. Mass begins accelerating downslope
5. Material disaggregates into debris
6. Debris flows/deposits at toe

---

## 6. Particle Systems

### 6.1 Rain Particles

```typescript
interface RainConfig {
  intensity: number;          // Particles per frame
  dropSize: number;           // Visual size
  fallSpeed: number;          // m/s
  windAngle: number;          // Lateral drift (degrees)
  splashOnImpact: boolean;    // Spawn splash particles
  bounds: THREE.Box3;         // Rain volume bounds
}
```

**Implementation:**
- Use THREE.Points with BufferGeometry
- GPU instancing for performance
- Shader-based animation (no CPU position updates)
- Streak effect via vertex shader

### 6.2 Debris Particles

```typescript
interface DebrisConfig {
  particleCount: number;      // Max active particles
  sizes: [number, number];    // Min/max size range (m)
  colors: THREE.Color[];      // Soil/rock colors
  friction: number;           // Ground friction coefficient
  restitution: number;        // Bounce factor
  cohesionForce: number;      // Inter-particle attraction
}
```

**Physics Integration:**
- Rapier3D rigid bodies for large debris (>0.5m)
- GPU particle system for small debris (<0.5m)
- Collision detection with terrain mesh
- Debris accumulation at toe zone

### 6.3 Dust/Smoke Effects

```typescript
interface DustConfig {
  emissionRate: number;       // Particles/second during failure
  lifetime: number;           // Particle lifetime (s)
  size: [number, number];     // Start/end size
  opacity: [number, number];  // Start/end opacity
  riseSpeed: number;          // Vertical velocity
  spreadRate: number;         // Horizontal dispersion
}
```

---

## 7. Visual Effects & Shaders

### 7.1 Terrain Shader

```glsl
// Terrain fragment shader features:
- Slope-based texture blending (grass → rock → scarp)
- Tri-planar mapping to avoid stretching
- Wetness darkening based on soil moisture
- Ambient occlusion in crevices
- Normal mapping for surface detail
- Displacement mapping for micro-relief
```

**Texture Layers:**
| Surface Type | Slope Angle | Moisture | Texture |
|--------------|-------------|----------|---------|
| Grass | 0-25° | Low | Green grass with variation |
| Dirt | 25-40° | Any | Brown soil/dirt |
| Rock | 40-60° | Any | Gray exposed rock |
| Scarp | >60° | Any | White/cream exposed face |
| Wet Soil | Any | High | Darkened, saturated look |

### 7.2 Water Effects

```glsl
// Groundwater visualization:
- Subsurface blue tint near water table
- Surface water flow (runoff channels)
- Seepage at slope face
- Ponding at toe

// Implementation:
- Screen-space water accumulation
- Flow direction from terrain gradient
- Fresnel reflection at water surfaces
```

### 7.3 Cross-Section Cutaway

```typescript
interface CutawayConfig {
  enabled: boolean;
  planeNormal: THREE.Vector3;  // Cut plane orientation
  planePosition: number;        // Distance from center
  showSlipSurface: boolean;
  showSoilLayers: boolean;
  showWaterTable: boolean;
  capMaterial: THREE.Material;  // Material for cut face
}
```

**Implementation:**
- Stencil buffer technique for clean cuts
- Cap geometry generation for cut faces
- Soil layer coloring on exposed sections
- Animated plane position for reveal effect

---

## 8. Vegetation System

### 8.1 Tree Placement

```typescript
interface VegetationConfig {
  treeCount: number;           // Total trees to place
  treeDensity: number;         // Trees per 100m²
  minSlope: number;            // Don't place on steep slopes
  maxSlope: number;            // Slope angle limit (degrees)
  avoidSlipZone: boolean;      // Exclude failure area
  types: TreeType[];           // Available tree models
  scaleRange: [number, number]; // Size variation
}

interface TreeType {
  model: 'deciduous' | 'conifer' | 'shrub';
  probability: number;         // Spawn weight
  baseScale: number;           // Default size
}
```

**Implementation:**
- THREE.InstancedMesh for performance
- Billboard sprites for distant trees (LOD)
- Wind animation via vertex shader
- Trees tilt/fall during failure event

### 8.2 Grass Coverage

```typescript
interface GrassConfig {
  bladeDensity: number;        // Blades per m²
  bladeHeight: [number, number]; // Height range
  windStrength: number;        // Sway amplitude
  windFrequency: number;       // Sway speed
  color: THREE.Color;          // Base grass color
  variation: number;           // Color variation amount
}
```

**Implementation:**
- Geometry instancing with GPU animation
- Height-based density (less at higher elevations)
- Excluded from landslide scar area
- Progressive removal during failure

---

## 9. Camera & Controls

### 9.1 Camera Modes

| Mode | Description | Controls |
|------|-------------|----------|
| Orbit | Rotate around terrain center | Click + drag |
| Pan | Translate view laterally | Right-click + drag |
| Zoom | Dolly in/out | Scroll wheel |
| First Person | Walk-through mode | WASD + mouse |
| Preset Views | Top, Side, Isometric | UI buttons |

### 9.2 Camera Configuration

```typescript
interface CameraConfig {
  fov: number;                 // Field of view (degrees)
  near: number;                // Near clip plane
  far: number;                 // Far clip plane
  initialPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  minDistance: number;         // Min zoom distance
  maxDistance: number;         // Max zoom distance
  minPolarAngle: number;       // Prevent going below ground
  maxPolarAngle: number;       // Limit vertical rotation
  enableDamping: boolean;      // Smooth camera movement
  dampingFactor: number;       // Damping amount
}
```

### 9.3 Cinematic Sequences

```typescript
interface CameraSequence {
  name: string;
  keyframes: CameraKeyframe[];
  duration: number;            // Total duration (s)
  easing: 'linear' | 'easeInOut' | 'easeIn' | 'easeOut';
}

interface CameraKeyframe {
  time: number;                // Time offset (s)
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov?: number;
}
```

**Preset Sequences:**
- "Overview": Sweeping establishing shot
- "Failure Event": Track debris flow
- "Cross-Section Reveal": Animate cutaway plane
- "Before/After": Compare pre/post failure

---

## 10. UI Integration

### 10.1 Parameter Binding

Map existing Sidebar parameters to simulation:

| UI Parameter | Simulation Variable | Effect |
|--------------|---------------------|--------|
| Vegetation Cover | vegetationDensity | Trees, grass coverage, root cohesion |
| Soil Erosion Level | erosionFactor | Terrain surface roughness, channels |
| Initial Soil Moisture | initialSaturation | Starting pore pressure |
| Rainfall Intensity | rainRate | Rain particles, infiltration rate |
| Soil Depth | soilThickness | Layer depths, slip surface depth |
| Unit Weight | soilUnitWeight | FoS calculation input |
| Cohesion | effectiveCohesion | Shear strength parameter |
| Friction Angle | frictionAngle | Shear strength parameter |
| Slope Angle | slopeAngle | Terrain generation, FoS |
| Hydraulic Conductivity | permeability | Infiltration, drainage rate |
| Coefficient of Variation | covFactor | Reliability/probability analysis |

### 10.2 Real-Time Metrics

Update MetricsPanel with live simulation values:

```typescript
interface SimulationMetrics {
  fos: number;                 // Current factor of safety
  pof: number;                 // Probability of failure (%)
  ru: number;                  // Pore pressure ratio
  cohesion: number;            // Effective cohesion (kPa)
  displacedVolume: number;     // Debris volume (m³)
  displacedParticles: number;  // Particle count
  saturationDepth: number;     // Wetting front depth (m)
  runoffRate: number;          // Surface water (mm/hr)
}
```

### 10.3 Action Button Functions

| Button | Simulation Action |
|--------|-------------------|
| Start Rain | Begin precipitation, start infiltration model |
| Stop Rain | End precipitation, begin drainage |
| Trigger | Force failure initiation (bypass FoS threshold) |
| Reset | Restore initial terrain, reset all parameters |

---

## 11. Performance Optimization

### 11.1 Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Frame Rate | 60 FPS | Desktop browsers |
| Frame Rate | 30 FPS | Mobile/tablet |
| Memory | <512 MB | GPU memory |
| Load Time | <5s | Initial scene |
| Physics Step | 16ms | Fixed timestep |

### 11.2 Optimization Strategies

**Geometry:**
- Level of Detail (LOD) for terrain
- Frustum culling
- Occlusion culling for vegetation
- Geometry instancing for trees/debris

**Rendering:**
- Deferred rendering for complex lighting
- Shadow map caching (static shadows)
- Post-processing at reduced resolution
- Adaptive quality based on frame rate

**Physics:**
- Spatial partitioning (broad phase)
- Sleep inactive rigid bodies
- Simplify collision meshes
- Batch physics updates

**Particles:**
- GPU-based particle simulation
- Pool particle objects
- Distance-based culling
- Reduce count on mobile

### 11.3 Quality Presets

```typescript
type QualityLevel = 'low' | 'medium' | 'high' | 'ultra';

interface QualityPreset {
  terrainResolution: number;   // Vertices
  shadowMapSize: number;       // Pixels
  particleCount: number;       // Max particles
  vegetationDensity: number;   // Multiplier
  postProcessing: boolean;     // Enable effects
  antiAliasing: 'none' | 'fxaa' | 'msaa';
}
```

---

## 12. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Threlte canvas in ViewportPlaceholder
- [ ] Implement basic terrain heightmap generation
- [ ] Add orbit camera controls
- [ ] Create terrain mesh with simple texturing
- [ ] Connect camera to existing UI

### Phase 2: Terrain & Visuals (Week 3-4)
- [ ] Implement procedural terrain generation
- [ ] Add slope-based texture blending
- [ ] Create soil layer visualization
- [ ] Implement cross-section cutaway
- [ ] Add basic lighting (sun, ambient)

### Phase 3: Vegetation (Week 5)
- [ ] Implement tree instancing system
- [ ] Add tree placement algorithm
- [ ] Create grass shader with wind
- [ ] Add LOD system for vegetation

### Phase 4: Water & Weather (Week 6-7)
- [ ] Implement rain particle system
- [ ] Add water table visualization
- [ ] Create surface runoff effect
- [ ] Connect rainfall UI to simulation

### Phase 5: Physics & Stability (Week 8-9)
- [ ] Implement slope stability calculations
- [ ] Create slip surface geometry
- [ ] Add pore pressure model
- [ ] Connect geotechnical parameters
- [ ] Real-time FoS updates

### Phase 6: Failure Simulation (Week 10-11)
- [ ] Implement failure triggering logic
- [ ] Create debris particle system
- [ ] Add progressive failure animation
- [ ] Implement debris physics
- [ ] Add dust/smoke effects

### Phase 7: Polish & Integration (Week 12)
- [ ] Performance optimization
- [ ] Quality presets
- [ ] Camera presets/sequences
- [ ] Final UI integration
- [ ] Testing & bug fixes

---

## 13. Dependencies

### Current (package.json)
```json
{
  "@threlte/core": "^8.3.0",
  "@dimforge/rapier3d": "^0.19.3",
  "three": "^0.181.2"
}
```

### Additional Required
```json
{
  "@threlte/extras": "^8.x",      // Helpers, controls, loaders
  "@threlte/rapier": "^2.x",      // Rapier physics integration
  "simplex-noise": "^4.x",        // Terrain generation
  "three-stdlib": "^2.x"          // Additional Three.js utilities
}
```

---

## 14. File Structure (Final)

```
src/lib/
├── simulation/
│   ├── engine/
│   │   ├── SimulationEngine.ts
│   │   ├── PhysicsWorld.ts
│   │   └── TimeController.ts
│   ├── terrain/
│   │   ├── TerrainGenerator.ts
│   │   ├── TerrainMesh.ts
│   │   ├── SoilLayers.ts
│   │   ├── SlipSurface.ts
│   │   └── Heightmap.ts
│   ├── physics/
│   │   ├── SlopeStability.ts
│   │   ├── PoreWaterPressure.ts
│   │   ├── MohrCoulomb.ts
│   │   ├── FailureModel.ts
│   │   └── ParticleSystem.ts
│   ├── effects/
│   │   ├── RainSystem.ts
│   │   ├── WaterFlow.ts
│   │   ├── DustCloud.ts
│   │   └── Vegetation.ts
│   └── shaders/
│       ├── terrain.vert
│       ├── terrain.frag
│       ├── water.vert
│       ├── water.frag
│       ├── grass.vert
│       └── particles.vert
├── components/
│   └── viewport/
│       ├── Scene.svelte
│       ├── Terrain.svelte
│       ├── SlipPlane.svelte
│       ├── Vegetation.svelte
│       ├── Trees.svelte
│       ├── Grass.svelte
│       ├── Debris.svelte
│       ├── Rain.svelte
│       ├── Water.svelte
│       ├── Lighting.svelte
│       ├── Sky.svelte
│       └── CameraController.svelte
└── stores/
    └── simulation.ts              # Global simulation state
```

---

## 15. Success Criteria

### Functional Requirements
- [ ] Terrain renders with realistic appearance
- [ ] Rain system activates/deactivates via UI
- [ ] Slope stability (FoS) calculates in real-time
- [ ] Metrics panel updates live during simulation
- [ ] Failure can be triggered manually or automatically
- [ ] Debris flows downslope during failure
- [ ] Reset restores initial state completely

### Visual Requirements
- [ ] Cross-section cutaway reveals slip surface
- [ ] Soil layers visible in cutaway
- [ ] Trees/vegetation populate the slope
- [ ] Rain particles visible during precipitation
- [ ] Dust/debris visible during failure
- [ ] Water table/saturation visualized

### Performance Requirements
- [ ] 60 FPS on modern desktop
- [ ] 30 FPS on tablet/laptop
- [ ] <5 second initial load
- [ ] Smooth camera controls
- [ ] No frame drops during failure event

---

## Appendix A: Geotechnical Formulas

### Factor of Safety (Bishop Simplified)

```
FoS = Σ[c'·l + (N - U)·tan(φ')] / Σ[W·sin(α)]
```

### Pore Pressure Ratio

```
ru = u / (γ·z) = (γw·hw) / (γ·z)
```

### Probability of Failure (FOSM)

```
β = (E[FoS] - 1) / σ[FoS]
Pf = Φ(-β)
```

### Mohr-Coulomb Failure Criterion

```
τf = c' + σn'·tan(φ')
```

Where:
- τf = shear strength at failure
- c' = effective cohesion
- σn' = effective normal stress
- φ' = effective friction angle

---

## Appendix B: Color Palette

### Terrain Colors
| Element | Hex | RGB |
|---------|-----|-----|
| Grass (healthy) | #4a7c23 | 74, 124, 35 |
| Grass (dry) | #8b9a5b | 139, 154, 91 |
| Soil (brown) | #8b7355 | 139, 115, 85 |
| Soil (wet) | #5c4a3a | 92, 74, 58 |
| Rock (gray) | #6b6b6b | 107, 107, 107 |
| Scarp (exposed) | #d4c8b8 | 212, 200, 184 |
| Bedrock | #4a4a4a | 74, 74, 74 |

### Water Colors
| Element | Hex | Opacity |
|---------|-----|---------|
| Groundwater | #2196F3 | 0.3 |
| Surface water | #1976D2 | 0.5 |
| Rain drops | #90CAF9 | 0.6 |
| Saturation tint | #0D47A1 | 0.2 |

### Status Colors
| Status | Hex | Usage |
|--------|-----|-------|
| Safe | #22c55e | FoS > 1.5 |
| Marginal | #eab308 | FoS 1.2-1.5 |
| Critical | #f97316 | FoS 1.0-1.2 |
| Failure | #ef4444 | FoS < 1.0 |

---

*Document Version: 1.0*
*Last Updated: 2025-01-26*
*Author: Claude Code Assistant*

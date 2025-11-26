# Landslide Dynamics Simulator

An interactive 3D landslide simulation built with **SvelteKit**, **Threlte** (Three.js for Svelte), and **Tailwind CSS**.

## Overview

This simulator provides real-time visualization of slope stability analysis with physics-based modeling, including:

- **Factor of Safety (FoS)** calculations using infinite slope method
- **Pore water pressure dynamics** and infiltration modeling
- **Probability of Failure (PoF)** using probabilistic reliability theory
- **Real-time particle physics** for soil, debris, and vegetation
- **Interactive parameter controls** with immediate visual feedback

## Features

- ✅ **3D Terrain Visualization** - Explorable slopes with proper depth perception
- ✅ **Real-time Physics** - Continuous FoS, pore pressure, and saturation calculations
- ✅ **Particle Systems** - Rain, soil particles, vegetation, and debris with GPU acceleration
- ✅ **Interactive Controls** - Sliders for all geotechnical and environmental parameters
- ✅ **Visual Clarity** - Clear rain effects, visible vegetation, dynamic terrain saturation

## User-Controlled Parameters

### Core Variables

**A. Slope Geometry**
- θ = Slope angle (°)
- H = Soil layer thickness (m)

**B. Soil Properties**
- c = Cohesion (kPa)
- φ = Internal friction angle (°)
- γ = Unit weight of soil (kN/m³)
- k = Hydraulic conductivity (m/s)

**C. Hydrological Factors**
- I = Rainfall intensity (mm/hr)
- T = Rainfall duration
- Pw = Pore-water pressure (kPa)
- S = Saturation (%)

**D. Vegetation**
- Veg = Vegetation cover (%)

## Tech Stack

- **Framework**: SvelteKit (Svelte 5 with runes)
- **3D Engine**: Threlte + Three.js
- **Physics**: Rapier3D
- **Styling**: Tailwind CSS
- **Icons**: Iconify

## Project Structure

```
landslide-simulator/
├── src/
│   ├── lib/
│   │   ├── components/     # UI controls and components
│   │   ├── scene/          # 3D scene components (terrain, particles, camera)
│   │   ├── physics/        # FoS, PWP, and physics calculations
│   │   ├── shaders/        # Custom GLSL shaders for particles
│   │   └── utils/          # Shared utilities and types
│   ├── routes/
│   │   ├── +layout.svelte  # Root layout with CSS imports
│   │   └── +page.svelte    # Main simulator page
│   └── app.css             # Tailwind directives
├── CLAUDE.md               # AI agent workflow guide
└── README.md               # This file
```

## Getting Started

### Prerequisites

- Node.js 20+ (Note: Some dependencies require Node 22+)
- npm or pnpm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Development Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Basic 3D terrain with slope angle control
- [ ] Tailwind UI with parameter sliders
- [ ] Camera controls (orbit, zoom, pan)

### Phase 2: Physics Engine (Week 2)
- [ ] Factor of Safety calculations
- [ ] Pore water pressure modeling
- [ ] Infiltration rate calculations
- [ ] Rapier physics integration

### Phase 3: Particle Systems (Week 3)
- [ ] Rain particles (instanced rendering)
- [ ] Soil/debris particles with physics
- [ ] Vegetation (trees with instancing)
- [ ] GPU-based particle optimization

### Phase 4: Polish & Effects (Week 4)
- [ ] Post-processing (bloom, depth of field)
- [ ] Saturation visualization (color gradients)
- [ ] Landslide triggering based on FoS
- [ ] Performance optimization

## Contributing

This is an educational project. Contributions are welcome!

## License

MIT

## Acknowledgments

- Based on geotechnical engineering principles for landslide analysis
- Inspired by the need for clearer educational visualizations of slope stability

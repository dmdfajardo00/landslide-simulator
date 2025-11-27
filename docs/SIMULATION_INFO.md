# Simulation Information

## Auto-Trigger System

The simulator automatically kicks off a landslide when conditions get bad enough. Here's when that happens:

**Factor of Safety (FoS) drops below 1.0**: At this point, the slope's resisting forces can no longer support the driving forces. The math says failure has to happen.

**Probability of Failure (PoF) exceeds 50%**: When there's more than a 50% chance of failure based on your parameter uncertainties, things are about to go.

Why does this matter? Rain increases pore pressure based on actual infiltration physics. That pressure gradually reduces soil strength until you hit one of those trigger points. Just like real landslides - things don't just randomly fail. They fail because the physics demands it.

## Time Acceleration

We speed everything up by 300× - meaning one real second in the simulator equals about 5 simulated minutes.

**Why do we do this?** Real landslides can take hours or days of continuous rainfall to develop. Without time acceleration, you'd need to sit here watching for literal hours to see anything interesting happen. Nobody has time for that.

**Important note:** This acceleration uses calibration based on field observations. It's designed to help you understand cause-and-effect relationships, not to make precise quantitative predictions about actual slopes. Think of it as a teaching tool, not a forecasting tool.

## Important Limitations

This simulator simplifies a lot of real-world complexity. Know what you're getting:

### Time Acceleration
We run things at 300× speed. Don't use this to predict exactly how long a real slope will take to fail. Use it to understand the relationships between factors.

### Simplified Infiltration
We don't use the full Green-Ampt infiltration equations (which are complicated as hell). Instead, we assume uniform wetting front progression. Real soil doesn't always work that way - it gets weird with preferential flow paths and stuff.

### Homogeneous Soil
Real slopes have multiple layers with different properties. This simulator assumes the soil is basically the same all the way down. Most slopes aren't like that.

### 2D Analysis Only
We ignore 3D effects. Real slopes have lateral water flow, out-of-plane forces, and varying properties in the horizontal direction. We treat everything as if it only varies up and down the slope.

### FOSM Simplification
The First-Order Second-Moment method technically should propagate uncertainty through each individual parameter (cohesion, friction angle, etc.). We simplify by applying uncertainty directly to FoS. It's a shortcut that works reasonably well for teaching.

### No Progressive Failure
We assume everything fails at once across the whole zone. In reality, failure often starts in one spot and spreads. Our model doesn't capture that.

### Vegetation Simplified
Real root systems change over time, decay seasonally, and vary by plant species. We just use a static percentage. It's a huge simplification.

## When This Model Actually Works

The infinite slope model you're using is actually pretty solid when:

- The slope angle is less than the friction angle (slope isn't steeper than physics allows)
- The slope is way longer than it is thick (at least 25 times longer)
- The soil properties stay pretty consistent
- Water flows parallel to the slope surface
- The failure surface stays parallel to the slope

When these conditions hold, you get a good answer. When they don't, don't trust it.

## Educational Purpose

This simulator teaches you concepts:

- How different factors interact to affect slope stability
- The relationships between rainfall, pore pressure, and landslides
- What Factor of Safety and probability-based risk assessment actually mean
- Why vegetation and erosion control matter for keeping slopes from failing

**What it's NOT for:** Real engineering design, actual hazard assessment, or site-specific predictions. If you're designing something real, you talk to actual geotechnical engineers. This is for understanding the concepts.

# Formulas & Theory

## Factor of Safety (FoS)

Here's the main equation that makes everything work:

```
FoS = [c'_eff + (γz cos²β - u)tan φ'_eff] / [γz sinβ cosβ]
```

**What each part means:**

- **c'_eff** = effective cohesion (kPa) - the soil's internal strength
- **γ** = unit weight of soil (kN/m³) - basically how heavy the soil is
- **z** = soil depth (m) - how thick your soil layer is
- **β** = slope angle (degrees) - how steep we're talking
- **u** = pore water pressure (kPa) - water pressure between soil particles
- **φ'_eff** = effective friction angle (degrees) - how much friction the soil has

The top part (numerator) is your resisting forces - everything keeping the slope from sliding. The bottom part (denominator) is your driving forces - everything pushing the slope downhill. When you divide them, you get FoS.

## Vegetation Effect on Cohesion

Vegetation doesn't just look nice - it actually changes the soil's strength. We calculate it like this:

```
c'_eff = c'_0 × (1 + 0.15V) × (1 - 0.55E)
```

**Breaking it down:**

- **c'_0** = base cohesion (your starting point)
- **V** = vegetation cover (0 to 1, where 1 is 100% coverage)
- **E** = erosion level (0 to 1, where 1 is 100% erosion)

What you're looking at here: vegetation adds about 15% more strength (those roots do work), but erosion removes about 55% (damaged soil is way weaker). When you combine them, you get your effective cohesion.

## Pore Pressure Ratio (ru)

This one tells you how saturated your soil is over time as rain falls:

```
ru(t) = ru_0 + [min(I,k)·t]/(n·z) · f(k)
```

**The pieces:**

- **ru_0** = what the soil started at (0 to 1, moisture-wise)
- **I** = rainfall intensity (mm/hr)
- **k** = hydraulic conductivity (m/s) - how fast water moves through soil
- **n** = porosity (about 0.35 for most soils)
- **f(k)** = permeability factor

Here's the key insight: water infiltration depends on whichever is smaller - the rain or how fast the soil can actually absorb water. You can't force more water in than the soil can handle. As ru increases, your soil gets weaker because all that water pressure reduces friction.

## Probability of Failure (PoF)

We use the First-Order Second-Moment method, which sounds fancy but basically accounts for uncertainty:

```
β = (μ_FoS - 1) / σ_FoS
PoF = Φ(-β)

where σ_FoS = CoV × μ_FoS
```

**What's going on:**

- **Φ** = standard normal CDF (the bell curve probability thing)
- **μ_FoS** = mean factor of safety (your average FoS)
- **σ_FoS** = standard deviation of FoS
- **CoV** = coefficient of variation (uncertainty in measurements)

Why do we do this? Because you never measure soil properties perfectly. Every time you test soil, you get slightly different values. This equation accounts for that reality and gives you a probability instead of just one number.

## Mohr-Coulomb Criterion

This is the basic failure rule for soil:

```
τ_f = c' + σ' × tan(φ')
```

**What this means:**

- **τ_f** = maximum shear strength (how hard the soil can resist sliding)
- **c'** = cohesion (internal strength)
- **σ'** = effective normal stress (weight pressing down)
- **tan(φ')** = friction component

A slope fails when the actual stress trying to make it slide exceeds this shear strength. That's it. Everything else in geotechnical engineering basically comes down to this simple relationship.

## Infinite Slope Assumptions

This simulator uses something called the "infinite slope" model, which works really well for certain situations. But it's only valid when these conditions are met:

- **Slope length >> soil depth** (ratio of at least 25:1) - the slope needs to be way longer than it is thick
- **Uniform soil properties** - same soil throughout, not layered
- **Parallel failure surface** - soil slides along a surface parallel to the slope
- **Slope angle less than friction angle** (β < φ') - the slope isn't steeper than the friction can handle
- **Parallel seepage** - water flows downhill, parallel to the slope surface

When these conditions hold, the infinite slope model gives you a really good answer. When they don't, you need more complex models (which are overkill for learning anyway).

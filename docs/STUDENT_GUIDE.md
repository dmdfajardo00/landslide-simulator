# Student Guide

## What is This Simulator?

You're looking at a tool that helps you understand landslides - basically when soil on a slope gets unstable and slides downhill. You'll see firsthand how different factors like rain, vegetation, and soil properties affect whether a slope stays put or falls apart.

## Environmental Factors (What You Can Change)

### Vegetation Cover

Plants and trees on the slope act like natural anchors - their roots literally hold soil together.

- **High vegetation (70-100%)**: The slope stays way more stable because roots bind the soil together
- **Low vegetation (0-30%)**: The slope becomes unstable fast - soil basically wants to move

### Soil Erosion Level

This tells you how much the soil has been worn away by weather and time.

- **Low erosion (0-20%)**: Your soil is strong and stays cohesive
- **High erosion (60-100%)**: Your soil becomes weak and crumbly - think of it as already damaged

### Initial Soil Moisture

How wet the soil already is before you even start the rain.

- **Dry soil (0-30%)**: Can absorb way more water initially before saturating
- **Wet soil (60-100%)**: Already saturated, so adding rain pressure happens fast

### Rainfall Intensity

How hard it's raining in millimeters per hour.

- **Light rain (0-20 mm/hr)**: Water soaks in slowly
- **Heavy rain (60-100 mm/hr)**: Soil saturates fast, which jacks up your failure risk

## What the Numbers Mean

### Factor of Safety (FoS)

Think of this as your "strength score" - basically how much stronger the soil is compared to what it actually needs to be.

- **FoS ≥ 1.5**: Safe - your slope isn't going anywhere
- **FoS = 1.0-1.5**: Getting sketchy - you're in the danger zone
- **FoS < 1.0**: Landslide is happening - the slope can't hold up

### Probability of Failure (PoF)

The actual percentage chance that a landslide will happen. This accounts for the fact that we never measure things perfectly.

- **PoF < 5%**: Pretty much not gonna happen
- **PoF = 20-50%**: Real chance it fails
- **PoF > 50%**: Yeah, it's probably gonna fail

### Pore Pressure Ratio (ru)

This measures the water pressure between soil particles. The more water pressure, the weaker your soil becomes.

- **ru = 0-0.3**: Soil is relatively dry, pretty stable
- **ru = 0.5-0.7**: Getting saturated, soil is getting weaker
- **ru > 0.8**: Basically waterlogged - failure is coming

## How to Use the Simulator

1. **Start with defaults**: Click "Reset" for safe starting conditions
2. **Adjust one factor**: Try cranking up erosion or dropping vegetation
3. **Watch the numbers**: See FoS and PoF change in real-time as you adjust
4. **Start rain**: Click "Start Rain" and watch water infiltrate the soil
5. **Observe failure**: When things get bad enough, the landslide triggers automatically
6. **Experiment**: Reset and try different combinations to see what matters most

## Experiment Ideas

### Experiment 1: Role of Vegetation

Set vegetation to 80%, start rain, and watch FoS. Then reset, set vegetation to 10%, and start rain again. You'll see how much faster FoS drops without those roots holding everything together.

### Experiment 2: Rainfall Effect

Keep everything at defaults. Try light rain (10 mm/hr) versus heavy rain (80 mm/hr). Which one triggers failure faster? Spoiler: you'll see a huge difference.

### Experiment 3: Combined Factors

Create the worst-case scenario: high erosion (80%), low vegetation (10%), high moisture (70%), and heavy rain (80%). How long does it take until failure? This shows you how multiple bad factors stack on each other.

## About Time Acceleration

Real landslides can take hours or days of rain before they actually fail. We speed up time by 300× so you can see what happens in minutes instead of waiting around. One second you watch here equals about 5 minutes of real time in the simulation.

This matters because it lets you actually see cause-and-effect relationships without sitting there for hours. Pretty useful for learning how this stuff works.

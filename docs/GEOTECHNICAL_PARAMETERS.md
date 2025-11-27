# Geotechnical Parameters

## Soil and Slope Properties

These are the technical parameters that define what your soil and slope actually are. Only mess with these if you actually understand geotechnical engineering - otherwise stick with the environmental factors.

## Parameter Inputs

### Soil Depth z (meters)

- **Default**: 3.0 m
- **Range**: 0.5-10 m
- **What it is**: How thick your soil layer is above bedrock or whatever failure surface you're dealing with
- **What it affects**: Thicker soils mean more weight driving the slope, but also more resistance. It's a balancing act

### Unit Weight γ (kN/m³)

- **Default**: 19.0 kN/m³
- **Range**: 15-22 kN/m³
- **What it is**: How heavy the soil is (density basically)
- **Typical values**: Most soils hang around 18-20 kN/m³
- **What it affects**: Heavier soil creates more driving force pushing the slope downhill. But lighter soil isn't always better - you need weight to create friction

### Base Cohesion c' (kilopascals)

- **Default**: 15 kPa
- **Range**: 0-50 kPa
- **What it is**: The soil's internal strength that comes from particle bonding, not from weight pressing down
- **Typical values**:
  - Clay soils: 10-50 kPa (pretty cohesive)
  - Silt soils: 2-10 kPa (medium)
  - Sand: 0-5 kPa (basically no cohesion)
- **What it affects**: More cohesion = more resistance to sliding. This is why clay slopes are more stable than sandy slopes

### Friction Angle φ' (degrees)

- **Default**: 32°
- **Range**: 15-45°
- **What it is**: How much friction develops between soil particles when they press against each other
- **Typical values**:
  - Sand: 30-40° (loose sand gets higher angles)
  - Silt: 25-35°
  - Clay: 20-30° (depends on water content)
- **What it affects**: Higher friction angle = more stable. A slope can't be steeper than this angle or it'll fail even without water or erosion
- **Key constraint**: Your slope angle must be less than this, or the model breaks down

### Slope Angle β (degrees)

- **Default**: 30°
- **Range**: 5-60°
- **What it is**: How steep your slope is
- **What it affects**: Higher angles = way more unstable. Even a 5-degree increase matters a lot
- **Critical rule**: Must be less than the friction angle (β < φ'). Slopes steeper than friction angle fail automatically

### Hydraulic Conductivity k (×10⁻⁶ m/s)

- **Default**: 5.0 ×10⁻⁶ m/s
- **Range**: 0.1-100 ×10⁻⁶ m/s
- **What it is**: How fast water moves through the soil
- **Typical values**:
  - Clay: 0.001-1 (water barely moves through)
  - Silt: 0.1-10 (slow but moves)
  - Sand: 10-1000 (water flows pretty freely)
- **What it affects**: Higher conductivity = water infiltrates faster = soil saturates faster = failure happens sooner
- **Important**: You can't force more water in than conductivity allows. Rain intensity is limited by how fast the soil can actually absorb water

## Model Validity Check

Before you trust your results, make sure these conditions hold for your parameter set:

- **Slope angle β < Friction angle φ'** - The slope can't be steeper than friction allows
- **Slope length to depth ratio L/z > 25** - The slope needs to be way longer than it is thick
- **Uniform soil properties throughout** - No layering, same soil all the way down
- **Parallel failure surface** - Failure happens along a surface parallel to the slope
- **Parallel seepage assumption** - Water flows downhill, parallel to slope surface

If your parameters violate these, the model's not valid for your situation. You'd need a different approach.

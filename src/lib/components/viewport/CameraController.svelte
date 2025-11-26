<script lang="ts">
	import { T } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';

	// Camera positioned for a good view of the mountain slope
	// Looking at the terrain from front-left, elevated position
	const initialPosition: [number, number, number] = [120, 80, 120];
	const targetPosition: [number, number, number] = [50, 15, 50];
</script>

<T.PerspectiveCamera
	makeDefault
	fov={45}
	near={0.1}
	far={2000}
	position={initialPosition}
>
	<OrbitControls
		target={targetPosition}
		minDistance={30}
		maxDistance={300}
		minPolarAngle={0.1}
		maxPolarAngle={Math.PI / 2.2}
		enableDamping={true}
		dampingFactor={0.08}
	/>
</T.PerspectiveCamera>

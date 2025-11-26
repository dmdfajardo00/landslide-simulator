<script lang="ts">
	import { T } from '@threlte/core';

	const directionalLightPosition: [number, number, number] = [50, 100, 50];
	const skyColor = 0xb1e1ff;
	const groundColor = 0xb97a20;
</script>

<T.DirectionalLight position={directionalLightPosition} intensity={1.5} castShadow />
<T.AmbientLight intensity={0.4} />
<T.HemisphereLight args={[skyColor, groundColor, 0.3]} />

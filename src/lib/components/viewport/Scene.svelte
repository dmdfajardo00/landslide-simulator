<script lang="ts">
	import { Canvas } from '@threlte/core';
	import { type Snippet } from 'svelte';

	interface Props {
		isRaining?: boolean;
		children?: Snippet;
	}

	let { isRaining = false, children }: Props = $props();
</script>

<div class="h-full w-full">
	<Canvas>
		{#if children}
			{@render children()}
		{/if}
	</Canvas>
</div>

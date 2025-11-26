<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>Dynamic Landslide Simulator</title>
	<link rel="icon" href="/favicon.png" />
</svelte:head>

{@render children()}

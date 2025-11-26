<script lang="ts">
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import ViewportPlaceholder from '$lib/components/layout/ViewportPlaceholder.svelte';
	import MetricsPanel from '$lib/components/layout/MetricsPanel.svelte';
</script>

<div class="flex h-screen bg-white">
	<!-- Left Sidebar - Full Height -->
	<Sidebar />

	<!-- Main Content Area -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Center Viewport -->
		<ViewportPlaceholder />

		<!-- Right Metrics Panel -->
		<MetricsPanel />
	</div>
</div>

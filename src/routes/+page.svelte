<script lang="ts">
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import ViewportPlaceholder from '$lib/components/layout/ViewportPlaceholder.svelte';
	import Toolbar from '$lib/components/layout/Toolbar.svelte';
	import StatusBar from '$lib/components/layout/StatusBar.svelte';
</script>

<div class="flex h-screen flex-col bg-white">
	<!-- Main Content Area -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Left Sidebar -->
		<Sidebar />

		<!-- Center Viewport -->
		<ViewportPlaceholder />

		<!-- Right Toolbar -->
		<Toolbar />
	</div>

	<!-- Bottom Status Bar -->
	<StatusBar />
</div>

<script lang="ts">
  import { onMount } from 'svelte';
  import type { Feature, FeatureCollection } from 'geojson';
  import {
    ProgressiveGeoJSONLoader,
    chunkByProperty,
    getHazardColor,
    estimateSize
  } from '$lib/utils/geojson-optimizer';

  // Configuration
  export let dataUrl = '/data/optimized/Cebu_LandslideHazards_optimized.geojson';
  export let useChunking = true;
  export let visibleHazardLevels: number[] = [1, 2, 3];

  // State
  let loading = true;
  let loadingProgress = 0;
  let features: Feature[] = [];
  let error: string | null = null;
  let stats = {
    totalFeatures: 0,
    loadedFeatures: 0,
    memoryUsage: '0 MB'
  };

  // Feature chunks by hazard level
  let hazardChunks: Map<number, Feature[]> = new Map();

  /**
   * Load GeoJSON data
   */
  async function loadData() {
    loading = true;
    error = null;

    try {
      if (useChunking) {
        // Load chunked data
        await loadChunkedData();
      } else {
        // Load full file
        await loadFullData();
      }

      // Organize by hazard level
      hazardChunks = chunkByProperty<number>(features, 'LH');

      // Update stats
      stats.totalFeatures = features.length;
      stats.loadedFeatures = features.length;
      stats.memoryUsage = estimateSize(features).formatted;

      loading = false;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load data';
      loading = false;
    }
  }

  /**
   * Load full GeoJSON file
   */
  async function loadFullData() {
    const response = await fetch(dataUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: FeatureCollection = await response.json();
    features = data.features;
    loadingProgress = 100;
  }

  /**
   * Load chunked data progressively
   */
  async function loadChunkedData() {
    // Check for metadata first
    const metadataUrl = dataUrl.replace(/[^/]+\.geojson$/, 'chunks/chunks_metadata.json');

    try {
      const metaResponse = await fetch(metadataUrl);
      const metadata = await metaResponse.json();

      const baseUrl = dataUrl.replace(/[^/]+\.geojson$/, 'chunks');
      const loader = new ProgressiveGeoJSONLoader(baseUrl, metadata.chunkCount);

      // Load chunks with progress updates
      for (let i = 0; i < metadata.chunkCount; i++) {
        const chunk = await loader.loadChunk(i);
        if (chunk) {
          features.push(...chunk.features);
          loadingProgress = loader.getProgress();
          stats.loadedFeatures = features.length;
        }
      }
    } catch (metaError) {
      // Metadata not found, fall back to full file load
      console.warn('Chunk metadata not found, loading full file');
      await loadFullData();
    }
  }

  /**
   * Toggle hazard level visibility
   */
  export function toggleHazardLevel(level: number, visible: boolean) {
    if (visible && !visibleHazardLevels.includes(level)) {
      visibleHazardLevels = [...visibleHazardLevels, level];
    } else if (!visible) {
      visibleHazardLevels = visibleHazardLevels.filter(l => l !== level);
    }
  }

  /**
   * Get visible features based on hazard level filters
   */
  $: visibleFeatures = features.filter(feature => {
    const hazardLevel = feature.properties?.LH;
    return hazardLevel && visibleHazardLevels.includes(hazardLevel);
  });

  /**
   * Lifecycle
   */
  onMount(() => {
    loadData();
  });
</script>

{#if loading}
  <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
    <div class="rounded-lg bg-neutral-900 p-6 text-neutral-100 shadow-xl">
      <div class="mb-2 text-sm font-medium">Loading Landslide Hazard Data...</div>
      <div class="h-2 w-64 overflow-hidden rounded-full bg-neutral-700">
        <div
          class="h-full bg-orange-500 transition-all duration-300"
          style="width: {loadingProgress}%"
        />
      </div>
      <div class="mt-2 text-xs text-neutral-400">
        {loadingProgress.toFixed(0)}% complete
        {#if stats.loadedFeatures > 0}
          • {stats.loadedFeatures.toLocaleString()} features loaded
        {/if}
      </div>
    </div>
  </div>
{/if}

{#if error}
  <div class="absolute right-4 top-4 z-50 max-w-md rounded-lg bg-red-900/90 p-4 text-sm text-red-100">
    <div class="mb-1 font-semibold">Error Loading Data</div>
    <div class="text-red-200">{error}</div>
  </div>
{/if}

{#if !loading && !error}
  <!-- Render features here -->
  <!-- This is where you'd integrate with Threlte/Three.js -->
  <slot {visibleFeatures} {hazardChunks} />

  <!-- Stats overlay -->
  <div class="absolute bottom-4 left-4 z-40 rounded-lg bg-neutral-900/90 p-3 text-xs text-neutral-300">
    <div class="mb-1 font-semibold text-neutral-100">Landslide Data</div>
    <div>Features: {stats.totalFeatures.toLocaleString()}</div>
    <div>Visible: {visibleFeatures.length.toLocaleString()}</div>
    <div>Memory: {stats.memoryUsage}</div>
    <div class="mt-2 flex gap-2">
      {#each [1, 2, 3] as level}
        {@const count = hazardChunks.get(level)?.length || 0}
        {@const visible = visibleHazardLevels.includes(level)}
        <button
          class="flex items-center gap-1 rounded px-2 py-1 text-xs transition-opacity hover:opacity-100"
          class:opacity-40={!visible}
          style="background-color: {getHazardColor(level)}"
          on:click={() => toggleHazardLevel(level, !visible)}
        >
          <span
            class="h-2 w-2 rounded-full border border-neutral-900"
            style="background-color: {getHazardColor(level)}"
          />
          <span class="text-neutral-900">{count}</span>
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  /* Add any component-specific styles here */
</style>

<script lang="ts">
	import { Howl } from 'howler';
	import { onDestroy } from 'svelte';

	interface Props {
		isRaining?: boolean;
		rainfallIntensity?: number; // 0-100
	}

	let { isRaining = false, rainfallIntensity = 0 }: Props = $props();

	let rainSound: Howl | null = null;
	let initialized = false;

	function initializeAudio() {
		if (initialized) return;

		try {
			// Create Howler sound instance
			rainSound = new Howl({
				src: ['/rain-sound.mp3'],
				loop: true,
				preload: true,
				html5: false, // Use Web Audio API when available
				autoplay: false,
				volume: 0.5
			});

			console.log('Rain audio initialized');
			initialized = true;
		} catch (error) {
			console.error('Failed to initialize rain audio:', error);
		}
	}

	function updateVolume() {
		if (!rainSound) return;

		// Map rainfall intensity (0-100) to volume (0-1)
		const volume = (rainfallIntensity / 100) * 0.8; // Cap at 0.8 for comfortable listening
		rainSound.volume(volume);
	}

	// Effect: Initialize audio on first render
	$effect(() => {
		if (!initialized) {
			initializeAudio();
		}
	});

	// Effect: Handle play/pause based on isRaining
	$effect(() => {
		if (!rainSound) return;

		if (isRaining) {
			if (!rainSound.playing()) {
				rainSound.play();
				console.log('Rain audio started');
			}
		} else {
			if (rainSound.playing()) {
				rainSound.pause();
				console.log('Rain audio paused');
			}
		}
	});

	// Effect: Update volume when intensity changes
	$effect(() => {
		if (rainSound && initialized) {
			updateVolume();
			console.log('Rain volume updated:', rainfallIntensity);
		}
	});

	// Cleanup on component destroy
	onDestroy(() => {
		if (rainSound) {
			rainSound.stop();
			rainSound.unload();
			rainSound = null;
			console.log('Rain audio cleaned up');
		}
		initialized = false;
	});
</script>

<!-- No visible UI - audio-only component -->

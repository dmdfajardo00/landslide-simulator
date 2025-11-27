<script lang="ts">
	import { Howl } from 'howler';
	import { onDestroy } from 'svelte';

	interface Props {
		isActive?: boolean;
		progress?: number; // 0-1 landslide progress
		severity?: number; // 1-100 severity level
	}

	let { isActive = false, progress = 0, severity = 50 }: Props = $props();

	let landslideSound: Howl | null = null;
	let initialized = false;
	let fadeOutTimeout: ReturnType<typeof setTimeout> | null = null;

	function initializeAudio() {
		if (initialized) return;

		try {
			landslideSound = new Howl({
				src: ['/landslide.mp3'],
				loop: true,
				preload: true,
				html5: false,
				autoplay: false,
				volume: 0
			});

			initialized = true;
		} catch (error) {
			console.error('Failed to initialize landslide audio:', error);
		}
	}

	function calculateVolume(): number {
		// Base volume from severity (0.3 - 1.0 range)
		const severityMultiplier = 0.3 + (severity / 100) * 0.7;

		// Phase-based volume envelope synced with landslide phases
		let phaseVolume = 0;

		if (progress < 0.1) {
			// Initiating: Quick ramp up (0 → 0.6)
			phaseVolume = (progress / 0.1) * 0.6;
		} else if (progress < 0.2) {
			// Building: Continue ramping (0.6 → 0.8)
			phaseVolume = 0.6 + ((progress - 0.1) / 0.1) * 0.2;
		} else if (progress < 0.7) {
			// Flowing phase: Peak intensity (0.8 → 1.0 → 0.9)
			const flowProgress = (progress - 0.2) / 0.5;
			// Slight variation during peak for natural feel
			phaseVolume = 0.8 + Math.sin(flowProgress * Math.PI) * 0.2;
		} else if (progress < 0.95) {
			// Depositing: Gradual fade (0.9 → 0.3)
			const depositProgress = (progress - 0.7) / 0.25;
			phaseVolume = 0.9 - depositProgress * 0.6;
		} else {
			// Final settling: Quick fade to silence
			phaseVolume = 0.3 * (1 - (progress - 0.95) / 0.05);
		}

		return Math.max(0, Math.min(1, phaseVolume * severityMultiplier));
	}

	function updateAudio() {
		if (!landslideSound) return;

		const targetVolume = calculateVolume();

		// Smooth volume transition
		landslideSound.volume(targetVolume);
	}

	// Effect: Initialize on mount
	$effect(() => {
		if (!initialized) {
			initializeAudio();
		}
	});

	// Effect: Handle play/stop based on isActive
	$effect(() => {
		if (!landslideSound) return;

		// Clear any pending fade timeout
		if (fadeOutTimeout) {
			clearTimeout(fadeOutTimeout);
			fadeOutTimeout = null;
		}

		if (isActive && progress > 0 && progress < 1) {
			if (!landslideSound.playing()) {
				// Start with calculated volume
				landslideSound.volume(calculateVolume());
				landslideSound.play();
			}
		} else if (!isActive || progress >= 1) {
			if (landslideSound.playing()) {
				// Fade out over 500ms then stop
				landslideSound.fade(landslideSound.volume(), 0, 500);
				fadeOutTimeout = setTimeout(() => {
					if (landslideSound) {
						landslideSound.stop();
					}
				}, 500);
			}
		}
	});

	// Effect: Update volume based on progress and severity
	$effect(() => {
		if (landslideSound && isActive && landslideSound.playing()) {
			updateAudio();
		}
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (fadeOutTimeout) {
			clearTimeout(fadeOutTimeout);
		}
		if (landslideSound) {
			landslideSound.stop();
			landslideSound.unload();
			landslideSound = null;
		}
		initialized = false;
	});
</script>

<!-- No visible UI - audio-only component -->

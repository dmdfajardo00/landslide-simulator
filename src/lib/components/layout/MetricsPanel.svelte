<script lang="ts">
	import { getFosStatus, getPofStatus, getRuStatus, getCohesionStatus, calculateOverallStatus } from '$lib/components/metrics';

	interface ChatMessage {
		role: 'user' | 'assistant';
		content: string;
	}

	interface Props {
		fos?: number;
		pof?: number;
		ru?: number;
		cohesion?: number;
		displacedParticles?: number;
		// Simulation parameters for AI context
		slopeAngle?: number;
		soilDepth?: number;
		unitWeight?: number;
		frictionAngle?: number;
		porosity?: number;
		vegetationCover?: number;
		initialMoisture?: number;
		rainfallIntensity?: number;
		isRaining?: boolean;
		isTriggered?: boolean;
	}

	let {
		fos = 1.468,
		pof = 1.68,
		ru = 0.316,
		cohesion = 14.7,
		displacedParticles = 0,
		// Simulation parameters
		slopeAngle = 30,
		soilDepth = 3.0,
		unitWeight = 19.0,
		frictionAngle = 32,
		porosity = 0.35,
		vegetationCover = 70,
		initialMoisture = 30,
		rainfallIntensity = 25,
		isRaining = false,
		isTriggered = false
	}: Props = $props();

	// Track history for charts - throttled updates
	const MAX_HISTORY = 60;
	let fosHistory = $state<number[]>([fos]);
	let pofHistory = $state<number[]>([pof]);
	let ruHistory = $state<number[]>([ru]);
	let cohesionHistory = $state<number[]>([cohesion]);
	let lastUpdateTime = 0;

	// Throttled history update - only every 500ms to reduce SVG recalculations
	$effect(() => {
		const now = Date.now();
		if (now - lastUpdateTime < 500) return; // Throttle to 2 updates/sec
		lastUpdateTime = now;

		// Simple push with limit (much less frequent now)
		if (fosHistory.length >= MAX_HISTORY) {
			fosHistory = [...fosHistory.slice(-MAX_HISTORY + 1), fos];
			pofHistory = [...pofHistory.slice(-MAX_HISTORY + 1), pof];
			ruHistory = [...ruHistory.slice(-MAX_HISTORY + 1), ru];
			cohesionHistory = [...cohesionHistory.slice(-MAX_HISTORY + 1), cohesion];
		} else {
			fosHistory = [...fosHistory, fos];
			pofHistory = [...pofHistory, pof];
			ruHistory = [...ruHistory, ru];
			cohesionHistory = [...cohesionHistory, cohesion];
		}
	});

	let overallStatus = $derived(calculateOverallStatus(fos, pof));

	const statusConfig = {
		safe: { label: 'Stable', color: 'bg-green-500', hex: '#22C55E' },
		marginal: { label: 'Caution', color: 'bg-yellow-500', hex: '#EAB308' },
		critical: { label: 'Unstable', color: 'bg-orange-500', hex: '#F97316' },
		failure: { label: 'Failing', color: 'bg-red-500', hex: '#EF4444' }
	};

	const fosStatus = $derived(getFosStatus(fos));
	const pofStatus = $derived(getPofStatus(pof));
	const ruStatus = $derived(getRuStatus(ru));
	const cohesionStatus = $derived(getCohesionStatus(cohesion));

	interface Metric {
		label: string;
		abbrev: string;
		value: string;
		unit: string;
		status: 'safe' | 'marginal' | 'critical' | 'failure';
		history: number[];
		min: number;
		max: number;
	}

	const metrics: Metric[] = $derived([
		{ label: 'Factor of Safety', abbrev: 'FoS', value: fos.toFixed(3), unit: '', status: fosStatus, history: fosHistory, min: 0.5, max: 3 },
		{ label: 'Failure Probability', abbrev: 'PoF', value: pof.toFixed(2), unit: '%', status: pofStatus, history: pofHistory, min: 0, max: 100 },
		{ label: 'Pore Pressure Ratio', abbrev: 'ru', value: ru.toFixed(3), unit: '', status: ruStatus, history: ruHistory, min: 0, max: 1 },
		{ label: 'Effective Cohesion', abbrev: "c'", value: cohesion.toFixed(1), unit: 'kPa', status: cohesionStatus, history: cohesionHistory, min: 0, max: 30 }
	]);

	// Modal state
	let activeTab = $state<'student' | 'formulas' | 'info' | 'parameters'>('formulas');
	let showModal = $state(false);
	let showAbout = $state(false);

	// AI Assistant state
	let showAI = $state(false);
	let aiLoading = $state(false);
	let aiQuestion = $state('');
	let chatMessages = $state<ChatMessage[]>([]);
	let currentStreamingText = $state('');
	let abortController: AbortController | null = null;
	let chatContainer: HTMLDivElement;

	// Build context string from current simulation parameters
	function buildContext(): string {
		const stabilityStatus = fos >= 1.5 ? 'STABLE' : fos >= 1.0 ? 'MARGINAL' : 'UNSTABLE';
		const simulationStatus = isTriggered ? 'LANDSLIDE ACTIVE' : isRaining ? 'RAINFALL SIMULATION' : 'IDLE';

		return `**Slope Geometry:**
- Slope Angle: ${slopeAngle}°
- Depth to Failure Plane: ${soilDepth.toFixed(1)} m

**Soil Properties:**
- Unit Weight: ${unitWeight.toFixed(1)} kN/m³
- Friction Angle: ${frictionAngle}°
- Cohesion: ${cohesion.toFixed(1)} kPa
- Porosity: ${porosity.toFixed(2)}

**Hydrological Conditions:**
- Initial Soil Moisture: ${initialMoisture}%
- Rainfall Intensity: ${rainfallIntensity} mm/hr
- Current Pore Pressure Ratio (ru): ${(ru * 100).toFixed(1)}%

**Vegetation:**
- Vegetation Cover: ${vegetationCover}%

**Calculated Metrics:**
- Factor of Safety (FoS): ${fos.toFixed(3)} → ${stabilityStatus}
- Probability of Failure: ${pof.toFixed(2)}%
- Pore Pressure Ratio (ru): ${ru.toFixed(3)}
- Displaced Volume: ${displacedParticles} m³

**Simulation Status:** ${simulationStatus}`;
	}

	async function sendMessage() {
		const question = aiQuestion.trim();
		if (!question || aiLoading) return;

		// Add user message
		chatMessages = [...chatMessages, { role: 'user', content: question }];
		aiQuestion = '';
		aiLoading = true;
		currentStreamingText = '';

		// Scroll to bottom
		setTimeout(() => {
			if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
		}, 10);

		// Abort any previous request
		if (abortController) abortController.abort();
		abortController = new AbortController();

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
					context: buildContext()
				}),
				signal: abortController.signal
			});

			if (!response.ok) {
				throw new Error('Failed to get response');
			}

			const reader = response.body?.getReader();
			if (!reader) throw new Error('No response body');

			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6);
						if (data === '[DONE]') continue;

						try {
							const parsed = JSON.parse(data);
							const content = parsed.choices?.[0]?.delta?.content;
							if (content) {
								currentStreamingText += content;
								// Auto-scroll during streaming
								if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
							}
						} catch {
							// Skip non-JSON lines (SSE comments)
						}
					}
				}
			}

			// Add completed assistant message
			if (currentStreamingText) {
				chatMessages = [...chatMessages, { role: 'assistant', content: currentStreamingText }];
			}
		} catch (err) {
			if ((err as Error).name !== 'AbortError') {
				chatMessages = [
					...chatMessages,
					{ role: 'assistant', content: '**Connection error.** Check your network and try again.' }
				];
			}
		} finally {
			aiLoading = false;
			currentStreamingText = '';
			abortController = null;
		}
	}

	function clearConversation() {
		chatMessages = [];
		currentStreamingText = '';
		aiQuestion = '';
	}

	function closeAIModal() {
		showAI = false;
		if (abortController) {
			abortController.abort();
			abortController = null;
		}
		aiLoading = false;
		currentStreamingText = '';
	}

	// Simple markdown bold parser
	function parseMarkdownBold(text: string): string {
		return text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-neutral-900">$1</strong>');
	}

	// Generate SVG path for sparkline
	function generatePath(data: number[], min: number, max: number, width: number = 240, height: number = 40) {
		if (data.length < 2) return '';

		const range = max - min || 1;
		const step = width / (data.length - 1);
		const points = data.map((val, i) => {
			const x = i * step;
			const y = height - ((val - min) / range) * height;
			return `${x},${y}`;
		});

		return `M${points.join(' L')}`;
	}

	// Get color for metric based on status
	function getMetricColor(status: string): string {
		const colorMap: Record<string, string> = {
			safe: '#22C55E',
			marginal: '#EAB308',
			critical: '#F97316',
			failure: '#EF4444'
		};
		return colorMap[status] || '#64748B';
	}
</script>

<aside class="w-96 bg-white border-l border-neutral-200 flex flex-col overflow-y-auto">
	<!-- Header -->
	<div class="px-4 py-3 border-b border-neutral-100">
		<div class="flex items-center justify-between">
			<span class="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Status</span>
			<div class="flex items-center gap-2">
				<span class="w-2 h-2 rounded-full {statusConfig[overallStatus].color}"></span>
				<span class="text-sm font-semibold text-neutral-900">{statusConfig[overallStatus].label}</span>
			</div>
		</div>
	</div>

	<!-- Metrics with Charts -->
	<div class="flex-1 space-y-3 p-4 pb-2">
		{#each metrics as metric (metric.abbrev)}
			<div class="space-y-1.5">
				<!-- Metric Header -->
				<div class="flex items-baseline justify-between">
					<div class="flex flex-col">
						<span class="text-xs font-semibold text-neutral-700">{metric.label}</span>
						<span class="text-[10px] text-neutral-400">({metric.abbrev})</span>
					</div>
					<div class="flex items-baseline gap-1">
						<span class="text-sm font-mono font-bold text-neutral-900">{metric.value}</span>
						{#if metric.unit}
							<span class="text-[9px] text-neutral-500">{metric.unit}</span>
						{/if}
					</div>
				</div>

				<!-- Sparkline Chart -->
				{#if metric.history.length > 1}
					<div class="h-8 bg-neutral-50 rounded border border-neutral-100 p-1.5">
						<svg width="100%" height="100%" viewBox="0 0 240 40" preserveAspectRatio="none">
							<!-- Grid lines -->
							<line x1="0" y1="40" x2="240" y2="40" stroke="#E5E7EB" stroke-width="0.5" />
							<line x1="0" y1="20" x2="240" y2="20" stroke="#F3F4F6" stroke-width="0.5" />

							<!-- Area fill -->
							<defs>
								<linearGradient id="grad-{metric.abbrev}" x1="0%" y1="0%" x2="0%" y2="100%">
									<stop offset="0%" style="stop-color:{getMetricColor(metric.status)};stop-opacity:0.2" />
									<stop offset="100%" style="stop-color:{getMetricColor(metric.status)};stop-opacity:0" />
								</linearGradient>
							</defs>

							<!-- Line path -->
							<path
								d="{generatePath(metric.history, metric.min, metric.max)} L 240 40 L 0 40 Z"
								fill="url(#grad-{metric.abbrev})"
								stroke="none"
							/>

							<!-- Stroke line -->
							<path
								d={generatePath(metric.history, metric.min, metric.max)}
								fill="none"
								stroke={getMetricColor(metric.status)}
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>

							<!-- Current point -->
							<circle
								cx="240"
								cy={40 - ((metric.history[metric.history.length - 1] - metric.min) / (metric.max - metric.min)) * 40}
								r="2"
								fill={getMetricColor(metric.status)}
							/>
						</svg>
					</div>
				{/if}

				<!-- Status indicator -->
				<div class="flex items-center gap-2">
					<div class="h-0.5 flex-1 bg-neutral-100 rounded-full overflow-hidden">
						<div
							class="h-full"
							style="width: {Math.min(100, Math.max(0, ((parseFloat(metric.value) - metric.min) / (metric.max - metric.min)) * 100))}%; background-color: {getMetricColor(metric.status)};"
						></div>
					</div>
					<span class="text-[9px] font-semibold text-neutral-500 whitespace-nowrap">{metric.min}-{metric.max}</span>
				</div>
			</div>
		{/each}
	</div>

	<!-- Particles Displaced -->
	<div class="px-4 py-2 border-t border-neutral-100 bg-neutral-50">
		<div class="flex items-center justify-between">
			<span class="text-xs font-semibold text-neutral-600">Displaced</span>
			<span class="text-sm font-mono font-bold text-neutral-900">{displacedParticles}</span>
		</div>
	</div>

	<!-- Info Buttons Grid -->
	<div class="px-3 py-2 border-t border-neutral-100 grid grid-cols-2 gap-1.5">
		<button
			onclick={() => {
				showModal = true;
				activeTab = 'student';
			}}
			class="px-2 py-1.5 text-[10px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-200 transition-colors"
		>
			STUDENT GUIDE
		</button>
		<button
			onclick={() => {
				showModal = true;
				activeTab = 'formulas';
			}}
			class="px-2 py-1.5 text-[10px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-200 transition-colors"
		>
			FORMULAS & THEORY
		</button>
		<button
			onclick={() => {
				showModal = true;
				activeTab = 'info';
			}}
			class="px-2 py-1.5 text-[10px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-200 transition-colors"
		>
			SIMULATION INFO
		</button>
		<button
			onclick={() => {
				showModal = true;
				activeTab = 'parameters';
			}}
			class="px-2 py-1.5 text-[10px] font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-200 transition-colors"
		>
			PARAMETERS
		</button>
	</div>

	<!-- Ask AI & About Buttons -->
	<div class="px-3 py-2 border-t border-neutral-100 bg-neutral-50 flex gap-2">
		<button
			onclick={() => (showAI = true)}
			class="flex-1 px-2 py-1.5 text-[10px] font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded transition-colors flex items-center justify-center gap-1.5"
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
			</svg>
			ASK AI
		</button>
		<button
			onclick={() => (showAbout = true)}
			class="flex-1 px-2 py-1.5 text-[10px] font-semibold text-neutral-600 hover:text-neutral-900 bg-white hover:bg-neutral-100 rounded border border-neutral-200 transition-colors"
		>
			ABOUT
		</button>
	</div>
</aside>

<!-- Documentation Modal -->
{#if showModal}
	<div class="fixed inset-0 bg-black/50 z-40" onclick={() => (showModal = false)}></div>
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => (showModal = false)}>
		<div class="bg-white rounded-lg shadow-xl flex h-full max-h-[90vh] w-full max-w-4xl overflow-hidden" onclick={(e) => e.stopPropagation()}>
			<!-- Sidebar Tabs -->
			<div class="w-48 border-r border-neutral-200 bg-neutral-50 flex flex-col">
				<div class="px-4 py-3 border-b border-neutral-200">
					<h3 class="text-sm font-semibold text-neutral-900">Documentation</h3>
				</div>
				<nav class="flex-1 space-y-1 p-2 overflow-y-auto">
					{#each [
						{ id: 'student', label: 'Student Guide' },
						{ id: 'formulas', label: 'Formulas & Theory' },
						{ id: 'info', label: 'Simulation Info' },
						{ id: 'parameters', label: 'Geotechnical Parameters' }
					] as tab}
						<button
							onclick={() => (activeTab = tab.id)}
							class="w-full px-3 py-2 text-left text-xs font-medium rounded transition-colors {activeTab === tab.id
								? 'bg-white text-neutral-900 border border-neutral-200'
								: 'text-neutral-600 hover:bg-neutral-100'}"
						>
							{tab.label}
						</button>
					{/each}
				</nav>
				<button
					onclick={() => (showModal = false)}
					class="m-2 px-3 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded transition-colors"
				>
					Close
				</button>
			</div>

			<!-- Content Area -->
			<div class="flex-1 overflow-y-auto p-6">
				{#if activeTab === 'student'}
					<div class="prose prose-sm max-w-none">
						<h2 class="text-lg font-bold text-neutral-900 mb-4">Student Guide</h2>
						<div class="space-y-4 text-neutral-700">
							<p>Welcome to the <strong>3D Dynamic Landslide Generator</strong> - an interactive physics simulation tool designed for geotechnical engineering education.</p>
							<h3 class="font-semibold text-neutral-900 mt-4">Getting Started</h3>
							<ul class="list-disc list-inside space-y-2 text-sm">
								<li>Adjust slope angle and soil properties using the left panel controls</li>
								<li>Use the action buttons to toggle rain simulation and trigger landslides</li>
								<li>Monitor the metrics panel on the right to track Factor of Safety, Probability of Failure, and other key indicators</li>
								<li>Observe real-time 3D terrain deformation and particle physics</li>
							</ul>
							<h3 class="font-semibold text-neutral-900 mt-4">Key Concepts</h3>
							<ul class="list-disc list-inside space-y-2 text-sm">
								<li><strong>Factor of Safety (FoS):</strong> Ratio of shear strength to shear stress. FoS > 1.5 indicates stability</li>
								<li><strong>Pore Pressure:</strong> Water pressure within soil affects shear strength and failure</li>
								<li><strong>Slope Angle:</strong> Steeper slopes are more susceptible to failure</li>
								<li><strong>Vegetation:</strong> Root systems increase soil cohesion and stability</li>
							</ul>
						</div>
					</div>
				{:else if activeTab === 'formulas'}
					<div class="prose prose-sm max-w-none">
						<h2 class="text-lg font-bold text-neutral-900 mb-4">Formulas & Theory</h2>
						<div class="space-y-6 text-neutral-700 font-mono text-xs">
							<div>
								<h3 class="font-bold text-neutral-900">Infinite Slope Analysis</h3>
								<p class="mt-2">FoS = (c + γ·h·cosθ·(1-ru)·tanφ) / (γ·h·sinθ·cosθ)</p>
								<p class="text-[11px] mt-1 text-neutral-500">Where: c = cohesion, γ = unit weight, h = height, θ = angle, ru = pore pressure ratio, φ = friction angle</p>
							</div>
							<div>
								<h3 class="font-bold text-neutral-900">Pore Pressure Ratio</h3>
								<p class="mt-2">ru = Pw / (γ·h)</p>
								<p class="text-[11px] mt-1 text-neutral-500">Where: Pw = pore water pressure, γ = unit weight of water, h = height of soil</p>
							</div>
							<div>
								<h3 class="font-bold text-neutral-900">Probability of Failure (First-Order Second-Moment)</h3>
								<p class="mt-2">PoF = Φ(-β) where β = (μ_FoS) / σ_FoS</p>
								<p class="text-[11px] mt-1 text-neutral-500">Where: μ = mean, σ = standard deviation, Φ = standard normal CDF</p>
							</div>
							<div>
								<h3 class="font-bold text-neutral-900">Vegetation Effect on Cohesion</h3>
								<p class="mt-2">c' = c + c_root·V</p>
								<p class="text-[11px] mt-1 text-neutral-500">Where: c' = effective cohesion, c_root = root cohesion, V = vegetation coverage %</p>
							</div>
						</div>
					</div>
				{:else if activeTab === 'info'}
					<div class="prose prose-sm max-w-none">
						<h2 class="text-lg font-bold text-neutral-900 mb-4">Simulation Information</h2>
						<div class="space-y-4 text-neutral-700 text-sm">
							<h3 class="font-semibold text-neutral-900">Physics Engine</h3>
							<p>This simulator uses <strong>Rapier3D</strong> physics engine for real-time rigid body dynamics and particle systems.</p>
							<h3 class="font-semibold text-neutral-900 mt-4">Real-time Calculations</h3>
							<ul class="list-disc list-inside space-y-2">
								<li>Factor of Safety updates every simulation step</li>
								<li>Pore pressure increases with rainfall intensity and infiltration</li>
								<li>Particle displacement tracked when FoS drops below critical threshold</li>
								<li>Vegetation provides dynamic cohesion contribution</li>
							</ul>
							<h3 class="font-semibold text-neutral-900 mt-4">Visualization Features</h3>
							<ul class="list-disc list-inside space-y-2">
								<li>3D terrain with adjustable slope geometry</li>
								<li>Real-time rain particle system</li>
								<li>Debris and soil particle ejection during landslide</li>
								<li>Vegetation representation with trees</li>
								<li>Color-coded stability indicators</li>
							</ul>
						</div>
					</div>
				{:else if activeTab === 'parameters'}
					<div class="prose prose-sm max-w-none">
						<h2 class="text-lg font-bold text-neutral-900 mb-4">Geotechnical Parameters</h2>
						<div class="space-y-4 text-neutral-700 text-sm">
							<h3 class="font-semibold text-neutral-900">Slope Geometry</h3>
							<ul class="list-disc list-inside space-y-2">
								<li><strong>Slope Angle (θ):</strong> 15-75° - Controls gravitational component along slope</li>
								<li><strong>Soil Depth (H):</strong> 1-10m - Thickness of potentially failing soil layer</li>
								<li><strong>Max Elevation:</strong> 20-100m - Overall terrain height in 3D view</li>
							</ul>
							<h3 class="font-semibold text-neutral-900 mt-4">Soil Properties</h3>
							<ul class="list-disc list-inside space-y-2">
								<li><strong>Cohesion (c):</strong> 0-50 kPa - Internal soil strength independent of stress</li>
								<li><strong>Friction Angle (φ):</strong> 15-45° - Angle of internal friction</li>
								<li><strong>Unit Weight (γ):</strong> 16-22 kN/m³ - Weight per unit volume of soil</li>
								<li><strong>Hydraulic Conductivity (k):</strong> 1e-6 to 1e-3 m/s - Rate of water infiltration</li>
							</ul>
							<h3 class="font-semibold text-neutral-900 mt-4">Hydrological Factors</h3>
							<ul class="list-disc list-inside space-y-2">
								<li><strong>Rainfall Intensity (I):</strong> 0-100 mm/hr - Rate of water input</li>
								<li><strong>Pore Pressure (Pw):</strong> 0-100 kPa - Water pressure in soil pores</li>
								<li><strong>Saturation (S):</strong> 0-100% - Percentage of pores filled with water</li>
							</ul>
							<h3 class="font-semibold text-neutral-900 mt-4">Vegetation</h3>
							<ul class="list-disc list-inside space-y-2">
								<li><strong>Coverage (%):</strong> 0-100% - Density of plant cover on slope</li>
								<li><strong>Root Strength:</strong> Contributes 2-5 kPa per 10% coverage</li>
								<li><strong>Interception:</strong> Vegetation intercepts ~30% of rainfall</li>
							</ul>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- About Modal -->
{#if showAbout}
	<div class="fixed inset-0 bg-black/50 z-40" onclick={() => (showAbout = false)}></div>
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={() => (showAbout = false)}>
		<div class="bg-white rounded-lg shadow-xl max-h-[90vh] w-full max-w-2xl overflow-y-auto" onclick={(e) => e.stopPropagation()}>
			<div class="p-8">
				<div class="flex items-center justify-between mb-6">
					<h1 class="text-2xl font-bold text-neutral-900">About This Project</h1>
					<button
						onclick={() => (showAbout = false)}
						class="text-neutral-400 hover:text-neutral-600 text-2xl leading-none"
					>
						×
					</button>
				</div>

				<!-- Research Team -->
				<div class="mb-8">
					<h2 class="text-lg font-semibold text-neutral-900 mb-3">Research Team</h2>
					<p class="text-sm text-neutral-600 mb-3">This project was developed by the following researchers from Cebu Normal University:</p>
					<div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
						<ul class="text-sm text-neutral-700 space-y-1">
							<li>Angelo Cantila</li>
							<li>Hanah Jane Marie Cantos</li>
							<li>Marynylle Englis</li>
							<li>Joana Paula Lugay</li>
							<li>Charle Mae Matero</li>
							<li>Vickcir Anne Sare</li>
							<li>Greven Ventic</li>
							<li>Jade Bryan Zulueta</li>
						</ul>
					</div>
				</div>

				<!-- Advisor -->
				<div class="mb-8">
					<h2 class="text-lg font-semibold text-neutral-900 mb-3">Presented to</h2>
					<div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
						<p class="text-sm text-neutral-700">
							<strong>Dr. Jennifer D. Paño</strong><br />
							Cebu Normal University - Main Campus
						</p>
					</div>
				</div>

				<!-- Developer -->
				<div class="mb-8">
					<h2 class="text-lg font-semibold text-neutral-900 mb-3">Developed By</h2>
					<div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
						<div class="flex items-center justify-between">
							<a
								href="http://dmdfajardo.pro/"
								target="_blank"
								rel="noopener noreferrer"
								class="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
							>
								Dave Fajardo
							</a>
							<div class="flex gap-2">
								<a
									href="https://github.com/dmdfajardo00"
									target="_blank"
									rel="noopener noreferrer"
									class="text-neutral-600 hover:text-neutral-900 transition-colors"
									title="GitHub"
								>
									<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
									</svg>
								</a>
								<a
									href="https://www.linkedin.com/in/dave-fajardo-686374188/"
									target="_blank"
									rel="noopener noreferrer"
									class="text-neutral-600 hover:text-neutral-900 transition-colors"
									title="LinkedIn"
								>
									<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
										<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.731-2.004 1.438-.103.249-.129.597-.129.945v5.422h-3.554s.05-8.736 0-9.646h3.554v1.366c.43-.664 1.197-1.608 2.905-1.608 2.121 0 3.713 1.388 3.713 4.37v5.518zM5.337 9.433c-1.144 0-1.915-.758-1.915-1.706 0-.951.769-1.706 1.959-1.706 1.187 0 1.912.755 1.937 1.706 0 .948-.75 1.706-1.981 1.706zm1.946 11.019H3.39V9.806h3.893v10.646zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
									</svg>
								</a>
							</div>
						</div>
					</div>
				</div>

				<!-- About Section -->
				<div class="border-t border-neutral-200 pt-6">
					<h2 class="text-lg font-semibold text-neutral-900 mb-3">About the Simulator</h2>
					<p class="text-sm text-neutral-700 leading-relaxed">
						The 3D Dynamic Landslide Generator is an interactive educational tool designed to help students and professionals understand the complex physics of slope stability and landslide mechanics. Built with modern web technologies, this simulator provides real-time visualization of geotechnical principles including Factor of Safety calculations, pore water pressure dynamics, and probability-based failure assessment.
					</p>
				</div>

				<!-- Data Sources -->
				<div class="border-t border-neutral-200 pt-6 mt-6">
					<h2 class="text-lg font-semibold text-neutral-900 mb-3">Data Sources</h2>
					<div class="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
						<p class="text-sm text-neutral-700">
							<strong>Landslide Hazard Data:</strong> <a href="https://hazardhunter.georisk.gov.ph/map" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700 transition-colors">MGB-DENR GeoRisk Philippines</a> — Mines and Geosciences Bureau, Department of Environment and Natural Resources
						</p>
					</div>
				</div>

				<!-- Tech Stack & Libraries -->
				<div class="border-t border-neutral-200 pt-6 mt-6">
					<h2 class="text-lg font-semibold text-neutral-900 mb-3">Tech Stack & Libraries</h2>
					<div class="space-y-4">
						<!-- Core Framework -->
						<div>
							<h3 class="text-sm font-semibold text-neutral-800 mb-2">Core Framework</h3>
							<div class="bg-neutral-50 rounded-lg border border-neutral-200 overflow-hidden">
								<table class="w-full text-xs">
									<thead class="bg-neutral-100">
										<tr>
											<th class="px-3 py-2 text-left font-semibold text-neutral-600">Library</th>
											<th class="px-3 py-2 text-left font-semibold text-neutral-600">License</th>
											<th class="px-3 py-2 text-center font-semibold text-neutral-600">OSS</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-neutral-100">
										<tr>
											<td class="px-3 py-2"><a href="https://svelte.dev" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700">Svelte 5</a></td>
											<td class="px-3 py-2 text-neutral-600">MIT</td>
											<td class="px-3 py-2 text-center text-green-600">✓</td>
										</tr>
										<tr>
											<td class="px-3 py-2"><a href="https://svelte.dev/docs/kit" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700">SvelteKit</a></td>
											<td class="px-3 py-2 text-neutral-600">MIT</td>
											<td class="px-3 py-2 text-center text-green-600">✓</td>
										</tr>
										<tr>
											<td class="px-3 py-2"><a href="https://www.typescriptlang.org" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700">TypeScript</a></td>
											<td class="px-3 py-2 text-neutral-600">Apache 2.0</td>
											<td class="px-3 py-2 text-center text-green-600">✓</td>
										</tr>
										<tr>
											<td class="px-3 py-2"><a href="https://vite.dev" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700">Vite</a></td>
											<td class="px-3 py-2 text-neutral-600">MIT</td>
											<td class="px-3 py-2 text-center text-green-600">✓</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>

						<!-- 3D & Physics -->
						<div>
							<h3 class="text-sm font-semibold text-neutral-800 mb-2">3D Graphics & Physics</h3>
							<div class="bg-neutral-50 rounded-lg border border-neutral-200 overflow-hidden">
								<table class="w-full text-xs">
									<thead class="bg-neutral-100">
										<tr>
											<th class="px-3 py-2 text-left font-semibold text-neutral-600">Library</th>
											<th class="px-3 py-2 text-left font-semibold text-neutral-600">License</th>
											<th class="px-3 py-2 text-center font-semibold text-neutral-600">OSS</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-neutral-100">
										<tr>
											<td class="px-3 py-2"><a href="https://threejs.org" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700">Three.js</a></td>
											<td class="px-3 py-2 text-neutral-600">MIT</td>
											<td class="px-3 py-2 text-center text-green-600">✓</td>
										</tr>
										<tr>
											<td class="px-3 py-2"><a href="https://threlte.xyz" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700">Threlte</a></td>
											<td class="px-3 py-2 text-neutral-600">MIT</td>
											<td class="px-3 py-2 text-center text-green-600">✓</td>
										</tr>
										<tr>
											<td class="px-3 py-2"><a href="https://rapier.rs" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700">Rapier3D</a></td>
											<td class="px-3 py-2 text-neutral-600">Apache 2.0</td>
											<td class="px-3 py-2 text-center text-green-600">✓</td>
										</tr>
										<tr>
											<td class="px-3 py-2"><a href="https://github.com/jwagner/simplex-noise.js" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700">simplex-noise</a></td>
											<td class="px-3 py-2 text-neutral-600">MIT</td>
											<td class="px-3 py-2 text-center text-green-600">✓</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>

						<!-- Mapping -->
						<div>
							<h3 class="text-sm font-semibold text-neutral-800 mb-2">Mapping</h3>
							<div class="bg-neutral-50 rounded-lg border border-neutral-200 overflow-hidden">
								<table class="w-full text-xs">
									<thead class="bg-neutral-100">
										<tr>
											<th class="px-3 py-2 text-left font-semibold text-neutral-600">Library</th>
											<th class="px-3 py-2 text-left font-semibold text-neutral-600">License</th>
											<th class="px-3 py-2 text-center font-semibold text-neutral-600">OSS</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-neutral-100">
										<tr>
											<td class="px-3 py-2"><a href="https://maplibre.org" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700">MapLibre GL JS</a></td>
											<td class="px-3 py-2 text-neutral-600">BSD-3-Clause</td>
											<td class="px-3 py-2 text-center text-green-600">✓</td>
										</tr>
										<tr>
											<td class="px-3 py-2"><a href="https://protomaps.com/docs/pmtiles" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700">PMTiles</a></td>
											<td class="px-3 py-2 text-neutral-600">BSD-3-Clause</td>
											<td class="px-3 py-2 text-center text-green-600">✓</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>

						<!-- UI Components -->
						<div>
							<h3 class="text-sm font-semibold text-neutral-800 mb-2">UI Components & Styling</h3>
							<div class="bg-neutral-50 rounded-lg border border-neutral-200 overflow-hidden">
								<table class="w-full text-xs">
									<thead class="bg-neutral-100">
										<tr>
											<th class="px-3 py-2 text-left font-semibold text-neutral-600">Library</th>
											<th class="px-3 py-2 text-left font-semibold text-neutral-600">License</th>
											<th class="px-3 py-2 text-center font-semibold text-neutral-600">OSS</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-neutral-100">
										<tr>
											<td class="px-3 py-2"><a href="https://tailwindcss.com" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700">Tailwind CSS</a></td>
											<td class="px-3 py-2 text-neutral-600">MIT</td>
											<td class="px-3 py-2 text-center text-green-600">✓</td>
										</tr>
										<tr>
											<td class="px-3 py-2"><a href="https://www.bits-ui.com" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700">Bits UI</a></td>
											<td class="px-3 py-2 text-neutral-600">MIT</td>
											<td class="px-3 py-2 text-center text-green-600">✓</td>
										</tr>
										<tr>
											<td class="px-3 py-2"><a href="https://www.tailwind-variants.org" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700">Tailwind Variants</a></td>
											<td class="px-3 py-2 text-neutral-600">MIT</td>
											<td class="px-3 py-2 text-center text-green-600">✓</td>
										</tr>
										<tr>
											<td class="px-3 py-2"><a href="https://iconify.design" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700">Iconify</a></td>
											<td class="px-3 py-2 text-neutral-600">MIT</td>
											<td class="px-3 py-2 text-center text-green-600">✓</td>
										</tr>
										<tr>
											<td class="px-3 py-2"><a href="https://lucide.dev" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700">Lucide</a></td>
											<td class="px-3 py-2 text-neutral-600">ISC</td>
											<td class="px-3 py-2 text-center text-green-600">✓</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>

						<!-- Audio -->
						<div>
							<h3 class="text-sm font-semibold text-neutral-800 mb-2">Audio</h3>
							<div class="bg-neutral-50 rounded-lg border border-neutral-200 overflow-hidden">
								<table class="w-full text-xs">
									<thead class="bg-neutral-100">
										<tr>
											<th class="px-3 py-2 text-left font-semibold text-neutral-600">Library</th>
											<th class="px-3 py-2 text-left font-semibold text-neutral-600">License</th>
											<th class="px-3 py-2 text-center font-semibold text-neutral-600">OSS</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-neutral-100">
										<tr>
											<td class="px-3 py-2"><a href="https://howlerjs.com" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-700">Howler.js</a></td>
											<td class="px-3 py-2 text-neutral-600">MIT</td>
											<td class="px-3 py-2 text-center text-green-600">✓</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>

				<!-- Disclaimer -->
				<div class="border-t border-neutral-200 pt-6 mt-6">
					<h2 class="text-lg font-semibold text-neutral-900 mb-3">Disclaimer</h2>
					<div class="bg-amber-50 rounded-lg p-4 border border-amber-200">
						<p class="text-xs text-amber-800 leading-relaxed">
							<strong>Educational Use Only:</strong> This project is developed strictly for educational and non-profit purposes as part of academic research at Cebu Normal University. The simulation is intended to demonstrate geotechnical engineering concepts and should not be used for professional engineering assessments, real-world hazard predictions, or any commercial applications. The developers and researchers assume no liability for any use of this software beyond its intended educational scope.
						</p>
					</div>
				</div>

				<!-- Close Button -->
				<div class="mt-8 flex justify-end">
					<button
						onclick={() => (showAbout = false)}
						class="px-4 py-2 text-sm font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-200 transition-colors"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- AI Assistant Modal -->
{#if showAI}
	<div class="fixed inset-0 bg-black/50 z-40" onclick={closeAIModal}></div>
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" onclick={closeAIModal}>
		<div class="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]" onclick={(e) => e.stopPropagation()}>
			<!-- Header -->
			<div class="px-4 py-3 border-b border-neutral-200 flex items-center justify-between shrink-0">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center">
						<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
						</svg>
					</div>
					<div>
						<h3 class="text-sm font-semibold text-neutral-900">Dr. Terra</h3>
						<p class="text-xs text-neutral-500">Engineering Geologist</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					{#if chatMessages.length > 0}
						<button
							onclick={clearConversation}
							class="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
							title="Clear conversation"
						>
							Clear
						</button>
					{/if}
					<button
						onclick={closeAIModal}
						class="text-neutral-400 hover:text-neutral-600 transition-colors"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<!-- Chat Content -->
			<div bind:this={chatContainer} class="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
				{#if chatMessages.length === 0 && !currentStreamingText && !aiLoading}
					<div class="flex flex-col items-center py-4">
						<div class="w-10 h-10 mb-2 rounded-full bg-neutral-100 flex items-center justify-center">
							<svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
							</svg>
						</div>
						<p class="text-sm text-neutral-600 font-medium">Ask me anything about slope stability</p>
						<p class="text-xs text-neutral-400 mt-1 mb-4">I can see your current simulation parameters</p>

						<!-- Starter Prompts Grid -->
						<div class="grid grid-cols-2 gap-2 w-full">
							<button
								onclick={() => { aiQuestion = 'Is this slope stable?'; sendMessage(); }}
								class="p-3 text-left bg-white border border-neutral-200 rounded-lg hover:border-neutral-300 hover:bg-neutral-50 transition-colors group"
							>
								<div class="flex items-start gap-2">
									<svg class="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span class="text-xs text-neutral-600 group-hover:text-neutral-900">Is this slope stable?</span>
								</div>
							</button>
							<button
								onclick={() => { aiQuestion = 'What does my Factor of Safety mean?'; sendMessage(); }}
								class="p-3 text-left bg-white border border-neutral-200 rounded-lg hover:border-neutral-300 hover:bg-neutral-50 transition-colors group"
							>
								<div class="flex items-start gap-2">
									<svg class="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span class="text-xs text-neutral-600 group-hover:text-neutral-900">What does my Factor of Safety mean?</span>
								</div>
							</button>
							<button
								onclick={() => { aiQuestion = 'How does rainfall trigger landslides?'; sendMessage(); }}
								class="p-3 text-left bg-white border border-neutral-200 rounded-lg hover:border-neutral-300 hover:bg-neutral-50 transition-colors group"
							>
								<div class="flex items-start gap-2">
									<svg class="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
									</svg>
									<span class="text-xs text-neutral-600 group-hover:text-neutral-900">How does rainfall trigger landslides?</span>
								</div>
							</button>
							<button
								onclick={() => { aiQuestion = 'What should I adjust to improve stability?'; sendMessage(); }}
								class="p-3 text-left bg-white border border-neutral-200 rounded-lg hover:border-neutral-300 hover:bg-neutral-50 transition-colors group"
							>
								<div class="flex items-start gap-2">
									<svg class="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
									</svg>
									<span class="text-xs text-neutral-600 group-hover:text-neutral-900">What should I adjust to improve stability?</span>
								</div>
							</button>
						</div>
					</div>
				{:else}
					{#each chatMessages as message}
						<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
							<div class="max-w-[85%] {message.role === 'user' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700'} rounded-lg px-3 py-2">
								<div class="text-sm leading-relaxed whitespace-pre-wrap">
									{#if message.role === 'assistant'}
										{@html parseMarkdownBold(message.content)}
									{:else}
										{message.content}
									{/if}
								</div>
							</div>
						</div>
					{/each}

					<!-- Streaming message -->
					{#if currentStreamingText}
						<div class="flex justify-start">
							<div class="max-w-[85%] bg-neutral-100 text-neutral-700 rounded-lg px-3 py-2">
								<div class="text-sm leading-relaxed whitespace-pre-wrap">
									{@html parseMarkdownBold(currentStreamingText)}
									<span class="inline-block w-1.5 h-4 bg-neutral-600 animate-pulse ml-0.5 align-middle"></span>
								</div>
							</div>
						</div>
					{/if}

					<!-- Loading indicator -->
					{#if aiLoading && !currentStreamingText}
						<div class="flex justify-start">
							<div class="bg-neutral-100 rounded-lg px-3 py-2">
								<div class="flex gap-1">
									<span class="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
									<span class="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
									<span class="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
								</div>
							</div>
						</div>
					{/if}
				{/if}
			</div>

			<!-- Input -->
			<div class="px-4 py-3 border-t border-neutral-200 bg-neutral-50 rounded-b-lg shrink-0">
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={aiQuestion}
						placeholder="Ask about the slope..."
						disabled={aiLoading}
						class="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent disabled:opacity-50"
						onkeydown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey && aiQuestion.trim()) {
								e.preventDefault();
								sendMessage();
							}
						}}
					/>
					<button
						onclick={sendMessage}
						disabled={aiLoading || !aiQuestion.trim()}
						class="p-2 text-white bg-neutral-900 hover:bg-neutral-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						title="Send message"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

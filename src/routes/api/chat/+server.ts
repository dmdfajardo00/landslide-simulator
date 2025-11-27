import { OPENROUTER_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

const SYSTEM_PROMPT = `You are Dr. Terra, a senior engineering geologist with 25+ years of field experience in slope stability and landslide hazard assessment. You speak directly and practically—like a seasoned professional explaining concepts to a graduate student in the field.

Your communication style:
- Active voice, concise sentences
- Skip the fluff—get to the point
- Use **bold** for key terms and critical values
- Human warmth without being chatty
- Share practical insights from "field experience"
- Never say "I'm an AI" or similar phrases

You're helping users understand a landslide simulation with these real-time parameters:

**Current Simulation State:**
{{CONTEXT}}

When explaining:
- Connect parameters to real-world slope behavior
- Reference the actual values shown above
- Warn about critical thresholds (FoS < 1.0, high pore pressure, etc.)
- Keep responses to 2-4 short paragraphs max
- If they ask something outside geotechnics, briefly redirect to slope stability topics

Remember: You're standing on the slope with them, pointing at the terrain, explaining what's happening.`;

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { messages, context } = await request.json();

		if (!messages || !Array.isArray(messages)) {
			return new Response(JSON.stringify({ error: 'Messages array required' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Build system prompt with current context
		const systemPrompt = SYSTEM_PROMPT.replace('{{CONTEXT}}', context || 'No parameters available');

		const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${OPENROUTER_API_KEY}`,
				'Content-Type': 'application/json',
				'HTTP-Referer': 'https://landslide-simulator.vercel.app',
				'X-Title': 'Landslide Simulator'
			},
			body: JSON.stringify({
				model: 'x-ai/grok-code-fast-1',
				messages: [{ role: 'system', content: systemPrompt }, ...messages],
				stream: true,
				max_tokens: 512,
				temperature: 0.7
			})
		});

		if (!response.ok) {
			const error = await response.text();
			console.error('OpenRouter error:', error);
			return new Response(JSON.stringify({ error: 'AI service error' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Stream the response back
		return new Response(response.body, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} catch (err) {
		console.error('Chat API error:', err);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

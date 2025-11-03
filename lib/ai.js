// lib/ai.js

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

async function callOpenAI(prompt) {
    if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY missing');
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a concise gold market analyst writing for Indian retail investors. Use clear, simple English.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            max_tokens: 250,
            temperature: 0.4,
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenAI HTTP ${res.status}: ${text}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('No content from OpenAI');
    }
    return content.trim();
}

// Convert a simple "- point" bullet text into HTML list
function bulletsToHtml(text) {
    const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    const items = lines
        .map((line) => line.replace(/^[-•]\s*/, ''))
        .map(
            (clean) =>
                `<li>${clean.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`
        )
        .join('\n');

    return `<ul class="list-disc pl-5 space-y-1">\n${items}\n</ul>`;
}

// Main: build an AI-written gold digest (text + html)
export async function buildAIGoldDigest(marketContext) {
    const today = new Date().toISOString().slice(0, 10);

    const prompt = `
Today is ${today}.

Here is a snapshot of the market:

${marketContext}

Using this information, write a short "Gold Market Briefing" for Indian retail investors.

Rules:
- Output 4–5 bullet points.
- Focus on: what gold is doing, role of USD and USD/INR, inflation/rates, and a practical tip for jewellery buyers.
- Keep each bullet under 20 words.
- Do NOT mention that you are an AI or that this is a summary.
- Just output the bullets, each line starting with "- ".
`.trim();

    const bulletsText = await callOpenAI(prompt);

    const textBrief = `🟡 Gold Market Briefing (${today})\n\n${bulletsText}`;
    const htmlBrief = `
    <h3 class="font-semibold mb-2">Gold Market Briefing (${today})</h3>
    ${bulletsToHtml(bulletsText)}
  `.trim();

    return { textBrief, htmlBrief, date: today };
}

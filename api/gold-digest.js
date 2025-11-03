// api/gold-digest.js
import {
    fetchMarketSnapshot,
    fetchGoldNews,
    buildMarketContext,
} from '../lib/market.js';
import { buildAIGoldDigest } from '../lib/ai.js';

const GOLD_DIGEST_VERSION = 'phase6-v1-2025-11-04';

async function buildFallbackDigest() {
    const now = new Date().toISOString().slice(0, 10);

    const textBrief = `
🟡 Gold Market Briefing (${now})

• Spot gold still tracking USD and Fed expectations.
• USD/INR is the main reason local India prices can rise even when global is flat.
• Watch inflation data — higher inflation tends to support gold.
• For ornaments: 22K pricing = 24K × 0.916 + making + GST.
`.trim();

    const htmlBrief = `
    <h3 class="font-semibold mb-2">Gold Market Briefing (${now})</h3>
    <ul class="list-disc pl-5 space-y-1">
      <li>Spot gold still tracking USD and Fed expectations.</li>
      <li>USD/INR is the main reason local India prices can rise even when global is flat.</li>
      <li>Watch inflation data — higher inflation tends to support gold.</li>
      <li>For ornaments: 22K pricing = 24K × 0.916 + making + GST.</li>
    </ul>
  `.trim();

    return {
        date: now,
        text: textBrief,
        html: htmlBrief,
        source: 'fallback-static',
    };
}

export default async function handler(req, res) {
    // CORS – so browser can call directly
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        // 1) Get market data + optional headlines
        const snapshot = await fetchMarketSnapshot();
        const headlines = await fetchGoldNews();
        const context = buildMarketContext(snapshot, headlines);

        // 2) Ask AI to write the digest
        const { textBrief, htmlBrief, date } = await buildAIGoldDigest(context);

        return res.status(200).json({
            date,
            text: textBrief,
            html: htmlBrief,
            source: 'ai',
            version: GOLD_DIGEST_VERSION,
            market: {
                goldUsd: snapshot.goldUsd,
                usdInr: snapshot.usdInr,
            },
        });
    } catch (err) {
        console.error('[gold-digest] AI path failed, using fallback:', err.message);
        const fb = await buildFallbackDigest();
        return res.status(200).json({
            ...fb,
            version: GOLD_DIGEST_VERSION,
        });
    }
}

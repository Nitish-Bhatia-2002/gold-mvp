// lib/market.js

const GOLD_API_URL = process.env.GOLD_API_URL || 'https://www.goldapi.io/api/XAU/USD';
const GOLD_API_KEY = process.env.GOLD_API_KEY || '';

const FX_API_URL =
    process.env.FX_API_URL || 'https://api.exchangerate.host/latest?base=USD&symbols=INR';
const FX_API_KEY = process.env.FX_API_KEY || ''; // not used for exchangerate.host, but kept for flexibility

const NEWS_API_URL = process.env.NEWS_API_URL || 'https://newsapi.org/v2/everything';
const NEWS_API_KEY = process.env.NEWS_API_KEY || '';

async function safeJsonFetch(url, options = {}) {
    try {
        const res = await fetch(url, options);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        return await res.json();
    } catch (err) {
        console.error('[market] fetch error:', url, err.message);
        return null;
    }
}

// --- GOLD & FX SNAPSHOT ----------------------------------------------------

// Fetch spot gold price (XAUUSD) + USD/INR
export async function fetchMarketSnapshot() {
    const now = new Date();

    // --- Gold price (XAUUSD) via GoldAPI ---
    let goldUsd = null;

    if (GOLD_API_URL && GOLD_API_KEY) {
        const goldData = await safeJsonFetch(GOLD_API_URL, {
            headers: {
                'x-access-token': GOLD_API_KEY,
                Accept: 'application/json',
            },
        });

        // GoldAPI returns: { price: 2400.12, metal: "XAU", currency: "USD", ... }
        if (goldData && typeof goldData.price === 'number') {
            goldUsd = goldData.price;
        }
    }

    // Fallback if API fails / not configured
    if (!goldUsd) {
        goldUsd = 2400; // fallback spot price
    }

    // --- USD/INR via exchangerate.host (no key needed) ---
    let usdInr = null;

    if (FX_API_URL) {
        const fxData = await safeJsonFetch(FX_API_URL);

        // exchangerate.host returns: { rates: { INR: 83.9 }, ... }
        const rate = fxData?.rates?.INR;
        if (typeof rate === 'number') {
            usdInr = rate;
        }
    }

    if (!usdInr) {
        usdInr = 84.0; // fallback FX
    }

    return {
        timestamp: now.toISOString(),
        goldUsd,
        usdInr,
    };
}

// --- NEWS ------------------------------------------------------------------

// Optionally fetch a few recent gold / inflation headlines via NewsAPI
export async function fetchGoldNews() {
    if (!NEWS_API_URL || !NEWS_API_KEY) {
        return [];
    }

    const url =
        `${NEWS_API_URL}?` +
        new URLSearchParams({
            q: 'gold OR inflation',
            language: 'en',
            pageSize: '5',
            sortBy: 'publishedAt',
            apiKey: NEWS_API_KEY,
        }).toString();

    const newsData = await safeJsonFetch(url);

    if (!newsData || !Array.isArray(newsData.articles)) {
        return [];
    }

    return newsData.articles.map((a) => ({
        title: a.title || '',
        source: a.source?.name || '',
    }));
}

// --- CONTEXT BUILDER FOR AI ------------------------------------------------

// Build a short plain-text context block for the AI
export function buildMarketContext(snapshot, headlines = []) {
    const lines = [];

    lines.push(`Spot gold (XAUUSD): ${snapshot.goldUsd.toFixed(2)} USD/oz`);
    lines.push(`USD/INR: ${snapshot.usdInr.toFixed(2)} INR per USD`);

    if (headlines.length > 0) {
        lines.push('');
        lines.push('Recent headlines (gold / inflation):');
        headlines.slice(0, 3).forEach((h) => {
            lines.push(`- ${h.title} (${h.source})`);
        });
    }

    return lines.join('\n');
}

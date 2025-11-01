// api/gold.js — Vercel Serverless Function (Node 18+)
export default async function handler(req, res) {
    try {
        const API_KEY = process.env.METALPRICEAPI_KEY;
        if (!API_KEY) return res.status(500).json({ error: 'Missing METALPRICEAPI_KEY' });

        // Request USD->INR and USDXAU (USD per troy oz of gold)
        const url = `https://api.metalpriceapi.com/v1/latest?api_key=${API_KEY}&base=USD&currencies=INR,USDXAU`;
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error(`Upstream status ${r.status}`);
        const j = await r.json();

        const usdPerOunce = j?.rates?.USDXAU; // USD per troy ounce of gold
        const inrPerUsd = j?.rates?.INR;    // INR per USD
        if (!usdPerOunce || !inrPerUsd) throw new Error('API response missing USDXAU/INR');

        const TROY_G = 31.1034768;
        const inrPerOunce = usdPerOunce * inrPerUsd;
        const inrPerGram24k = inrPerOunce / TROY_G;

        // Cache at the edge for 60s; serve stale for 5 min if needed
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({
            ts: j?.timestamp || Math.floor(Date.now() / 1000),
            inrPerGram24k
        });
    } catch (err) {
        return res.status(500).json({ error: String(err) });
    }
}

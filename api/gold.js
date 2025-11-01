// api/gold.js — ROBUST VERSION
export default async function handler(req, res) {
    try {
        const API_KEY = process.env.METALPRICEAPI_KEY;
        if (!API_KEY) {
            return res.status(500).json({ error: 'Missing METALPRICEAPI_KEY env var' });
        }

        const url = `https://api.metalpriceapi.com/v1/latest?api_key=${API_KEY}&base=USD&currencies=INR,USDXAU,XAU`;
        const r = await fetch(url, { cache: 'no-store' });
        const j = await r.json();

        // if API itself failed
        if (j && j.success === false) {
            return res.status(500).json({ error: j.error || 'MetalpriceAPI said: success=false', raw: j });
        }

        const rates = j?.rates || {};

        // 1. try the ideal case: USDXAU & INR (our original plan)
        let usdPerOunce = rates.USDXAU;
        const inrPerUsd = rates.INR;

        // 2. fallback: some plans return XAU = ounces of gold per 1 USD (so we need to invert)
        if (!usdPerOunce && rates.XAU) {
            // rates.XAU = XAU per 1 USD → we need USD per 1 XAU
            usdPerOunce = 1 / rates.XAU;
        }

        if (!usdPerOunce || !inrPerUsd) {
            return res.status(500).json({
                error: 'Could not find both gold price and INR in API response',
                got: rates
            });
        }

        const TROY_G = 31.1034768;
        const inrPerOunce = usdPerOunce * inrPerUsd;
        const inrPerGram24k = inrPerOunce / TROY_G;

        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({
            ts: j?.timestamp || Math.floor(Date.now() / 1000),
            inrPerGram24k
        });

    } catch (err) {
        return res.status(500).json({ error: String(err) });
    }
}

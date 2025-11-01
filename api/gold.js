// api/gold.js — DEBUG VERSION
export default async function handler(req, res) {
    try {
        const API_KEY = process.env.METALPRICEAPI_KEY;
        if (!API_KEY) {
            return res.status(500).json({ error: 'Missing METALPRICEAPI_KEY env var' });
        }

        // call exactly what we were calling
        const url = `https://api.metalpriceapi.com/v1/latest?api_key=${API_KEY}&base=USD&currencies=INR,USDXAU`;
        const r = await fetch(url, { cache: 'no-store' });
        const j = await r.json();

        // just give me what the API sent
        return res.status(200).json({
            debug: true,
            upstream: j
        });
    } catch (err) {
        return res.status(500).json({ error: String(err) });
    }
}

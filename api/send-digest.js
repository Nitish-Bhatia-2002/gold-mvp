// api/send-digest.js
import fs from 'fs';
import path from 'path';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SITE_URL = process.env.SITE_URL || 'https://gold-mvp.vercel.app';
const FROM_EMAIL = process.env.DIGEST_FROM || 'gold-digest@example.com';

export default async function handler(req, res) {
    // only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // make sure we actually have a key
    if (!RESEND_API_KEY) {
        return res.status(500).json({ message: 'RESEND_API_KEY not set in env' });
    }

    // 1) load subscribers
    const filePath = path.join(process.cwd(), 'data', 'subscribers.json');
    let subscribers = [];
    try {
        const file = fs.readFileSync(filePath, 'utf8');
        subscribers = JSON.parse(file);
    } catch (err) {
        // if file doesn't exist or empty, just send to nobody
        subscribers = [];
    }

    // 2) get latest digest from our own API
    const digestRes = await fetch(`${SITE_URL}/api/gold-digest`);
    const digest = await digestRes.json();

    const results = [];

    // 3) send to everyone
    for (const email of subscribers) {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: email,
                subject: `Gold Digest — ${digest.date}`,
                html: digest.html || `<pre>${digest.text}</pre>`
            })
        });

        const data = await r.json();
        results.push({ email, status: r.status, data });
    }

    return res.status(200).json({
        sent: results.length,
        results
    });
}

// api/send-digest.js
import fs from 'fs';
import path from 'path';

const SEND_DIGEST_VERSION = 'phase5-v1-2025-11-03';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            sent: 0,
            reason: 'Method not allowed',
            version: SEND_DIGEST_VERSION,
        });
    }

    // 1) build subscriber list
    const subscribers = [];

    // (a) static list from file (works in dev + production read-only)
    try {
        const filePath = path.join(process.cwd(), 'data', 'subscribers.json');
        const raw = fs.readFileSync(filePath, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) subscribers.push(...list);
    } catch (err) {
        console.log('[send-digest] no subscribers.json or parse error (ok)', err?.message);
    }

    // (b) TEST_EMAIL from env (for production testing)
    if (process.env.TEST_EMAIL) {
        subscribers.push(process.env.TEST_EMAIL);
    }

    const unique = [...new Set(subscribers)];

    if (unique.length === 0) {
        return res.status(200).json({
            sent: 0,
            reason: 'no-subscribers',
            note: 'Add emails to data/subscribers.json (in Git) or set TEST_EMAIL in Vercel',
            version: SEND_DIGEST_VERSION,
        });
    }

    // 2) fetch latest digest text+html
    const base = process.env.SITE_URL || 'https://gold-mvp.vercel.app';
    const digestRes = await fetch(`${base}/api/gold-digest`);
    const digest = await digestRes.json();

    if (!RESEND_API_KEY) {
        return res.status(200).json({
            sent: 0,
            reason: 'RESEND_API_KEY missing in Vercel',
            wouldSendTo: unique,
            previewSubject: `Gold Digest — ${digest.date}`,
            version: SEND_DIGEST_VERSION,
        });
    }

    // 3) send via Resend
    const results = [];
    for (const email of unique) {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: email,
                subject: `Gold Digest — ${digest.date}`,
                html: digest.html || `<pre>${digest.text}</pre>`,
            }),
        });

        const data = await r.json();
        results.push({ email, status: r.status, data });
    }

    return res.status(200).json({
        sent: results.length,
        results,
        version: SEND_DIGEST_VERSION,
    });
}

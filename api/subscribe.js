// api/subscribe.js
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { email } = req.body || {};

    if (!email || !email.includes('@')) {
        return res.status(400).json({ message: 'Valid email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Detect Vercel / serverless production
    const isProd = !!process.env.VERCEL;

    // In production: DO NOT write to filesystem (read-only on Vercel)
    if (isProd) {
        console.log('[subscribe] production subscribe for', cleanEmail);
        // Later we can wire this into Resend contacts or a real DB.
        return res.status(200).json({
            message: 'ok',
            email: cleanEmail,
            stored: false,
            note: 'Using static mailing list + TEST_EMAIL in production',
        });
    }

    // Local dev only: use JSON file
    try {
        const filePath = path.join(process.cwd(), 'data', 'subscribers.json');

        let current = [];
        try {
            const file = fs.readFileSync(filePath, 'utf8');
            current = JSON.parse(file);
        } catch (e) {
            current = [];
        }

        if (!current.includes(cleanEmail)) {
            current.push(cleanEmail);
            fs.writeFileSync(filePath, JSON.stringify(current, null, 2));
        }

        return res.status(200).json({ message: 'ok', email: cleanEmail, stored: true });
    } catch (err) {
        console.error('[subscribe] error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
}

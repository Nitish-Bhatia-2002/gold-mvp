// api/gold-digest.js
export default async function handler(req, res) {
    const now = new Date().toISOString().slice(0, 10);

    const textBrief = `
🟡 Gold Market Briefing (${now})

• International spot gold is moving mostly on USD strength and US rate expectations.
• For Indian buyers, USD/INR remains the second big driver — even if spot is flat, INR weakness makes local gold costlier.
• Inflation prints from US/EU are being watched; surprise upside usually supports gold.
• For jewellery buyers: make sure to check 22K vs 24K pricing and making charges — dealer margins vary.
`;

    const htmlBrief = `
    <h3 class="font-semibold mb-2">Gold Market Briefing (${now})</h3>
    <ul class="list-disc pl-5 space-y-1">
      <li>Spot gold still tracking USD and Fed expectations.</li>
      <li>USD/INR is the main reason local India prices can rise even when global is flat.</li>
      <li>Watch inflation data — higher inflation tends to support gold.</li>
      <li>For ornaments: 22K pricing = 24K × 0.916 + making + GST.</li>
    </ul>
  `;

    // CORS – so Safari / other origins don't complain
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).json({
        date: now,
        text: textBrief,
        html: htmlBrief
    });
}

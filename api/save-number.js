export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid JSON' });
    }
  }
  body = body || {};

  const countryCode = String(body.countryCode || '+91').trim().slice(0, 8);
  const number = String(body.number || '').replace(/\D/g, '');

  if (!number || number.length < 7 || number.length > 15) {
    return res.status(400).json({ ok: false, error: 'Invalid mobile number' });
  }
  if (countryCode === '+91' && !/^[6-9]\d{9}$/.test(number)) {
    return res.status(400).json({ ok: false, error: 'Invalid 10-digit Indian mobile number' });
  }

  const fullNumber = `${countryCode}${number}`;
  const submittedAt = new Date().toISOString();
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : (req.socket && req.socket.remoteAddress) || 'unknown';
  const country = req.headers['x-vercel-ip-country'] || '';

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  let telegramSent = false;
  if (token && chatId) {
    const text = [
      '📱 New Mobile Number Submitted',
      `Number: ${fullNumber}`,
      `Country: ${countryCode}`,
      `Time: ${submittedAt}`,
      `IP: ${ip}${country ? ` (${country})` : ''}`
    ].join('\n');

    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text
        })
      });
      telegramSent = tgRes.ok;
    } catch {
      telegramSent = false;
    }
  }

  return res.status(201).json({ ok: true, telegramSent });
}

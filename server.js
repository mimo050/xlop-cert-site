import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';
import {
  authPaymob,
  createOrder,
  generatePaymentKey
} from './paymob.js';

const app = express();
app.use(cors());
// Save raw body for UDID plist
app.use((req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', c => data += c);
  req.on('end', () => { req.rawBody = data; next(); });
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const FRONT_URL = process.env.FRONT_URL || 'https://mimo050.github.io/xlop-cert-site';

// ===== Health =====
app.get('/healthz', (_req, res) => res.sendStatus(200));

// ====== UDID Profile ======
app.get('/udid.mobileconfig', (req, res) => {
  try {
    const file = path.join(__dirname, 'udid.mobileconfig');
    res.setHeader('Content-Type', 'application/x-apple-aspen-config');
    res.setHeader('Content-Disposition', 'attachment; filename="udid.mobileconfig"');
    res.send(readFileSync(file));
  } catch (e) {
    console.error('udid.mobileconfig error', e);
    res.status(500).send('Profile not found');
  }
});

// ====== استقبال الـ UDID والرجوع للواجهة ======
app.post('/get-udid', async (req, res) => {
  try {
    const xml = req.rawBody || '';
    let udid = '';

    try {
      const json = await parseStringPromise(xml, { explicitArray: true, mergeAttrs: true });
      const dict = json?.plist?.[0]?.dict?.[0];
      const keys = dict?.key || [];
      const strs = dict?.string || [];
      for (let i = 0; i < keys.length; i++) {
        if ((keys[i] || '').toString().trim().toUpperCase() === 'UDID') {
          udid = (strs[i] || '').toString().trim();
          break;
        }
      }
    } catch {}

    if (!udid) {
      const m = xml.match(/<key>\s*UDID\s*<\/key>\s*<string>([^<]+)<\/string>/i);
      if (m) udid = m[1].trim();
    }

    if (!udid) return res.redirect(`${FRONT_URL}/index.html?udid_error=1`);
    return res.redirect(302, `${FRONT_URL}/index.html?udid=${encodeURIComponent(udid.toUpperCase())}`);
  } catch {
    return res.redirect(`${FRONT_URL}/index.html?udid_error=1`);
  }
});

// ====== PAYMOB: إنشاء رابط دفع ======
app.post('/paymob/create-payment-link', async (req, res) => {
  try {
    const { udid, amount_cents = 5900, currency = 'SAR' } = req.body || {};
    if (!udid) return res.status(400).json({ message: 'UDID is required' });

    // 1) Auth
    const token = await authPaymob();

    // 2) Create Order (amount is in cents)
    const order = await createOrder(token, {
      amount_cents,
      currency,
      udid
    });

    // 3) Generate Payment Key (Apple Pay / OnlineCard)
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const redirectUrl = `${baseUrl}/paymob/redirect`;
    const paymentToken = await generatePaymentKey(token, {
      amount_cents,
      currency,
      order_id: order.id,
      udid,
      redirection_url: redirectUrl
    });

    // 4) Build iframe URL
    const iframeId = process.env.PAYMOB_IFRAME_ID; // مثال: 2127
    const base     = process.env.PAYMOB_BASE;      // https://ksa.paymob.com
    const iframeUrl = `${base}/api/acceptance/iframes/${iframeId}?payment_token=${paymentToken}`;

    res.json({ iframe_url: iframeUrl });
  } catch (e) {
    console.error('create-payment-link error', e);
    res.status(500).json({ message: e.message || 'Internal error' });
  }
});

// ====== PAYMOB: Webhook (اختياري، لتتبع الحالات) ======
app.post('/paymob/webhook', (req, res) => {
  try {
    console.log('[Paymob webhook]', JSON.stringify(req.body));
    res.sendStatus(200);
  } catch (e) {
    res.sendStatus(500);
  }
});

// ====== PAYMOB: نتيجة الدفع وإعادة التوجيه ======
app.get('/paymob/redirect', (req, res) => {
  try {
    const success = (req.query.success || '').toString().toLowerCase() === 'true';
    const target = success ? process.env.SUCCESS_URL : process.env.FAIL_URL;
    if (target) return res.redirect(target);
    res.status(500).send('Redirect URLs not configured');
  } catch (e) {
    console.error('paymob redirect error', e);
    res.status(500).send('Redirect error');
  }
});

// ===== Server =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
  if (!process.env.PAYMOB_API_KEY || !process.env.PAYMOB_BASE) {
    console.log('[Paymob] Env vars missing → تخطي تهيئة Paymob. السيرفر سيعمل لميزة UDID فقط.');
  }
  console.log('==> Your service is live 🎉');
});

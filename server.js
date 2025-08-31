import express from 'express';
import { parseStringPromise } from 'xml2js';
import forge from 'node-forge';

const app = express();
const PORT = process.env.PORT || 8080;
const FRONT_URL  = process.env.FRONT_URL || 'https://mimo050.github.io/xlop-cert-site';
const BACK_TITLE = 'Xlop Certificates';

// نحتاج rawBody (Apple ترسل XML/Plist)
app.use((req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', c => data += c);
  req.on('end', () => { req.rawBody = data; next(); });
});

app.get('/', (_, res) => res.type('text/plain').send('OK'));
app.get('/healthz', (_req, res) => res.sendStatus(200));

// ======= util: توقيع PKCS#7 (CMS) غير منفصل (nodetach) =======
function signMobileconfigIfPossible(plistString) {
  const certPem = process.env.SIGN_CERT_PEM;
  const keyPem  = process.env.SIGN_KEY_PEM;
  if (!certPem || !keyPem) return null;

  try {
    const cert = forge.pki.certificateFromPem(certPem);
    const privateKey = forge.pki.privateKeyFromPem(keyPem);

    const p7 = forge.pkcs7.createSignedData();
    // المحتوى هو نص الـ plist نفسه (ليس Detached)
    p7.content = forge.util.createBuffer(plistString, 'utf8');
    p7.addSigner({
      key: privateKey,
      certificate: cert,
      digestAlgorithm: forge.pki.oids.sha256
    });
    p7.addCertificate(cert);

    // سلسلة شهادات إضافية؟ (اختياري)
    if (process.env.SIGN_CHAIN_PEM) {
      const chain = process.env.SIGN_CHAIN_PEM.split('-----END CERTIFICATE-----')
        .filter(Boolean)
        .map(p => (p + '-----END CERTIFICATE-----').trim());
      for (const pem of chain) {
        try { p7.addCertificate(forge.pki.certificateFromPem(pem)); } catch {}
      }
    }

    p7.sign({ detached: false }); // VERY IMPORTANT: غير منفصل

    const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
    return Buffer.from(der, 'binary');
  } catch (e) {
    console.error('[signMobileconfigIfPossible] signing error:', e.message);
    return null;
  }
}

// ======= تنزيل ملف التعريف (موقّع إذا أمكن) =======
app.get('/udid.mobileconfig', (req, res) => {
  const receiveUrl = `${req.protocol}://${req.get('host')}/get-udid`;
  const mobileconfigPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <dict>
    <key>URL</key>
    <string>${receiveUrl}</string>
    <key>DeviceAttributes</key>
    <array>
      <string>UDID</string>
      <string>IMEI</string>
      <string>ICCID</string>
      <string>VERSION</string>
      <string>PRODUCT</string>
      <string>SERIAL</string>
    </array>
  </dict>
  <key>PayloadOrganization</key>
  <string>${BACK_TITLE}</string>
  <key>PayloadDisplayName</key>
  <string>${BACK_TITLE} — UDID Fetch</string>
  <key>PayloadDescription</key>
  <string>يُستخدم هذا الملف لجلب رقم جهازك UDID وإرجاعك للموقع تلقائيًا.</string>
  <key>PayloadIdentifier</key>
  <string>com.xlop.udid.${Date.now()}</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Profile Service</string>
  <key>PayloadUUID</key>
  <string>${'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random()*16|0, v = c==='x'?r:(r&0x3|0x8); return v.toString(16);
  })}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>`;

  // حاول التوقيع (PKCS#7 DER). إن لم تتوفر الشهادة نرسل الـ plist خام.
  const signed = signMobileconfigIfPossible(mobileconfigPlist);

  res.setHeader('Content-Disposition', 'attachment; filename="Xlop-UDID.mobileconfig"');
  if (signed) {
    // ملف موقّع DER
    res.setHeader('Content-Type', 'application/x-apple-aspen-config');
    return res.send(signed);
  } else {
    // غير موقّع (للتجربة فقط)
    res.setHeader('Content-Type', 'application/x-apple-aspen-config; charset=utf-8');
    return res.send(mobileconfigPlist);
  }
});

// ======= استقبال الـ UDID والرجوع للواجهة =======
app.post('/get-udid', async (req, res) => {
  try {
    const xml = req.rawBody || '';
    let udid = '';

    // xml2js أولاً
    try {
      const json = await parseStringPromise(xml, { explicitArray: true, mergeAttrs: true });
      const dict = json?.plist?.[0]?.dict?.[0];
      const keys = dict?.key || [];
      const strs = dict?.string || [];
      for (let i = 0; i < keys.length; i++) {
        if ((keys[i] || '').toString().trim().toUpperCase() === 'UDID') {
          udid = (strs[i] || '').toString().trim(); break;
        }
      }
    } catch {}

    // Fallback Regex
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

// ========= 3) (اختياري) نقاط Paymob — لا تُعرقل التشغيل إن لم تتوفر =========
const requiredPaymob = ['PAYMOB_BASE','PAYMOB_API_KEY','PAYMOB_IFRAME_ID','PAYMOB_APPLE_INTEGRATION_ID','SUCCESS_URL','FAIL_URL'];
const hasPaymob = requiredPaymob.every(k => !!process.env[k]);

if (!hasPaymob) {
  console.warn('[Paymob] Env vars missing → تخطّي تهيئة Paymob مؤقتًا. السيرفر سيعمل لميزة UDID فقط.');
  // يمكنك لاحقًا إضافة المسارات هنا عندما تتوفر المتغيرات
} else {
  // ضع هنا تكامل Paymob الحقيقي عندما تريد تفعيله
  // مثال: app.post('/paymob/webhook', ...)
}

app.listen(PORT, () => console.log('Server running on', PORT));

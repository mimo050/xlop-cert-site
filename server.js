import express from 'express';
import { parseStringPromise } from 'xml2js';

const app = express();
const PORT = process.env.PORT || 8080;

// ========= إعدادات أساسية =========
const FRONT_URL  = process.env.FRONT_URL  || 'https://mimo050.github.io/xlop-cert-site';
const BACK_TITLE = 'Xlop Certificates';

// ========= Middlewares بسيطة =========
// نحتاج rawBody (Apple ترسل XML/Plist)
app.use((req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', c => data += c);
  req.on('end', () => { req.rawBody = data; next(); });
});

// صحّة السيرفر
app.get('/', (_, res) => res.type('text/plain').send('OK'));

// ========= 1) إرسال ملف التعريف لجلب الـ UDID =========
app.get('/udid.mobileconfig', (req, res) => {
  const receiveUrl = `${req.protocol}://${req.get('host')}/get-udid`;

  const mobileconfig = `<?xml version="1.0" encoding="UTF-8"?>
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

  res.setHeader('Content-Type', 'application/x-apple-aspen-config');
  res.setHeader('Content-Disposition', 'attachment; filename="Xlop-UDID.mobileconfig"');
  res.send(mobileconfig);
});

// ========= 2) استقبال الـ UDID من iOS ثم Redirect =========
app.post('/get-udid', async (req, res) => {
  try {
    const xml = req.rawBody || '';
    const json = await parseStringPromise(xml, { explicitArray: false });
    // استخراج مبسّط
    let udid = '';
    // كثير من الأجهزة ترسله داخل plist/dict/UDID أو داخل مفاتيح أخرى
    const dict = json?.plist?.dict || {};
    // نحاول نمسك كل القيم المتاحة كمفاتيح مباشرة
    for (const k of Object.keys(dict)) {
      if ((k || '').toUpperCase() === 'UDID') {
        udid = dict[k];
      }
    }
    // فشل؟ رجّع للواجهة برسالة خطأ
    if (!udid) return res.redirect(`${FRONT_URL}/index.html?udid_error=1`);
    // نجاح → رجّع المستخدم ومعه رقم الجهاز
    return res.redirect(302, `${FRONT_URL}/index.html?udid=${encodeURIComponent(String(udid).toUpperCase())}`);
  } catch (e) {
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

app.listen(PORT, () => console.log(`Server running on :${PORT}`));

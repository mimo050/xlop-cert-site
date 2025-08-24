# xlop-cert-site

واجهة ثابتة على GitHub Pages لاستخراج UDID وربطها مع باك-إند PHP خارجي.

## gbox.run deep-link (placeholder)

- الشكل النهائي: `https://gbox.run/deeplink?udid={UDID}&token={TOKEN}&callback={URL}`
- المعلمات:
  - `udid`: رقم تعريف الجهاز.
  - `token`: رمز التحقق من الدفع.
  - `callback`: (اختياري) رابط يعاد التوجيه إليه بعد التثبيت.
- عند توفير `callback` سيتم إعادة التوجيه إليه مع البارامتر `status`.

### مثال طلب/استجابة مستقبلية
**الطلب:**
`GET https://gbox.run/deeplink?udid=EXAMPLE_UDID&token=EXAMPLE_TOKEN&callback=https://example.com/return`

**الاستجابة:**
`302 Location: https://example.com/return?status=ok`

### تعليمات النشر المختصرة
- الواجهة: GitHub Pages.
- الباك-إند: استضافة PHP خارجية.

## Backend PHP
- الواجهة تُنشر على GitHub Pages.
- الباك-إند يُرفع على استضافة PHP (000webhost/InfinityFree…).
- استبدل `PHP_BASE_URL` في رابط الزر بعد معرفة الرابط الفعلي.
- التدفّق: يفتح `profile.php` → يثبّت البروفايل على iPhone → iOS يرسل POST إلى `get-udid.php` → إعادة توجيه إلى `success.html?udid=…`.

## خطوات نشر الباك-إند وربط الواجهة
1. أنشئ حسابًا مجانيًا في 000webhost أو InfinityFree.
2. افتح File Manager وارفع محتويات مجلد `public/` من `backend-dist.zip` إلى `public_html`.
3. بعد الرفع، افتح `public/config.php` على السيرفر واستبدل:
   - `FRONT_URL` برابط مشروع الواجهة على GitHub Pages.
4. انسخ رابط الموقع الناتج كـ `PHP_BASE_URL` (مثال: `https://yourapp.000webhostapp.com`).
5. عدّل رابط زر **Get UDID** في `index.html` باستبدال `PHP_BASE_URL` الحقيقي، ثم قم بعمل commit:
   `fix(frontend): set PHP_BASE_URL to actual backend host`.
6. اختبر من iPhone: نزّل البروفايل وثبّته → يجب أن يتم تحويلك إلى
   `FRONT_URL/success.html?udid=XXXX`.

### أمر اختبار cURL
```bash
curl -X POST "PHP_BASE_URL/get-udid.php" \
  -H "Content-Type: application/x-apple-aspen-device-information" \
  --data-binary '<plist><dict><key>UDID</key><string>TEST-UDID-123</string></dict></plist>' -i
```
يجب أن يرجع 302 إلى `FRONT_URL/success.html?udid=TEST-UDID-123`.

<?php
/**
 * get-udid.php
 * يولّد ملف mobileconfig من نوع Profile Service.
 * عند التثبيت، iOS سيرسل POST إلى $POST_URL.
 */

// ===== إعدادات =====
$POST_URL = "https://api.xlop.com/udid.php";   // عدّلها لو احتجت
$PROFILE_DISPLAY_NAME = "Xlop – Get UDID";
$PROFILE_DESCRIPTION  = "Temporary profile to fetch your device UDID.";
// ====================

// تهيئة UUID عشوائي
function gen_uuid() {
  // بدون com_create_guid لتوافق أوسع
  $data = random_bytes(16);
  $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
  $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
$uuid = strtoupper(gen_uuid());

// نبني الـ payload كـ XML (plist)
header("Content-Type: application/x-apple-aspen-config");
header("Content-Disposition: attachment; filename=get_udid.mobileconfig");

$xml = '<?xml version="1.0" encoding="UTF-8"?>' . "
";
$xml .= '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">' . "
";
$xml .= '<plist version="1.0">' . "
";
$xml .= '  <dict>' . "
";
$xml .= '    <key>PayloadContent</key>' . "
";
$xml .= '    <array>' . "
";
$xml .= '      <dict>' . "
";
$xml .= '        <key>URL</key><string>' . htmlspecialchars($POST_URL, ENT_QUOTES, 'UTF-8') . '</string>' . "
";
$xml .= '        <key>DeviceAttributes</key>' . "
";
$xml .= '        <array>' . "
";
foreach (["UDID","IMEI","ICCID","VERSION","PRODUCT","SERIAL"] as $attr) {
  $xml .= '          <string>'.$attr.'</string>' . "
";
}
$xml .= '        </array>' . "
";
$xml .= '        <key>PayloadVersion</key><integer>1</integer>' . "
";
$xml .= '        <key>PayloadIdentifier</key><string>com.xlop.udid.profile-service</string>' . "
";
$xml .= '        <key>PayloadUUID</key><string>'.$uuid.'</string>' . "
";
$xml .= '        <key>PayloadType</key><string>Profile Service</string>' . "
";
$xml .= '        <key>PayloadDisplayName</key><string>'.htmlspecialchars($PROFILE_DISPLAY_NAME, ENT_QUOTES, 'UTF-8').'</string>' . "
";
$xml .= '        <key>PayloadDescription</key><string>'.htmlspecialchars($PROFILE_DESCRIPTION, ENT_QUOTES, 'UTF-8').'</string>' . "
";
$xml .= '      </dict>' . "
";
$xml .= '    </array>' . "
";
$xml .= '    <key>PayloadDisplayName</key><string>'.htmlspecialchars($PROFILE_DISPLAY_NAME, ENT_QUOTES, 'UTF-8').'</string>' . "
";
$xml .= '    <key>PayloadIdentifier</key><string>com.xlop.udid</string>' . "
";
$xml .= '    <key>PayloadRemovalDisallowed</key><false/>' . "
";
$xml .= '    <key>PayloadType</key><string>Configuration</string>' . "
";
$xml .= '    <key>PayloadUUID</key><string>'.$uuid.'</string>' . "
";
$xml .= '    <key>PayloadVersion</key><integer>1</integer>' . "
";
$xml .= '  </dict>' . "
";
$xml .= '</plist>' . "
";

echo $xml;

<?php
/**
 * udid.php
 * يستقبل POST (PKCS#7 DER) من iOS، يفكّه بالـ OpenSSL، ويستخرج الـ UDID.
 * ثم يعيد توجيه المستخدم لواجهة الفرونت إند مع ?udid=
 */

// ===== إعدادات =====
$FRONTEND_RETURN_URL = "https://mimo050.github.io/gbox-cert/index.html"; // عدّلها إذا تغيّر المسار
$ENABLE_LOG = false;                         // اجعله true لتفعيل اللوج
$LOG_FILE   = __DIR__ . "/udid.log";         // ملف اللوج
// ====================

function log_line($s){
  global $ENABLE_LOG, $LOG_FILE;
  if($ENABLE_LOG){
    @file_put_contents($LOG_FILE, "[".date("c")."] ".$s.PHP_EOL, FILE_APPEND);
  }
}

$raw = file_get_contents("php://input");
if(!$raw){
  http_response_code(400);
  echo "No data received.";
  exit;
}

$in  = tempnam(sys_get_temp_dir(), "xlop_in_") . ".der";
$out = tempnam(sys_get_temp_dir(), "xlop_out_") . ".plist";
file_put_contents($in, $raw);

// نفك التوقيع بدون تحقق من الشهادات (iOS يوقع لكن التحقق غير ضروري هنا)
$cmd = "openssl smime -verify -noverify -inform DER -in ".escapeshellarg($in)." -out ".escapeshellarg($out)." 2>&1";
exec($cmd, $o, $ret);
log_line("OpenSSL ret=$ret cmd=$cmd");
if($ret !== 0){
  log_line("OpenSSL output: ".implode("\n",$o));
}

// نقرأ الـ plist الناتج
$plist = @file_get_contents($out);
@unlink($in);
@unlink($out);

if(!$plist){
  http_response_code(400);
  echo "Failed to parse payload.";
  exit;
}

// نطلّع القيم المطلوبة
function extract_plist_string($plist, $key){
  if(preg_match('/<key>'.preg_quote($key, '/').'<\/key>\s*<string>([^<]+)<\/string>/i', $plist, $m)){
    return $m[1];
  }
  return null;
}

$udid   = extract_plist_string($plist, "UDID");
$serial = extract_plist_string($plist, "SERIAL");
$product= extract_plist_string($plist, "PRODUCT");

if(!$udid){
  http_response_code(400);
  echo "UDID not found.";
  exit;
}

log_line("UDID=$udid SERIAL=$serial PRODUCT=$product");

// نعيد المستخدم للفرونت إند
$redir = $FRONTEND_RETURN_URL . "?udid=" . urlencode($udid);
header("Location: $redir");
echo "<html><body>UDID captured: ".htmlspecialchars($udid)." <br> <a href='".htmlspecialchars($redir)."'>Continue</a></body></html>";

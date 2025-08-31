// testEnv.js
console.log("=== Environment Variables Check ===");

if (process.env.SIGN_CERT_PEM) {
  console.log("✅ SIGN_CERT_PEM موجود");
} else {
  console.log("❌ SIGN_CERT_PEM غير موجود");
}

if (process.env.SIGN_KEY_PEM) {
  console.log("✅ SIGN_KEY_PEM موجود");
} else {
  console.log("❌ SIGN_KEY_PEM غير موجود");
}

console.log("=== نهاية الفحص ===");

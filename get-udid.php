<?php
// get-udid.php
// Outputs a signed mobile configuration profile to collect the device UDID

$profile = <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <dict>
        <key>URL</key>
        <string>https://api.bedpage.com/udid.php</string>
        <key>DeviceAttributes</key>
        <array>
            <string>UDID</string>
        </array>
    </dict>
    <key>PayloadOrganization</key>
    <string>XLop</string>
    <key>PayloadDisplayName</key>
    <string>Get Device UDID</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
    <key>PayloadUUID</key>
    <string>e4f726c7-9b72-4f28-8fcd-3ff257f4bdf4</string>
    <key>PayloadIdentifier</key>
    <string>com.xlop.profile.udid</string>
    <key>PayloadDescription</key>
    <string>Installs a profile service to obtain the device UDID</string>
    <key>PayloadType</key>
    <string>Profile Service</string>
</dict>
</plist>
XML;

$cert = 'file://path/to/certificate.pem'; // replace with actual certificate path
$privkey = 'file://path/to/private.key'; // replace with actual private key path
$passphrase = ''; // set passphrase if the private key is protected

$tempIn = tempnam(sys_get_temp_dir(), 'profile');
$tempOut = tempnam(sys_get_temp_dir(), 'signed');
file_put_contents($tempIn, $profile);

if (openssl_pkcs7_sign(
        $tempIn,
        $tempOut,
        $cert,
        [$privkey, $passphrase],
        [],
        PKCS7_BINARY | PKCS7_DETACHED
    )) {
    $signed = file_get_contents($tempOut);
    $parts = explode("\n\n", $signed, 2);
    $pkcs7 = $parts[1] ?? '';
    header('Content-Type: application/x-apple-aspen-config');
    header('Content-Disposition: attachment; filename="udid.mobileconfig"');
    echo $pkcs7;
} else {
    http_response_code(500);
    echo 'Failed to sign profile';
}

unlink($tempIn);
unlink($tempOut);

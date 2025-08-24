<?php
// udid.php
// Receives signed POSTed profile response, extracts UDID and redirects to the front-end.

$hasSignatureContentType = stripos($_SERVER['CONTENT_TYPE'], 'application/pkcs7-signature') === 0; // Partial match to avoid rejecting valid requests with extra parameters
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !$hasSignatureContentType) {
    http_response_code(400);
    echo 'Invalid request';
    exit;
}

$payload = file_get_contents('php://input');
$tempIn = tempnam(sys_get_temp_dir(), 'payload');
file_put_contents($tempIn, $payload);

// Use openssl to decode the PKCS#7 signature and obtain the embedded XML
$cmd = 'openssl smime -inform DER -verify -noverify -in ' . escapeshellarg($tempIn);
$xml = shell_exec($cmd);
unlink($tempIn);

if (!$xml) {
    http_response_code(500);
    echo 'Failed to decode payload';
    exit;
}

// Parse the XML for the UDID value
$udid = '';
$doc = new DOMDocument();
if (@$doc->loadXML($xml)) {
    $keys = $doc->getElementsByTagName('key');
    foreach ($keys as $key) {
        if ($key->nodeValue === 'UDID') {
            $node = $key->nextSibling;
            while ($node && $node->nodeType !== XML_ELEMENT_NODE) {
                $node = $node->nextSibling;
            }
            $udid = $node ? trim($node->nodeValue) : '';
            break;
        }
    }
}

if ($udid) {
    // Use FRONT_URL from environment or fall back to the public GitHub Pages URL
    $frontend = getenv('FRONT_URL') ?: 'https://mimo050.github.io/xlop-cert-site';
    $frontend = rtrim($frontend, '/');
    header('Location: ' . $frontend . '/?udid=' . urlencode($udid));
    exit;
}

http_response_code(500);
echo 'UDID not found';

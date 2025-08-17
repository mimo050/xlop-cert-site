<?php
// udid.php
// Receives signed POSTed profile response, extracts UDID and redirects to the front-end.

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || $_SERVER['CONTENT_TYPE'] !== 'application/pkcs7-signature') {
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
    $frontend = 'https://xlop.com/'; // replace with your front-end domain
    header('Location: ' . $frontend . '?udid=' . urlencode($udid));
    exit;
}

http_response_code(500);
echo 'UDID not found';

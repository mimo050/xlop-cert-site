<?php
// webhook_paymob.php
// Handle Paymob payment webhook: verify HMAC, store transaction state, and send notification.

// Secret key for HMAC verification (set via environment variable to avoid committing secrets)
$secret = getenv('PAYMOB_HMAC_SECRET') ?: '';

// Retrieve HMAC from headers or request parameters
$receivedHmac = $_SERVER['HTTP_HMAC'] ?? $_GET['hmac'] ?? ($_POST['hmac'] ?? '');

$rawInput = file_get_contents('php://input');
if (!$secret || !$receivedHmac) {
    http_response_code(400);
    echo 'Missing HMAC or secret';
    exit;
}

$computedHmac = hash_hmac('sha512', $rawInput, $secret);
if (!hash_equals($computedHmac, $receivedHmac)) {
    http_response_code(401);
    echo 'Invalid HMAC';
    exit;
}

$data = json_decode($rawInput, true);
if (!$data) {
    http_response_code(400);
    echo 'Invalid JSON payload';
    exit;
}

// Determine transaction identifier
$txnId = $data['id'] ?? ($data['obj']['id'] ?? uniqid('txn_'));

// Store the transaction state in JSON file
$storeFile = __DIR__ . '/paymob_transactions.json';
$transactions = [];
if (file_exists($storeFile)) {
    $transactions = json_decode(file_get_contents($storeFile), true) ?: [];
}
$transactions[$txnId] = [
    'timestamp' => time(),
    'payload'   => $data,
];
file_put_contents($storeFile, json_encode($transactions, JSON_PRETTY_PRINT));

// The stored state can later be consulted to redirect users after payment activation.

// Send Telegram notification if credentials are available
$botToken = getenv('TELEGRAM_BOT_TOKEN');
$chatId   = getenv('TELEGRAM_CHAT_ID');
if ($botToken && $chatId) {
    $message = 'Paymob txn ' . $txnId . ' received.';
    $url = 'https://api.telegram.org/bot' . $botToken . '/sendMessage';
    $params = http_build_query(['chat_id' => $chatId, 'text' => $message]);
    @file_get_contents($url . '?' . $params);
}

// Response for Paymob
http_response_code(200);
echo 'Webhook processed';

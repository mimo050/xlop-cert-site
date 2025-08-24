const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// List of allowed iframe URL patterns
const ALLOWED_IFRAME_PATTERNS = [
  /^https:\/\/[^/]*paymob\.com\/acceptance\/iframes\//,
];

// Redirects to provided iframe URL
app.get('/pay/card', (req, res) => {
  const iframeUrl = req.query.iframe;
  if (!iframeUrl) {
    return res.status(400).send('Missing iframe query parameter');
  }
  const isAllowed = ALLOWED_IFRAME_PATTERNS.some(pattern => pattern.test(iframeUrl));
  if (!isAllowed) {
    return res.status(400).send('Invalid iframe URL');
  }
  res.redirect(iframeUrl);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// List of allowed iframe hostnames
const ALLOWED_IFRAME_HOSTNAMES = [
  'paymob.com', // Explicitly allow the root domain
];

// Redirects to provided iframe URL
app.get('/pay/card', (req, res) => {
  const iframeUrl = req.query.iframe;
  if (!iframeUrl) {
    return res.status(400).send('Missing iframe query parameter');
  }
  let url;
  try {
    url = new URL(iframeUrl);
  } catch (err) {
    return res.status(400).send('Invalid iframe URL');
  }

  const hostname = url.hostname;
  const isAllowed =
    hostname.endsWith('.paymob.com') ||
    ALLOWED_IFRAME_HOSTNAMES.includes(hostname);

  if (!isAllowed) {
    return res.status(400).send('Invalid iframe URL');
  }

  res.redirect(iframeUrl);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

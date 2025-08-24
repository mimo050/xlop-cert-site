const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Redirects to provided iframe URL
app.get('/pay/card', (req, res) => {
  const iframeUrl = req.query.iframe;
  if (!iframeUrl) {
    return res.status(400).send('Missing iframe query parameter');
  }
  res.redirect(iframeUrl);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

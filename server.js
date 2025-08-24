const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(express.json());

app.post('/paymob/create', async (req, res) => {
  const { email, udid, method } = req.body;
  try {
    const auth = await axios.post('https://accept.paymob.com/api/auth/tokens', {
      api_key: process.env.PAYMOB_API_KEY
    });
    const authToken = auth.data.token;

    const order = await axios.post('https://accept.paymob.com/api/ecommerce/orders', {
      auth_token: authToken,
      delivery_needed: false,
      amount_cents: process.env.AMOUNT_CENTS,
      currency: process.env.CURRENCY,
      merchant_order_id: udid || crypto.randomUUID(),
      items: []
    });
    const orderId = order.data.id;

    const integrationId = method === 'applepay'
      ? process.env.PAYMOB_APPLEPAY_INTEGRATION_ID
      : process.env.PAYMOB_CARD_INTEGRATION_ID;

    const payment = await axios.post('https://accept.paymob.com/api/acceptance/payment_keys', {
      auth_token: authToken,
      amount_cents: process.env.AMOUNT_CENTS,
      expiration: 3600,
      order_id: orderId,
      billing_data: {
        email,
        first_name: 'NA',
        last_name: 'NA',
        phone_number: 'NA',
        country: 'NA',
        city: 'NA',
        street: 'NA',
        building: 'NA',
        floor: 'NA',
        apartment: 'NA',
        postal_code: 'NA',
        state: 'NA',
        shipping_method: 'NA'
      },
      currency: process.env.CURRENCY,
      integration_id: integrationId
    });
    const paymentKey = payment.data.token;

    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;
    res.json({ iframeUrl });
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

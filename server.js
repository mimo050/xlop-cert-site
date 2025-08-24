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

function flatten(obj, result = {}) {
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, result);
    } else {
      result[key] = value;
    }
  });
  return result;
}

app.post('/paymob/webhook', (req, res) => {
  const hmac = req.body.hmac || req.get('hmac');
  const fields = flatten({ ...req.body });
  delete fields.hmac;
  const sorted = Object.keys(fields)
    .sort()
    .map((k) => fields[k])
    .join('');
  const expectedHmac = crypto
    .createHmac('sha512', process.env.PAYMOB_HMAC_SECRET)
    .update(sorted)
    .digest('hex');

  if (expectedHmac === hmac) {
    const success = req.body.obj?.success;
    console.log(
      `Paymob webhook ${success ? 'success' : 'failure'}`,
      req.body.obj
    );
    return res.sendStatus(200);
  }

  return res.sendStatus(401);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

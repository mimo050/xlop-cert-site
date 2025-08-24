require('dotenv').config();
const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const crypto = require('crypto');

const {
  PAYMOB_BASE,
  PAYMOB_API_KEY,
  PAYMOB_IFRAME_ID,
  PAYMOB_CARD_INTEGRATION_ID,
  PAYMOB_APPLE_INTEGRATION_ID,
  SUCCESS_URL,
  FAIL_URL,
} = process.env;

const app = express();
app.use(express.json());
app.use(morgan('dev'));

const paymob = axios.create({
  baseURL: PAYMOB_BASE,
  headers: { 'Content-Type': 'application/json' },
});

async function getAuthToken() {
  const { data } = await paymob.post('/auth/tokens', { api_key: PAYMOB_API_KEY });
  return data.token;
}

async function createOrder(token, amountCents, merchantOrderId) {
  const { data } = await paymob.post(
    '/ecommerce/orders',
    {
      delivery_needed: false,
      amount_cents: amountCents,
      currency: 'EGP',
      merchant_order_id: merchantOrderId || crypto.randomUUID(),
      items: [],
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data.id;
}

function fillBilling(data = {}) {
  return {
    first_name: 'NA',
    last_name: 'NA',
    email: 'NA',
    phone_number: 'NA',
    street: 'NA',
    building: 'NA',
    floor: 'NA',
    apartment: 'NA',
    city: 'NA',
    state: 'NA',
    country: 'NA',
    postal_code: 'NA',
    shipping_method: 'NA',
    ...data,
  };
}

async function getPaymentKey(token, amountCents, orderId, integrationId, billingData) {
  const { data } = await paymob.post(
    '/acceptance/payment_keys',
    {
      amount_cents: amountCents,
      expiration: 3600,
      order_id: orderId,
      currency: 'EGP',
      integration_id: integrationId,
      billing_data: fillBilling(billingData),
    },
    { headers: { Authorization: `Bearer ${token}` } },
  );
  return data.token;
}

function computeAmountCents(amount) {
  const num = Number(amount);
  if (!num || isNaN(num)) throw new Error('Invalid amount');
  return Math.round(num * 100);
}

async function pay(req, res, integrationId) {
  try {
    const amountCents = computeAmountCents(req.query.amount);
    const token = await getAuthToken();
    const orderId = await createOrder(token, amountCents, req.query.order);
    const paymentToken = await getPaymentKey(token, amountCents, orderId, integrationId, { email: req.query.email });
    const iframe = `${PAYMOB_BASE}/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`;
    res.redirect(iframe);
  } catch (err) {
    const reason = encodeURIComponent(err.response?.data?.message || err.message);
    res.redirect(`${FAIL_URL}?reason=${reason}`);
  }
}

app.get('/pay/card', (req, res) => pay(req, res, PAYMOB_CARD_INTEGRATION_ID));
app.get('/pay/apple', (req, res) => pay(req, res, PAYMOB_APPLE_INTEGRATION_ID));

app.post('/webhook', (req, res) => {
  console.log('Webhook received', req.body);
  res.sendStatus(200);
});

app.get('/health', (_req, res) => res.send('ok'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const morgan = require('morgan');
const crypto = require('crypto');
const cors = require('cors');

const {
  PAYMOB_BASE,
  PAYMOB_API_KEY,
  PAYMOB_IFRAME_ID,
  PAYMOB_APPLE_INTEGRATION_ID,
  SUCCESS_URL,
  FAIL_URL,
} = process.env;

function ensureEnv(vars) {
  const missing = Object.entries(vars)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    console.error('Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
}

ensureEnv({
  PAYMOB_BASE,
  PAYMOB_API_KEY,
  PAYMOB_IFRAME_ID,
  PAYMOB_APPLE_INTEGRATION_ID,
  SUCCESS_URL,
  FAIL_URL,
});

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ['https://mimo050.github.io', 'https://mimo050.github.io/xlop-cert-site'],
    methods: ['POST', 'GET'],
  }),
);
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

function appendQuery(base, params) {
  const url = new URL(base);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) url.searchParams.set(k, v);
  });
  return url.toString();
}

async function pay(req, res, integrationId) {
  try {
    const amountCents = computeAmountCents(req.body.amount);
    const token = await getAuthToken();
    const orderId = await createOrder(token, amountCents, req.body.order);
    const paymentToken = await getPaymentKey(token, amountCents, orderId, integrationId, { email: req.body.email });
    const extra = new URLSearchParams();
    ['email', 'udid', 'token'].forEach(k => {
      if (req.body[k]) extra.set(k, req.body[k]);
    });
    const iframe = `${PAYMOB_BASE}/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentToken}${extra.toString() ? `&${extra}` : ''}`;
    res.redirect(iframe);
  } catch (err) {
    const reason = err.response?.data?.message || err.message;
    console.error('Payment failed:', reason);
    res.redirect(appendQuery(FAIL_URL, { ...req.body, reason }));
  }
}

app.post('/pay/apple', (req, res) => pay(req, res, PAYMOB_APPLE_INTEGRATION_ID));

function forward(url) {
  return (req, res) => {
    res.redirect(appendQuery(url, req.query));
  };
}

app.get('/pay/success', forward(SUCCESS_URL));
app.get('/pay/fail', forward(FAIL_URL));

app.post('/log-failure', (req, res) => {
  console.error('Client failure reported:', req.body);
  res.sendStatus(200);
});

app.post('/webhook', (req, res) => {
  console.log('Webhook received', req.body);
  res.sendStatus(200);
});

app.get('/health', (_req, res) => res.send('ok'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

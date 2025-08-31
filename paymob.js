import fetch from 'node-fetch';

const BASE   = process.env.PAYMOB_BASE;                 // e.g. https://ksa.paymob.com
const APIKEY = process.env.PAYMOB_API_KEY;              // من Paymob
const INTG_ID = process.env.PAYMOB_APPLE_INTEGRATION_ID; // Integration ID (apple pay - payment link)
const SUCCESS_URL = process.env.SUCCESS_URL;            // صفحات GitHub Pages
const FAIL_URL    = process.env.FAIL_URL;

// 1) Auth → token
export async function authPaymob() {
  const url = `${BASE}/api/auth/tokens`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ api_key: APIKEY })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Paymob auth failed');
  return data.token;
}

// 2) Create order
export async function createOrder(token, { amount_cents, currency, udid }) {
  const url = `${BASE}/api/ecommerce/orders`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      auth_token: token,
      delivery_needed: false,
      amount_cents,
      currency,
      items: [],
      // نرسل الـ UDID في merchant_order_id أو shipping data (اختياري للتتبع)
      merchant_order_id: `udid-${udid}-${Date.now()}`
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Create order failed');
  return data;
}

// 3) Payment key
export async function generatePaymentKey(token, { amount_cents, currency, order_id, udid }) {
  const url = `${BASE}/api/acceptance/payment_keys`;
  const billing_data = {
    apartment: 'NA',
    email: 'na@example.com',
    floor: 'NA',
    first_name: 'UDID',
    street: 'NA',
    building: 'NA',
    phone_number: '+201000000000',
    shipping_method: 'NA',
    postal_code: '00000',
    city: 'NA',
    country: 'SA',
    last_name: udid.slice(0, 10),
    state: 'NA'
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      auth_token: token,
      amount_cents,
      expiration: 3600,
      order_id,
      currency,
      integration_id: Number(INTG_ID),
      billing_data,
      lock_order_when_paid: true,
      // صفحات الرجوع
      redirection_url: SUCCESS_URL, // Paymob قد يرجع حسب الإعدادات أيضاً
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Payment key failed');
  return data.token;
}

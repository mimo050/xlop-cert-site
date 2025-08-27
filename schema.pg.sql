-- schema.pg.sql — PostgreSQL

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EGP',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS license_keys (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  is_sold BOOLEAN NOT NULL DEFAULT FALSE,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  sold_to_email TEXT,
  sold_at TIMESTAMP,
  order_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  email TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EGP',
  paymob_order_id BIGINT,
  status TEXT NOT NULL DEFAULT 'pending',
  delivered_key TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- فهارس مفيدة
CREATE INDEX IF NOT EXISTS idx_license_available
  ON license_keys(product_id) WHERE is_sold = FALSE AND is_revoked = FALSE;

CREATE INDEX IF NOT EXISTS idx_orders_paymob ON orders(paymob_order_id);

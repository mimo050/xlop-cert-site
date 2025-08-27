-- seed.pg.sql — sample product + keys

INSERT INTO products (name, price_cents, currency)
VALUES ('Pro License', 10000, 'EGP')
ON CONFLICT DO NOTHING;

-- خذ id المنتج الأول
WITH p AS (
  SELECT id FROM products WHERE name='Pro License' LIMIT 1
)
INSERT INTO license_keys (product_id, code)
SELECT p.id, v.code
FROM p
JOIN (VALUES
  ('PRO-AAAAA-11111'),
  ('PRO-BBBBB-22222'),
  ('PRO-CCCCC-33333'),
  ('PRO-DDDDD-44444')
) AS v(code) ON TRUE
ON CONFLICT (code) DO NOTHING;

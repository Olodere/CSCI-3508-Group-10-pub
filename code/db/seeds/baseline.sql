-- Seed: baseline reference data
-- Intent: populate the dev and test environments with the same set of
-- services, default availability windows, and travel-fee tiers that the
-- salon would configure through the admin UI.
-- Idempotent: ON CONFLICT DO NOTHING on every INSERT.
-- Applied by `make seed` (dev) and `run-tests.sh` (test).
-- NOT applied to production — production data is configured by the salon.

-- Services (name is the natural key, enforced by UNIQUE)
INSERT INTO services (name, description, price_cents, duration_minutes, sort_order) VALUES
    ('Classic Manicure', 'Shape, cuticle care, polish.', 3500, 45, 10),
    ('Gel Manicure',     'Long-lasting gel polish.',     5000, 60, 20),
    ('Classic Pedicure', 'Soak, scrub, shape, polish.',  4500, 60, 30),
    ('Gel Pedicure',     'Gel polish pedicure.',         6000, 75, 40),
    ('Nail Art',         'Add-on custom nail art.',      1500, 30, 50)
ON CONFLICT (name) DO NOTHING;

-- Default weekly availability (day_of_week + start_time + end_time is the key)
INSERT INTO availability_defaults (day_of_week, start_time, end_time) VALUES
    (2, '09:00', '17:00'),
    (3, '09:00', '17:00'),
    (4, '09:00', '17:00'),
    (5, '09:00', '17:00'),
    (6, '10:00', '16:00')
ON CONFLICT (day_of_week, start_time, end_time) DO NOTHING;

-- Travel fee tiers (name is the natural key)
INSERT INTO travel_fee_rules (name, fee_cents, min_distance_miles, max_distance_miles) VALUES
    ('Local (0–5 mi)',        500,  0,  5),
    ('Nearby (5–10 mi)',     1000,  5, 10),
    ('Extended (10–20 mi)',  2000, 10, 20)
ON CONFLICT (name) DO NOTHING;
-- CFP Products Seed Migration 002
-- Authoritative product catalogue and initial inventory levels

INSERT INTO products (id, name, sku, category, price, active, inventory_quantity, image_url)
VALUES 
    ('c1', 'Ragi Sticks', 'CFP-CRU-01', 'Crunchies', 99.00, true, 250, 'Ragi Sticks  Product image.png'),
    ('c2', 'Bajra Chivda', 'CFP-CRU-02', 'Crunchies', 99.00, true, 200, 'Bajra Chivda product image.png'),
    ('c3', 'Jowar Chips', 'CFP-CRU-03', 'Crunchies', 99.00, true, 220, 'Jowar Chips product image.png'),
    ('c4', 'Jowar Chivda', 'CFP-CRU-04', 'Crunchies', 99.00, true, 180, 'Jowar Chivda product image.png'),
    ('b1', 'Ragi Ladoo', 'CFP-BIT-01', 'Sweet Bites', 199.00, true, 150, 'Ragi Ladoo product image.png'),
    ('b2', 'Millet Ladoo', 'CFP-BIT-02', 'Sweet Bites', 199.00, true, 140, 'Millet Ladoo product image.png'),
    ('b3', 'Millet Cookies', 'CFP-BIT-03', 'Sweet Bites', 99.00, true, 160, 'Millet Cookies product image.png'),
    ('b4', 'Millet Nutri Bar', 'CFP-BIT-04', 'Sweet Bites', 49.00, true, 300, 'Millet Nutri Bar product image.png'),
    ('t1', 'Turmeric Fingers', 'CFP-TUR-01', 'Pure Turmeric', 149.00, true, 120, 'Turmeric Fingers product image.png'),
    ('t2', 'Turmeric Powder', 'CFP-TUR-02', 'Pure Turmeric', 99.00, true, 150, 'Turmeric Powder product image.png'),
    ('p1', 'Super Millet Chatpata Crunch', 'CFP-POW-01', 'Crunchies', 149.00, true, 180, 'Super Millet Chatpata Crunch product image.png'),
    ('p2', 'Roasted Ragi & Cheese Puffs', 'CFP-POW-02', 'Crunchies', 129.00, true, 175, 'Roasted Ragi & Cheese Puffs product image.png')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sku = EXCLUDED.sku,
    category = EXCLUDED.category,
    price = EXCLUDED.price,
    active = EXCLUDED.active,
    inventory_quantity = EXCLUDED.inventory_quantity,
    image_url = EXCLUDED.image_url;

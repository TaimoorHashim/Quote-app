INSERT IGNORE INTO rates (task_code, description, unit, unit_price, min_qty, max_qty) VALUES
('PAINT_INT_WALL', 'Paint interior walls (2 coats)', 'm2',   8.50,  1, 500),
('PAINT_CEILING',  'Paint ceiling (2 coats)',        'm2',   9.00,  1, 300),
('TILE_FLOOR',     'Supply and lay floor tiles',     'm2',  55.00,  1, 200),
('SKIRTING_FIT',   'Fit skirting board',             'm',    6.00,  1, 300),
('DOOR_HANG',      'Hang interior door',             'item', 90.00, 1,  20);
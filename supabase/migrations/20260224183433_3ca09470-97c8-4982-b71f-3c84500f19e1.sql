
-- Add Hockey and Women's Basketball sports
INSERT INTO public.sports (id, key, label, ruleset_version_id, sort_order) VALUES
  (gen_random_uuid(), 'hockey', 'Hockey', 'a0000000-0000-0000-0000-000000000001', 4),
  (gen_random_uuid(), 'wnba', 'Women''s Basketball', 'a0000000-0000-0000-0000-000000000001', 5)
ON CONFLICT DO NOTHING;

-- Delete existing players to replace with CSV data
DELETE FROM players WHERE ruleset_version_id = 'a0000000-0000-0000-0000-000000000001';

-- Baseball players from CSV
INSERT INTO public.players (name, sport_key, ruleset_version_id, sort_order, source_meta, tags) VALUES
  ('Shohei Ohtani', 'baseball', 'a0000000-0000-0000-0000-000000000001', 1, '{}', '[]'),
  ('Aaron Judge', 'baseball', 'a0000000-0000-0000-0000-000000000001', 2, '{}', '[]'),
  ('Bobby Witt Jr', 'baseball', 'a0000000-0000-0000-0000-000000000001', 3, '{"note":"RC 2022"}', '["rc"]'),
  ('Julio Rodriguez', 'baseball', 'a0000000-0000-0000-0000-000000000001', 4, '{"note":"RC 2022"}', '["rc"]'),
  ('Jasson Dominguez', 'baseball', 'a0000000-0000-0000-0000-000000000001', 5, '{"note":"RC 2024"}', '["rc"]'),
  ('Elly De La Cruz', 'baseball', 'a0000000-0000-0000-0000-000000000001', 6, '{"note":"RC 2024"}', '["rc"]'),
  ('Jackson Holliday', 'baseball', 'a0000000-0000-0000-0000-000000000001', 7, '{"note":"2024 S2 SP RC / BC 1st"}', '["rc"]'),
  ('James Wood', 'baseball', 'a0000000-0000-0000-0000-000000000001', 8, '{"note":"2025 Topps S1"}', '["rc"]'),
  ('Jackson Chourio', 'baseball', 'a0000000-0000-0000-0000-000000000001', 9, '{"note":"2024 RC"}', '["rc"]'),
  ('Walker Jenkins', 'baseball', 'a0000000-0000-0000-0000-000000000001', 10, '{"note":"2024 Bowman"}', '[]'),
  ('Jackson Merrill', 'baseball', 'a0000000-0000-0000-0000-000000000001', 11, '{"note":"2024 RC"}', '["rc"]'),
  ('Junior Caminero', 'baseball', 'a0000000-0000-0000-0000-000000000001', 12, '{"note":"2024 RC"}', '["rc"]'),
  ('Max Clark', 'baseball', 'a0000000-0000-0000-0000-000000000001', 13, '{"note":"2023 BC 1st"}', '[]'),
  ('Jacob Wilson', 'baseball', 'a0000000-0000-0000-0000-000000000001', 14, '{"note":"2023 BC 1st / 2025 RC"}', '["rc"]'),
  ('Aidan Miller', 'baseball', 'a0000000-0000-0000-0000-000000000001', 15, '{"note":"2024 Bowman"}', '[]'),
  ('Paul Skenes', 'baseball', 'a0000000-0000-0000-0000-000000000001', 16, '{"note":"2024 RC"}', '["rc"]'),
  ('Justin Crawford', 'baseball', 'a0000000-0000-0000-0000-000000000001', 17, '{"note":"2023 BC 1st"}', '[]');

-- Football players from CSV
INSERT INTO public.players (name, sport_key, ruleset_version_id, sort_order, source_meta, tags) VALUES
  ('Patrick Mahomes', 'football', 'a0000000-0000-0000-0000-000000000001', 1, '{}', '[]'),
  ('Josh Allen', 'football', 'a0000000-0000-0000-0000-000000000001', 2, '{}', '[]'),
  ('Justin Herbert', 'football', 'a0000000-0000-0000-0000-000000000001', 3, '{}', '[]'),
  ('Justin Jefferson', 'football', 'a0000000-0000-0000-0000-000000000001', 4, '{}', '[]'),
  ('Brock Purdy', 'football', 'a0000000-0000-0000-0000-000000000001', 5, '{"note":"2022"}', '["rc"]'),
  ('Jalen Hurts', 'football', 'a0000000-0000-0000-0000-000000000001', 6, '{}', '[]'),
  ('Bijan Robinson', 'football', 'a0000000-0000-0000-0000-000000000001', 7, '{}', '["rc"]'),
  ('Puka Nacua', 'football', 'a0000000-0000-0000-0000-000000000001', 8, '{}', '["rc"]'),
  ('Jahmyr Gibbs', 'football', 'a0000000-0000-0000-0000-000000000001', 9, '{}', '["rc"]'),
  ('Jaxson Dart', 'football', 'a0000000-0000-0000-0000-000000000001', 10, '{}', '["rc"]'),
  ('Ashton Jeanty', 'football', 'a0000000-0000-0000-0000-000000000001', 11, '{}', '["rc"]'),
  ('Tyler Warren', 'football', 'a0000000-0000-0000-0000-000000000001', 12, '{}', '["rc"]'),
  ('Brock Bowers', 'football', 'a0000000-0000-0000-0000-000000000001', 13, '{}', '["rc"]'),
  ('Brian Thomas Jr', 'football', 'a0000000-0000-0000-0000-000000000001', 14, '{}', '["rc"]'),
  ('Jayden Daniels', 'football', 'a0000000-0000-0000-0000-000000000001', 15, '{}', '["rc"]'),
  ('Drake Maye', 'football', 'a0000000-0000-0000-0000-000000000001', 16, '{}', '["rc"]'),
  ('Bo Nix', 'football', 'a0000000-0000-0000-0000-000000000001', 17, '{}', '["rc"]'),
  ('Travis Hunter', 'football', 'a0000000-0000-0000-0000-000000000001', 18, '{}', '["rc"]'),
  ('Caleb Williams', 'football', 'a0000000-0000-0000-0000-000000000001', 19, '{}', '["rc"]'),
  ('Marvin Harrison Jr', 'football', 'a0000000-0000-0000-0000-000000000001', 20, '{}', '["rc"]'),
  ('Treyveon Henderson', 'football', 'a0000000-0000-0000-0000-000000000001', 21, '{}', '["rc"]');

-- Basketball players from CSV
INSERT INTO public.players (name, sport_key, ruleset_version_id, sort_order, source_meta, tags) VALUES
  ('Stephen Curry', 'basketball', 'a0000000-0000-0000-0000-000000000001', 1, '{}', '[]'),
  ('Austin Reaves', 'basketball', 'a0000000-0000-0000-0000-000000000001', 2, '{}', '[]'),
  ('Paolo Banchero', 'basketball', 'a0000000-0000-0000-0000-000000000001', 3, '{}', '["rc"]'),
  ('Luka Doncic', 'basketball', 'a0000000-0000-0000-0000-000000000001', 4, '{}', '[]'),
  ('LeBron James', 'basketball', 'a0000000-0000-0000-0000-000000000001', 5, '{}', '[]'),
  ('Anthony Edwards', 'basketball', 'a0000000-0000-0000-0000-000000000001', 6, '{}', '[]'),
  ('Cade Cunningham', 'basketball', 'a0000000-0000-0000-0000-000000000001', 7, '{}', '["rc"]'),
  ('Victor Wembanyama', 'basketball', 'a0000000-0000-0000-0000-000000000001', 8, '{}', '["rc"]'),
  ('Brandon Miller', 'basketball', 'a0000000-0000-0000-0000-000000000001', 9, '{}', '["rc"]'),
  ('Amen Thompson', 'basketball', 'a0000000-0000-0000-0000-000000000001', 10, '{}', '["rc"]'),
  ('Stephon Castle', 'basketball', 'a0000000-0000-0000-0000-000000000001', 11, '{}', '["rc"]'),
  ('Cooper Flagg', 'basketball', 'a0000000-0000-0000-0000-000000000001', 12, '{}', '["rc"]'),
  ('Kon Knueppel', 'basketball', 'a0000000-0000-0000-0000-000000000001', 13, '{}', '["rc"]'),
  ('Alexandre Sarr', 'basketball', 'a0000000-0000-0000-0000-000000000001', 14, '{}', '["rc"]'),
  ('Matas Buzelis', 'basketball', 'a0000000-0000-0000-0000-000000000001', 15, '{}', '["rc"]'),
  ('Dylan Harper', 'basketball', 'a0000000-0000-0000-0000-000000000001', 16, '{}', '["rc"]'),
  ('Jared McCain', 'basketball', 'a0000000-0000-0000-0000-000000000001', 17, '{}', '["rc"]'),
  ('Tre Johnson', 'basketball', 'a0000000-0000-0000-0000-000000000001', 18, '{}', '["rc"]');

-- Hockey players from CSV
INSERT INTO public.players (name, sport_key, ruleset_version_id, sort_order, source_meta, tags) VALUES
  ('Cale Makar', 'hockey', 'a0000000-0000-0000-0000-000000000001', 1, '{}', '[]'),
  ('Igor Shesterkin', 'hockey', 'a0000000-0000-0000-0000-000000000001', 2, '{}', '[]'),
  ('Jack Hughes', 'hockey', 'a0000000-0000-0000-0000-000000000001', 3, '{}', '[]'),
  ('Nick Suzuki', 'hockey', 'a0000000-0000-0000-0000-000000000001', 4, '{}', '[]'),
  ('Jason Robertson', 'hockey', 'a0000000-0000-0000-0000-000000000001', 5, '{}', '[]'),
  ('Kirill Kaprizov', 'hockey', 'a0000000-0000-0000-0000-000000000001', 6, '{}', '[]'),
  ('Cole Caufield', 'hockey', 'a0000000-0000-0000-0000-000000000001', 7, '{}', '[]'),
  ('Jeremy Swayman', 'hockey', 'a0000000-0000-0000-0000-000000000001', 8, '{}', '[]'),
  ('Moritz Seider', 'hockey', 'a0000000-0000-0000-0000-000000000001', 9, '{}', '["rc"]'),
  ('Trevor Zegras', 'hockey', 'a0000000-0000-0000-0000-000000000001', 10, '{}', '[]'),
  ('Matty Beniers', 'hockey', 'a0000000-0000-0000-0000-000000000001', 11, '{}', '["rc"]'),
  ('Matt Boldy', 'hockey', 'a0000000-0000-0000-0000-000000000001', 12, '{}', '["rc"]'),
  ('Juraj Slafkovsky', 'hockey', 'a0000000-0000-0000-0000-000000000001', 13, '{}', '["rc"]'),
  ('Wyatt Johnston', 'hockey', 'a0000000-0000-0000-0000-000000000001', 14, '{}', '["rc"]'),
  ('Luke Hughes', 'hockey', 'a0000000-0000-0000-0000-000000000001', 15, '{}', '["rc"]'),
  ('Matthew Knies', 'hockey', 'a0000000-0000-0000-0000-000000000001', 16, '{}', '["rc"]'),
  ('Brock Faber', 'hockey', 'a0000000-0000-0000-0000-000000000001', 17, '{}', '["rc"]'),
  ('Connor Bedard', 'hockey', 'a0000000-0000-0000-0000-000000000001', 18, '{}', '["rc"]'),
  ('Leo Carlsson', 'hockey', 'a0000000-0000-0000-0000-000000000001', 19, '{}', '["rc"]'),
  ('Macklin Celebrini', 'hockey', 'a0000000-0000-0000-0000-000000000001', 20, '{}', '["rc"]'),
  ('Matvei Michkov', 'hockey', 'a0000000-0000-0000-0000-000000000001', 21, '{}', '["rc"]'),
  ('Lane Hutson', 'hockey', 'a0000000-0000-0000-0000-000000000001', 22, '{}', '["rc"]'),
  ('Logan Stankoven', 'hockey', 'a0000000-0000-0000-0000-000000000001', 23, '{}', '["rc"]'),
  ('Ivan Demidov', 'hockey', 'a0000000-0000-0000-0000-000000000001', 24, '{}', '["rc"]');

-- WNBA players from CSV
INSERT INTO public.players (name, sport_key, ruleset_version_id, sort_order, source_meta, tags) VALUES
  ('Breanna Stewart', 'wnba', 'a0000000-0000-0000-0000-000000000001', 1, '{}', '[]'),
  ('Kelsey Plum', 'wnba', 'a0000000-0000-0000-0000-000000000001', 2, '{}', '[]'),
  ('Aja Wilson', 'wnba', 'a0000000-0000-0000-0000-000000000001', 3, '{}', '[]'),
  ('Sabrina Ionescu', 'wnba', 'a0000000-0000-0000-0000-000000000001', 4, '{}', '[]'),
  ('Caitlin Clark', 'wnba', 'a0000000-0000-0000-0000-000000000001', 5, '{}', '["rc"]'),
  ('Angel Reese', 'wnba', 'a0000000-0000-0000-0000-000000000001', 6, '{}', '["rc"]'),
  ('Cameron Brink', 'wnba', 'a0000000-0000-0000-0000-000000000001', 7, '{}', '["rc"]'),
  ('Rickea Jackson', 'wnba', 'a0000000-0000-0000-0000-000000000001', 8, '{}', '["rc"]'),
  ('Kamilla Cardoso', 'wnba', 'a0000000-0000-0000-0000-000000000001', 9, '{}', '["rc"]'),
  ('Paige Bueckers', 'wnba', 'a0000000-0000-0000-0000-000000000001', 10, '{}', '["rc"]'),
  ('JuJu Watkins', 'wnba', 'a0000000-0000-0000-0000-000000000001', 11, '{}', '[]'),
  ('Hannah Hidalgo', 'wnba', 'a0000000-0000-0000-0000-000000000001', 12, '{}', '[]');

-- Add missing brands/traits for hockey and wnba
DELETE FROM rule_items WHERE ruleset_version_id = 'a0000000-0000-0000-0000-000000000001';

INSERT INTO public.rule_items (kind, label, sport_key, ruleset_version_id, priority, tokens, is_default) VALUES
  -- Baseball brands
  ('brand', 'Topps', 'baseball', 'a0000000-0000-0000-0000-000000000001', 100, '["topps"]', true),
  ('brand', 'Topps Chrome', 'baseball', 'a0000000-0000-0000-0000-000000000001', 95, '["topps","chrome"]', false),
  ('brand', 'Bowman Chrome', 'baseball', 'a0000000-0000-0000-0000-000000000001', 90, '["bowman","chrome"]', false),
  ('brand', 'Bowman 1st', 'baseball', 'a0000000-0000-0000-0000-000000000001', 85, '["bowman","1st"]', false),
  -- Baseball traits
  ('trait', 'Rookie Card', 'baseball', 'a0000000-0000-0000-0000-000000000001', 100, '["rc","rookie"]', false),
  ('trait', 'Auto', 'baseball', 'a0000000-0000-0000-0000-000000000001', 90, '["auto","autograph"]', false),
  ('trait', 'Refractor', 'baseball', 'a0000000-0000-0000-0000-000000000001', 80, '["refractor"]', false),
  ('trait', 'Numbered', 'baseball', 'a0000000-0000-0000-0000-000000000001', 70, '["numbered","/"]', false),
  ('trait', 'SP/SSP', 'baseball', 'a0000000-0000-0000-0000-000000000001', 75, '["sp","ssp","variation"]', false),

  -- Football brands
  ('brand', 'Prizm', 'football', 'a0000000-0000-0000-0000-000000000001', 100, '["prizm"]', true),
  ('brand', 'Donruss Optic', 'football', 'a0000000-0000-0000-0000-000000000001', 90, '["donruss","optic"]', false),
  ('brand', 'Mosaic', 'football', 'a0000000-0000-0000-0000-000000000001', 85, '["mosaic"]', false),
  ('brand', 'Select', 'football', 'a0000000-0000-0000-0000-000000000001', 80, '["select"]', false),
  ('brand', 'Contenders', 'football', 'a0000000-0000-0000-0000-000000000001', 75, '["contenders"]', false),
  -- Football traits
  ('trait', 'Rookie Card', 'football', 'a0000000-0000-0000-0000-000000000001', 100, '["rc","rookie"]', false),
  ('trait', 'Silver Prizm', 'football', 'a0000000-0000-0000-0000-000000000001', 95, '["silver","prizm"]', false),
  ('trait', 'Auto', 'football', 'a0000000-0000-0000-0000-000000000001', 90, '["auto","autograph"]', false),
  ('trait', 'Color Blast', 'football', 'a0000000-0000-0000-0000-000000000001', 85, '["color blast"]', false),
  ('trait', 'Downtown', 'football', 'a0000000-0000-0000-0000-000000000001', 80, '["downtown"]', false),
  ('trait', 'Numbered', 'football', 'a0000000-0000-0000-0000-000000000001', 70, '["numbered","/"]', false),

  -- Basketball brands
  ('brand', 'Prizm', 'basketball', 'a0000000-0000-0000-0000-000000000001', 100, '["prizm"]', true),
  ('brand', 'Donruss Optic', 'basketball', 'a0000000-0000-0000-0000-000000000001', 90, '["donruss","optic"]', false),
  ('brand', 'Mosaic', 'basketball', 'a0000000-0000-0000-0000-000000000001', 85, '["mosaic"]', false),
  ('brand', 'Select', 'basketball', 'a0000000-0000-0000-0000-000000000001', 80, '["select"]', false),
  ('brand', 'Contenders', 'basketball', 'a0000000-0000-0000-0000-000000000001', 75, '["contenders"]', false),
  ('brand', 'Topps Chrome', 'basketball', 'a0000000-0000-0000-0000-000000000001', 70, '["topps","chrome"]', false),
  -- Basketball traits
  ('trait', 'Rookie Card', 'basketball', 'a0000000-0000-0000-0000-000000000001', 100, '["rc","rookie"]', false),
  ('trait', 'Silver Prizm', 'basketball', 'a0000000-0000-0000-0000-000000000001', 95, '["silver","prizm"]', false),
  ('trait', 'Auto', 'basketball', 'a0000000-0000-0000-0000-000000000001', 90, '["auto","autograph"]', false),
  ('trait', 'Color Blast', 'basketball', 'a0000000-0000-0000-0000-000000000001', 85, '["color blast"]', false),
  ('trait', 'Downtown', 'basketball', 'a0000000-0000-0000-0000-000000000001', 80, '["downtown"]', false),
  ('trait', 'Numbered', 'basketball', 'a0000000-0000-0000-0000-000000000001', 70, '["numbered","/"]', false),

  -- Hockey brands
  ('brand', 'Upper Deck', 'hockey', 'a0000000-0000-0000-0000-000000000001', 100, '["upper deck"]', true),
  ('brand', 'SP Authentic', 'hockey', 'a0000000-0000-0000-0000-000000000001', 90, '["sp authentic"]', false),
  -- Hockey traits
  ('trait', 'Young Guns', 'hockey', 'a0000000-0000-0000-0000-000000000001', 100, '["young guns"]', false),
  ('trait', 'Future Watch', 'hockey', 'a0000000-0000-0000-0000-000000000001', 90, '["future watch"]', false),
  ('trait', 'Auto', 'hockey', 'a0000000-0000-0000-0000-000000000001', 85, '["auto","autograph"]', false),
  ('trait', 'Exclusives', 'hockey', 'a0000000-0000-0000-0000-000000000001', 80, '["exclusives","high gloss"]', false),

  -- WNBA brands
  ('brand', 'Prizm', 'wnba', 'a0000000-0000-0000-0000-000000000001', 100, '["prizm"]', true),
  ('brand', 'Select', 'wnba', 'a0000000-0000-0000-0000-000000000001', 90, '["select"]', false),
  ('brand', 'Bowman University', 'wnba', 'a0000000-0000-0000-0000-000000000001', 85, '["bowman","university"]', false),
  ('brand', 'Panini', 'wnba', 'a0000000-0000-0000-0000-000000000001', 80, '["panini"]', false),
  -- WNBA traits
  ('trait', 'Rookie Card', 'wnba', 'a0000000-0000-0000-0000-000000000001', 100, '["rc","rookie"]', false),
  ('trait', 'Auto', 'wnba', 'a0000000-0000-0000-0000-000000000001', 90, '["auto","autograph"]', false),
  ('trait', 'Silver Prizm', 'wnba', 'a0000000-0000-0000-0000-000000000001', 85, '["silver","prizm"]', false);

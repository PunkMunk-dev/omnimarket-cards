-- TCG Targets table
CREATE TABLE public.tcg_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL,
  name text NOT NULL,
  priority integer NOT NULL DEFAULT 0,
  tags text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- TCG Traits table
CREATE TABLE public.tcg_traits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL,
  trait text NOT NULL,
  search_terms text NOT NULL,
  weight integer NOT NULL DEFAULT 0,
  rarity_tier text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- TCG Sets table
CREATE TABLE public.tcg_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL,
  set_name text NOT NULL,
  weight integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Watchlist table (device-based, no auth needed)
CREATE TABLE public.tcg_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  game text NOT NULL,
  query text NOT NULL,
  listing_id text,
  listing_title text,
  listing_price text,
  listing_image text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tcg_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tcg_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tcg_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tcg_watchlist ENABLE ROW LEVEL SECURITY;

-- Public read for reference tables
CREATE POLICY "Public read tcg_targets" ON public.tcg_targets FOR SELECT USING (true);
CREATE POLICY "Public read tcg_traits" ON public.tcg_traits FOR SELECT USING (true);
CREATE POLICY "Public read tcg_sets" ON public.tcg_sets FOR SELECT USING (true);

-- Watchlist: public CRUD (device-id based)
CREATE POLICY "Public access tcg_watchlist" ON public.tcg_watchlist FOR ALL USING (true) WITH CHECK (true);

-- Seed Pokemon targets
INSERT INTO public.tcg_targets (game, name, priority) VALUES
  ('pokemon', 'Charizard', 100),
  ('pokemon', 'Pikachu', 95),
  ('pokemon', 'Mewtwo', 85),
  ('pokemon', 'Umbreon', 80),
  ('pokemon', 'Rayquaza', 75),
  ('pokemon', 'Lugia', 70),
  ('pokemon', 'Gengar', 65),
  ('pokemon', 'Eevee', 60);

-- Seed One Piece targets
INSERT INTO public.tcg_targets (game, name, priority) VALUES
  ('one_piece', 'Luffy', 100),
  ('one_piece', 'Shanks', 95),
  ('one_piece', 'Zoro', 90),
  ('one_piece', 'Nami', 80),
  ('one_piece', 'Ace', 75),
  ('one_piece', 'Law', 70),
  ('one_piece', 'Yamato', 65),
  ('one_piece', 'Boa Hancock', 60);

-- Seed Pokemon traits
INSERT INTO public.tcg_traits (game, trait, search_terms, weight, rarity_tier) VALUES
  ('pokemon', 'Holo', 'holo|holographic', 10, 'holo'),
  ('pokemon', 'Reverse Holo', 'reverse holo', 8, 'common'),
  ('pokemon', 'Full Art', 'full art', 30, 'rare'),
  ('pokemon', 'Alt Art', 'alt art|alternate art', 90, 'ultra_rare'),
  ('pokemon', 'SAR', 'SAR|special art rare', 80, 'ultra_rare'),
  ('pokemon', 'SIR', 'SIR|special illustration rare', 85, 'ultra_rare'),
  ('pokemon', 'Gold', 'gold|golden', 50, 'rare'),
  ('pokemon', 'Rainbow', 'rainbow|hyper rare', 60, 'rare'),
  ('pokemon', 'Secret Rare', 'secret rare', 40, 'rare'),
  ('pokemon', 'Trophy', 'trophy', 100, 'legendary'),
  ('pokemon', '1st Edition Base', '1st edition base set', 95, 'legendary'),
  ('pokemon', 'Gold Star', 'gold star', 90, 'legendary');

-- Seed One Piece traits
INSERT INTO public.tcg_traits (game, trait, search_terms, weight, rarity_tier) VALUES
  ('one_piece', 'Leader', 'leader', 30, 'rare'),
  ('one_piece', 'SP', 'SP|special', 50, 'ultra_rare'),
  ('one_piece', 'Manga', 'manga rare|manga', 70, 'ultra_rare'),
  ('one_piece', 'Parallel', 'parallel', 60, 'ultra_rare'),
  ('one_piece', 'Alt Art', 'alt art|alternate art', 80, 'ultra_rare');

-- Seed Pokemon sets
INSERT INTO public.tcg_sets (game, set_name, weight) VALUES
  ('pokemon', 'Prismatic Evolutions', 100),
  ('pokemon', 'Surging Sparks', 90),
  ('pokemon', 'Scarlet & Violet 151', 85),
  ('pokemon', 'Crown Zenith', 80),
  ('pokemon', 'Evolving Skies', 75),
  ('pokemon', 'Brilliant Stars', 70),
  ('pokemon', 'Base Set', 65),
  ('pokemon', 'Base Set Shadowless', 60),
  ('pokemon', 'Paldean Fates', 55),
  ('pokemon', 'Temporal Forces', 50);

-- Seed One Piece sets
INSERT INTO public.tcg_sets (game, set_name, weight) VALUES
  ('one_piece', 'OP01', 100),
  ('one_piece', 'OP02', 90),
  ('one_piece', 'OP03', 85),
  ('one_piece', 'OP04', 80),
  ('one_piece', 'OP05', 75),
  ('one_piece', 'OP06', 70),
  ('one_piece', 'OP07', 65),
  ('one_piece', 'OP08', 60),
  ('one_piece', 'OP09', 55);
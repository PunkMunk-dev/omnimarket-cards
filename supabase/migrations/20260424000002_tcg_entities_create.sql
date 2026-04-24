-- Create tcg_entities if it was never applied via the initial migration.
-- The previous migration (20260422161439) only ALTERs the table, so if the
-- table didn't exist in production the guided-search Chase dropdown would be empty.
-- This migration is safe to run on a DB that already has the table.

CREATE TABLE IF NOT EXISTS public.tcg_entities (
  id         uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text  NOT NULL,
  slug       text  NOT NULL,
  category   text  NOT NULL,
  sort_order int   NOT NULL DEFAULT 0
);

ALTER TABLE public.tcg_entities ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tcg_entities' AND policyname = 'Public read tcg_entities'
  ) THEN
    CREATE POLICY "Public read tcg_entities"
      ON public.tcg_entities FOR SELECT USING (true);
  END IF;
END $$;

-- Unique constraint required for the ON CONFLICT below
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tcg_entities_slug_category_key'
  ) THEN
    ALTER TABLE public.tcg_entities
      ADD CONSTRAINT tcg_entities_slug_category_key UNIQUE (slug, category);
  END IF;
END $$;

-- Add sort_order column if the table already existed without it
ALTER TABLE public.tcg_entities ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

-- Upsert full entity list (idempotent)
INSERT INTO public.tcg_entities (name, slug, category, sort_order) VALUES
  ('Charizard',   'charizard',   'pokemon',    1),
  ('Pikachu',     'pikachu',     'pokemon',    2),
  ('Mewtwo',      'mewtwo',      'pokemon',    3),
  ('Umbreon',     'umbreon',     'pokemon',    4),
  ('Rayquaza',    'rayquaza',    'pokemon',    5),
  ('Lugia',       'lugia',       'pokemon',    6),
  ('Gengar',      'gengar',      'pokemon',    7),
  ('Eevee',       'eevee',       'pokemon',    8),
  ('Blastoise',   'blastoise',   'pokemon',    9),
  ('Venusaur',    'venusaur',    'pokemon',   10),
  ('Mew',         'mew',         'pokemon',   11),
  ('Alakazam',    'alakazam',    'pokemon',   12),
  ('Luffy',       'luffy',       'one_piece',  1),
  ('Shanks',      'shanks',      'one_piece',  2),
  ('Zoro',        'zoro',        'one_piece',  3),
  ('Nami',        'nami',        'one_piece',  4),
  ('Ace',         'ace',         'one_piece',  5),
  ('Law',         'law',         'one_piece',  6),
  ('Yamato',      'yamato',      'one_piece',  7),
  ('Boa Hancock', 'boa-hancock', 'one_piece',  8)
ON CONFLICT (slug, category)
  DO UPDATE SET sort_order = EXCLUDED.sort_order, name = EXCLUDED.name;

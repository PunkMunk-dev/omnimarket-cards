
-- =============================================
-- Sports Card Lab Schema
-- =============================================

-- 1. Create enum for app roles (if not exists)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. RLS policies for user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- Core Tables
-- =============================================

-- 5. Ruleset Versions
CREATE TABLE public.ruleset_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    version text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    change_notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz,
    created_by uuid REFERENCES auth.users(id)
);

-- Unique partial index: only one published version
CREATE UNIQUE INDEX one_published_ruleset ON public.ruleset_versions ((true)) WHERE status = 'published';

ALTER TABLE public.ruleset_versions ENABLE ROW LEVEL SECURITY;

-- 6. Sports
CREATE TABLE public.sports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ruleset_version_id uuid REFERENCES public.ruleset_versions(id) ON DELETE CASCADE NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    UNIQUE (ruleset_version_id, key)
);

ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;

-- 7. Players
CREATE TABLE public.players (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ruleset_version_id uuid REFERENCES public.ruleset_versions(id) ON DELETE CASCADE NOT NULL,
    sport_key text NOT NULL,
    name text NOT NULL,
    note text,
    tags jsonb NOT NULL DEFAULT '[]'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    sort_order int NOT NULL DEFAULT 0,
    source_meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_players_ruleset_sport ON public.players (ruleset_version_id, sport_key);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- 8. Rule Items
CREATE TABLE public.rule_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ruleset_version_id uuid REFERENCES public.ruleset_versions(id) ON DELETE CASCADE NOT NULL,
    sport_key text NOT NULL,
    kind text NOT NULL,
    label text NOT NULL,
    tokens jsonb NOT NULL DEFAULT '[]'::jsonb,
    priority int NOT NULL DEFAULT 0,
    is_default boolean NOT NULL DEFAULT false,
    url text,
    is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_rule_items_ruleset_sport_kind ON public.rule_items (ruleset_version_id, sport_key, kind);

ALTER TABLE public.rule_items ENABLE ROW LEVEL SECURITY;

-- 9. Seller Blacklist
CREATE TABLE public.seller_blacklist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ruleset_version_id uuid REFERENCES public.ruleset_versions(id) ON DELETE CASCADE NOT NULL,
    pattern text NOT NULL,
    label text,
    is_active boolean NOT NULL DEFAULT true,
    priority int NOT NULL DEFAULT 0
);

CREATE INDEX idx_seller_blacklist_ruleset ON public.seller_blacklist (ruleset_version_id);

ALTER TABLE public.seller_blacklist ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies for Core Tables
-- =============================================

-- Ruleset Versions
CREATE POLICY "Public can view published rulesets"
ON public.ruleset_versions
FOR SELECT
USING (status = 'published');

CREATE POLICY "Admins can manage all rulesets"
ON public.ruleset_versions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sports
CREATE POLICY "Public can view sports from published rulesets"
ON public.sports
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.ruleset_versions rv 
        WHERE rv.id = ruleset_version_id AND rv.status = 'published'
    )
);

CREATE POLICY "Admins can manage all sports"
ON public.sports
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Players
CREATE POLICY "Public can view players from published rulesets"
ON public.players
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.ruleset_versions rv 
        WHERE rv.id = ruleset_version_id AND rv.status = 'published'
    )
);

CREATE POLICY "Admins can manage all players"
ON public.players
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Rule Items
CREATE POLICY "Public can view rule items from published rulesets"
ON public.rule_items
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.ruleset_versions rv 
        WHERE rv.id = ruleset_version_id AND rv.status = 'published'
    )
);

CREATE POLICY "Admins can manage all rule items"
ON public.rule_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seller Blacklist
CREATE POLICY "Public can view blacklist from published rulesets"
ON public.seller_blacklist
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.ruleset_versions rv 
        WHERE rv.id = ruleset_version_id AND rv.status = 'published'
    )
);

CREATE POLICY "Admins can manage all blacklist entries"
ON public.seller_blacklist
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RPC Functions
-- =============================================

-- Get Published Ruleset Snapshot
CREATE OR REPLACE FUNCTION public.get_published_ruleset_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ruleset_id uuid;
    v_result jsonb;
BEGIN
    SELECT id INTO v_ruleset_id
    FROM public.ruleset_versions
    WHERE status = 'published'
    LIMIT 1;
    
    IF v_ruleset_id IS NULL THEN
        RETURN jsonb_build_object(
            'ruleset', NULL,
            'sports', '[]'::jsonb,
            'players', '[]'::jsonb,
            'rule_items', '[]'::jsonb,
            'seller_blacklist', '[]'::jsonb
        );
    END IF;
    
    SELECT jsonb_build_object(
        'ruleset', (
            SELECT jsonb_build_object(
                'id', rv.id,
                'name', rv.name,
                'version', rv.version,
                'published_at', rv.published_at
            )
            FROM public.ruleset_versions rv
            WHERE rv.id = v_ruleset_id
        ),
        'sports', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'key', s.key,
                    'label', s.label,
                    'sort_order', s.sort_order
                ) ORDER BY s.sort_order, s.label
            )
            FROM public.sports s
            WHERE s.ruleset_version_id = v_ruleset_id
        ), '[]'::jsonb),
        'players', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'sport_key', p.sport_key,
                    'name', p.name,
                    'note', p.note,
                    'tags', p.tags,
                    'sort_order', p.sort_order
                ) ORDER BY p.sort_order, p.name
            )
            FROM public.players p
            WHERE p.ruleset_version_id = v_ruleset_id AND p.is_active = true
        ), '[]'::jsonb),
        'rule_items', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', ri.id,
                    'sport_key', ri.sport_key,
                    'kind', ri.kind,
                    'label', ri.label,
                    'tokens', ri.tokens,
                    'priority', ri.priority,
                    'is_default', ri.is_default,
                    'url', ri.url,
                    'compatible_brand_ids', COALESCE(ri.tokens, '[]'::jsonb)
                ) ORDER BY ri.priority DESC, ri.label
            )
            FROM public.rule_items ri
            WHERE ri.ruleset_version_id = v_ruleset_id AND ri.is_active = true
        ), '[]'::jsonb),
        'seller_blacklist', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', sb.id,
                    'pattern', sb.pattern,
                    'label', sb.label,
                    'priority', sb.priority,
                    'is_active', sb.is_active
                ) ORDER BY sb.priority DESC, sb.pattern
            )
            FROM public.seller_blacklist sb
            WHERE sb.ruleset_version_id = v_ruleset_id AND sb.is_active = true
        ), '[]'::jsonb)
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- Publish Ruleset Version
CREATE OR REPLACE FUNCTION public.publish_ruleset_version(p_ruleset_version_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Only admins can publish rulesets';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM public.ruleset_versions 
        WHERE id = p_ruleset_version_id AND status = 'draft'
    ) THEN
        RAISE EXCEPTION 'Ruleset version not found or is not a draft';
    END IF;
    
    UPDATE public.ruleset_versions
    SET status = 'archived'
    WHERE status = 'published';
    
    UPDATE public.ruleset_versions
    SET status = 'published', published_at = now()
    WHERE id = p_ruleset_version_id;
END;
$$;

-- Clone Published to Draft
CREATE OR REPLACE FUNCTION public.clone_published_to_draft(p_name text, p_version text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_published_id uuid;
    v_new_id uuid;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Only admins can clone rulesets';
    END IF;
    
    SELECT id INTO v_published_id
    FROM public.ruleset_versions
    WHERE status = 'published'
    LIMIT 1;
    
    INSERT INTO public.ruleset_versions (name, version, status, created_by, change_notes)
    VALUES (p_name, p_version, 'draft', auth.uid(), 'Cloned from published version')
    RETURNING id INTO v_new_id;
    
    IF v_published_id IS NOT NULL THEN
        INSERT INTO public.sports (ruleset_version_id, key, label, sort_order)
        SELECT v_new_id, key, label, sort_order
        FROM public.sports
        WHERE ruleset_version_id = v_published_id;
        
        INSERT INTO public.players (ruleset_version_id, sport_key, name, note, tags, is_active, sort_order, source_meta)
        SELECT v_new_id, sport_key, name, note, tags, is_active, sort_order, source_meta
        FROM public.players
        WHERE ruleset_version_id = v_published_id;
        
        INSERT INTO public.rule_items (ruleset_version_id, sport_key, kind, label, tokens, priority, is_default, url, is_active)
        SELECT v_new_id, sport_key, kind, label, tokens, priority, is_default, url, is_active
        FROM public.rule_items
        WHERE ruleset_version_id = v_published_id;
        
        INSERT INTO public.seller_blacklist (ruleset_version_id, pattern, label, is_active, priority)
        SELECT v_new_id, pattern, label, is_active, priority
        FROM public.seller_blacklist
        WHERE ruleset_version_id = v_published_id;
    END IF;
    
    RETURN v_new_id;
END;
$$;

-- Create Empty Draft
CREATE OR REPLACE FUNCTION public.create_empty_draft(p_name text, p_version text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_id uuid;
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Only admins can create rulesets';
    END IF;
    
    INSERT INTO public.ruleset_versions (name, version, status, created_by, change_notes)
    VALUES (p_name, p_version, 'draft', auth.uid(), 'New empty draft')
    RETURNING id INTO v_new_id;
    
    RETURN v_new_id;
END;
$$;

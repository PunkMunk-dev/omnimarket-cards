
-- 1. Add compatible_brand_ids column to rule_items
ALTER TABLE public.rule_items ADD COLUMN IF NOT EXISTS compatible_brand_ids uuid[] NOT NULL DEFAULT '{}';

-- 2. Recreate get_published_ruleset_snapshot() to include compatible_brand_ids
CREATE OR REPLACE FUNCTION public.get_published_ruleset_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
                    'compatible_brand_ids', ri.compatible_brand_ids
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
$function$;

-- 3. Update clone_published_to_draft to copy compatible_brand_ids
CREATE OR REPLACE FUNCTION public.clone_published_to_draft(p_name text, p_version text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

        INSERT INTO public.rule_items (ruleset_version_id, sport_key, kind, label, tokens, priority, is_default, url, is_active, compatible_brand_ids)
        SELECT v_new_id, sport_key, kind, label, tokens, priority, is_default, url, is_active, compatible_brand_ids
        FROM public.rule_items
        WHERE ruleset_version_id = v_published_id;

        INSERT INTO public.seller_blacklist (ruleset_version_id, pattern, label, is_active, priority)
        SELECT v_new_id, pattern, label, is_active, priority
        FROM public.seller_blacklist
        WHERE ruleset_version_id = v_published_id;
    END IF;

    RETURN v_new_id;
END;
$function$;

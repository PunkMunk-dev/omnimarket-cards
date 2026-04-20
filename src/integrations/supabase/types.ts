export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      card_market_metrics: {
        Row: {
          card_identity_key: string
          id: string
          pop_last_synced_at: string | null
          population: number | null
          psa10_comp_count: number | null
          psa10_median_price: number | null
          psa10_population: number | null
          raw_comp_count: number | null
          raw_median_price: number | null
          spread_amount: number | null
          spread_percent: number | null
          updated_at: string
        }
        Insert: {
          card_identity_key: string
          id?: string
          pop_last_synced_at?: string | null
          population?: number | null
          psa10_comp_count?: number | null
          psa10_median_price?: number | null
          psa10_population?: number | null
          raw_comp_count?: number | null
          raw_median_price?: number | null
          spread_amount?: number | null
          spread_percent?: number | null
          updated_at?: string
        }
        Update: {
          card_identity_key?: string
          id?: string
          pop_last_synced_at?: string | null
          population?: number | null
          psa10_comp_count?: number | null
          psa10_median_price?: number | null
          psa10_population?: number | null
          raw_comp_count?: number | null
          raw_median_price?: number | null
          spread_amount?: number | null
          spread_percent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_market_metrics_card_identity_key_fkey"
            columns: ["card_identity_key"]
            isOneToOne: true
            referencedRelation: "cards_normalized"
            referencedColumns: ["card_identity_key"]
          },
        ]
      }
      cards_normalized: {
        Row: {
          autograph_flag: boolean
          brand: string | null
          card_identity_key: string
          card_number: string | null
          category: string | null
          character_name: string | null
          created_at: string
          id: string
          memorabilia_flag: boolean
          parallel: string | null
          player_name: string | null
          rookie_flag: boolean
          set_name: string | null
          sport: string
          subset: string | null
          updated_at: string
          variation: string | null
          year: string | null
        }
        Insert: {
          autograph_flag?: boolean
          brand?: string | null
          card_identity_key: string
          card_number?: string | null
          category?: string | null
          character_name?: string | null
          created_at?: string
          id?: string
          memorabilia_flag?: boolean
          parallel?: string | null
          player_name?: string | null
          rookie_flag?: boolean
          set_name?: string | null
          sport: string
          subset?: string | null
          updated_at?: string
          variation?: string | null
          year?: string | null
        }
        Update: {
          autograph_flag?: boolean
          brand?: string | null
          card_identity_key?: string
          card_number?: string | null
          category?: string | null
          character_name?: string | null
          created_at?: string
          id?: string
          memorabilia_flag?: boolean
          parallel?: string | null
          player_name?: string | null
          rookie_flag?: boolean
          set_name?: string | null
          sport?: string
          subset?: string | null
          updated_at?: string
          variation?: string | null
          year?: string | null
        }
        Relationships: []
      }
      ebay_listing_cache: {
        Row: {
          condition_text: string | null
          ebay_item_id: string | null
          game: string | null
          grade_value: string | null
          grader: string | null
          id: string
          image_url: string | null
          inserted_at: string | null
          is_graded: boolean | null
          junk_flag: boolean | null
          language_detected: string | null
          listing_type: string | null
          listing_url: string | null
          normalized_card_key: string | null
          outlier_flag: boolean | null
          parse_confidence: string | null
          parsed_card_number: string | null
          parsed_character: string | null
          parsed_rarity: string | null
          parsed_set_name: string | null
          parsed_variant: string | null
          sold_date: string | null
          sold_price_usd: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          condition_text?: string | null
          ebay_item_id?: string | null
          game?: string | null
          grade_value?: string | null
          grader?: string | null
          id?: string
          image_url?: string | null
          inserted_at?: string | null
          is_graded?: boolean | null
          junk_flag?: boolean | null
          language_detected?: string | null
          listing_type?: string | null
          listing_url?: string | null
          normalized_card_key?: string | null
          outlier_flag?: boolean | null
          parse_confidence?: string | null
          parsed_card_number?: string | null
          parsed_character?: string | null
          parsed_rarity?: string | null
          parsed_set_name?: string | null
          parsed_variant?: string | null
          sold_date?: string | null
          sold_price_usd?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          condition_text?: string | null
          ebay_item_id?: string | null
          game?: string | null
          grade_value?: string | null
          grader?: string | null
          id?: string
          image_url?: string | null
          inserted_at?: string | null
          is_graded?: boolean | null
          junk_flag?: boolean | null
          language_detected?: string | null
          listing_type?: string | null
          listing_url?: string | null
          normalized_card_key?: string | null
          outlier_flag?: boolean | null
          parse_confidence?: string | null
          parsed_card_number?: string | null
          parsed_character?: string | null
          parsed_rarity?: string | null
          parsed_set_name?: string | null
          parsed_variant?: string | null
          sold_date?: string | null
          sold_price_usd?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      onepiece_card_market: {
        Row: {
          card_number: string | null
          character: string | null
          game: string | null
          language: string | null
          last_updated_at: string | null
          match_confidence: string | null
          multiple: number | null
          normalized_card_key: string
          notes: string | null
          price_spread_usd: number | null
          psa10_avg_price_usd: number | null
          psa10_median_price_usd: number | null
          psa10_prices_usd: string[] | null
          psa10_sale_count: number | null
          psa10_sold_dates: string[] | null
          psa10_source_urls: string[] | null
          rarity: string | null
          raw_avg_price_usd: number | null
          raw_median_price_usd: number | null
          raw_prices_usd: string[] | null
          raw_sale_count: number | null
          raw_sold_dates: string[] | null
          raw_source_urls: string[] | null
          set_name: string | null
          variant: string | null
        }
        Insert: {
          card_number?: string | null
          character?: string | null
          game?: string | null
          language?: string | null
          last_updated_at?: string | null
          match_confidence?: string | null
          multiple?: number | null
          normalized_card_key: string
          notes?: string | null
          price_spread_usd?: number | null
          psa10_avg_price_usd?: number | null
          psa10_median_price_usd?: number | null
          psa10_prices_usd?: string[] | null
          psa10_sale_count?: number | null
          psa10_sold_dates?: string[] | null
          psa10_source_urls?: string[] | null
          rarity?: string | null
          raw_avg_price_usd?: number | null
          raw_median_price_usd?: number | null
          raw_prices_usd?: string[] | null
          raw_sale_count?: number | null
          raw_sold_dates?: string[] | null
          raw_source_urls?: string[] | null
          set_name?: string | null
          variant?: string | null
        }
        Update: {
          card_number?: string | null
          character?: string | null
          game?: string | null
          language?: string | null
          last_updated_at?: string | null
          match_confidence?: string | null
          multiple?: number | null
          normalized_card_key?: string
          notes?: string | null
          price_spread_usd?: number | null
          psa10_avg_price_usd?: number | null
          psa10_median_price_usd?: number | null
          psa10_prices_usd?: string[] | null
          psa10_sale_count?: number | null
          psa10_sold_dates?: string[] | null
          psa10_source_urls?: string[] | null
          rarity?: string | null
          raw_avg_price_usd?: number | null
          raw_median_price_usd?: number | null
          raw_prices_usd?: string[] | null
          raw_sale_count?: number | null
          raw_sold_dates?: string[] | null
          raw_source_urls?: string[] | null
          set_name?: string | null
          variant?: string | null
        }
        Relationships: []
      }
      players: {
        Row: {
          id: string
          is_active: boolean
          name: string
          note: string | null
          ruleset_version_id: string
          sort_order: number
          source_meta: Json
          sport_key: string
          tags: Json
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          ruleset_version_id: string
          sort_order?: number
          source_meta?: Json
          sport_key: string
          tags?: Json
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          ruleset_version_id?: string
          sort_order?: number
          source_meta?: Json
          sport_key?: string
          tags?: Json
        }
        Relationships: [
          {
            foreignKeyName: "players_ruleset_version_id_fkey"
            columns: ["ruleset_version_id"]
            isOneToOne: false
            referencedRelation: "ruleset_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      psa_cert_cache: {
        Row: {
          card_identity_key: string | null
          card_number: string | null
          cert_number: string
          created_at: string | null
          grade: string | null
          id: string
          image_url: string | null
          last_verified_at: string | null
          player_name: string | null
          raw_response_json: Json | null
          set_name: string | null
          year: string | null
        }
        Insert: {
          card_identity_key?: string | null
          card_number?: string | null
          cert_number: string
          created_at?: string | null
          grade?: string | null
          id?: string
          image_url?: string | null
          last_verified_at?: string | null
          player_name?: string | null
          raw_response_json?: Json | null
          set_name?: string | null
          year?: string | null
        }
        Update: {
          card_identity_key?: string | null
          card_number?: string | null
          cert_number?: string
          created_at?: string | null
          grade?: string | null
          id?: string
          image_url?: string | null
          last_verified_at?: string | null
          player_name?: string | null
          raw_response_json?: Json | null
          set_name?: string | null
          year?: string | null
        }
        Relationships: []
      }
      psa_population: {
        Row: {
          card_identity_key: string
          id: string
          last_synced: string | null
          population_count: number | null
          psa_grade: string | null
          psa_set: string | null
          psa_subject: string | null
          source_label: string | null
          source_last_synced_at: string | null
          source_url: string | null
          updated_at: string
        }
        Insert: {
          card_identity_key: string
          id?: string
          last_synced?: string | null
          population_count?: number | null
          psa_grade?: string | null
          psa_set?: string | null
          psa_subject?: string | null
          source_label?: string | null
          source_last_synced_at?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          card_identity_key?: string
          id?: string
          last_synced?: string | null
          population_count?: number | null
          psa_grade?: string | null
          psa_set?: string | null
          psa_subject?: string | null
          source_label?: string | null
          source_last_synced_at?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "psa_population_card_identity_key_fkey"
            columns: ["card_identity_key"]
            isOneToOne: false
            referencedRelation: "cards_normalized"
            referencedColumns: ["card_identity_key"]
          },
        ]
      }
      psa_population_mapping: {
        Row: {
          card_identity_key: string
          created_at: string | null
          id: string
          is_admin_verified: boolean | null
          last_synced_at: string | null
          mapping_confidence: string | null
          notes: string | null
          psa_card_number: string | null
          psa_population_source: string | null
          psa_population_url: string | null
          psa_search_query: string | null
          psa_set_name: string | null
          psa_subject: string | null
          updated_at: string
        }
        Insert: {
          card_identity_key: string
          created_at?: string | null
          id?: string
          is_admin_verified?: boolean | null
          last_synced_at?: string | null
          mapping_confidence?: string | null
          notes?: string | null
          psa_card_number?: string | null
          psa_population_source?: string | null
          psa_population_url?: string | null
          psa_search_query?: string | null
          psa_set_name?: string | null
          psa_subject?: string | null
          updated_at?: string
        }
        Update: {
          card_identity_key?: string
          created_at?: string | null
          id?: string
          is_admin_verified?: boolean | null
          last_synced_at?: string | null
          mapping_confidence?: string | null
          notes?: string | null
          psa_card_number?: string | null
          psa_population_source?: string | null
          psa_population_url?: string | null
          psa_search_query?: string | null
          psa_set_name?: string | null
          psa_subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      psa_sync_runs: {
        Row: {
          created_at: string
          error_log: Json | null
          finished_at: string | null
          id: string
          records_failed: number | null
          records_seen: number | null
          records_updated: number | null
          source_type: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_log?: Json | null
          finished_at?: string | null
          id?: string
          records_failed?: number | null
          records_seen?: number | null
          records_updated?: number | null
          source_type?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_log?: Json | null
          finished_at?: string | null
          id?: string
          records_failed?: number | null
          records_seen?: number | null
          records_updated?: number | null
          source_type?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      roi_cards: {
        Row: {
          card_name: string
          created_at: string | null
          id: string
          multiplier: number | null
          psa10_avg: number | null
          psa10_profit: number | null
          psa9_avg: number | null
          psa9_gain: number | null
          raw_avg: number | null
          sport: string
        }
        Insert: {
          card_name: string
          created_at?: string | null
          id?: string
          multiplier?: number | null
          psa10_avg?: number | null
          psa10_profit?: number | null
          psa9_avg?: number | null
          psa9_gain?: number | null
          raw_avg?: number | null
          sport: string
        }
        Update: {
          card_name?: string
          created_at?: string | null
          id?: string
          multiplier?: number | null
          psa10_avg?: number | null
          psa10_profit?: number | null
          psa9_avg?: number | null
          psa9_gain?: number | null
          raw_avg?: number | null
          sport?: string
        }
        Relationships: []
      }
      roi_ebay_cache: {
        Row: {
          card_name: string
          expires_at: string
          fetched_at: string | null
          id: string
          listings: Json
          query_hash: string | null
          query_text: string
          query_version: number
          refreshing_until: string | null
        }
        Insert: {
          card_name: string
          expires_at?: string
          fetched_at?: string | null
          id?: string
          listings?: Json
          query_hash?: string | null
          query_text?: string
          query_version?: number
          refreshing_until?: string | null
        }
        Update: {
          card_name?: string
          expires_at?: string
          fetched_at?: string | null
          id?: string
          listings?: Json
          query_hash?: string | null
          query_text?: string
          query_version?: number
          refreshing_until?: string | null
        }
        Relationships: []
      }
      roi_live_auctions: {
        Row: {
          current_bid: number | null
          end_time: string | null
          id: string
          image_url: string | null
          item_id: string
          last_seen_at: string
          listing_url: string
          roi_card_id: string
          shipping: number | null
        }
        Insert: {
          current_bid?: number | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          item_id: string
          last_seen_at?: string
          listing_url: string
          roi_card_id: string
          shipping?: number | null
        }
        Update: {
          current_bid?: number | null
          end_time?: string | null
          id?: string
          image_url?: string | null
          item_id?: string
          last_seen_at?: string
          listing_url?: string
          roi_card_id?: string
          shipping?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "roi_live_auctions_roi_card_id_fkey"
            columns: ["roi_card_id"]
            isOneToOne: false
            referencedRelation: "roi_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      rule_items: {
        Row: {
          compatible_brand_ids: string[]
          id: string
          is_active: boolean
          is_default: boolean
          kind: string
          label: string
          priority: number
          ruleset_version_id: string
          sport_key: string
          tokens: Json
          url: string | null
        }
        Insert: {
          compatible_brand_ids?: string[]
          id?: string
          is_active?: boolean
          is_default?: boolean
          kind: string
          label: string
          priority?: number
          ruleset_version_id: string
          sport_key: string
          tokens?: Json
          url?: string | null
        }
        Update: {
          compatible_brand_ids?: string[]
          id?: string
          is_active?: boolean
          is_default?: boolean
          kind?: string
          label?: string
          priority?: number
          ruleset_version_id?: string
          sport_key?: string
          tokens?: Json
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rule_items_ruleset_version_id_fkey"
            columns: ["ruleset_version_id"]
            isOneToOne: false
            referencedRelation: "ruleset_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ruleset_versions: {
        Row: {
          change_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          published_at: string | null
          status: string
          version: string
        }
        Insert: {
          change_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          published_at?: string | null
          status?: string
          version: string
        }
        Update: {
          change_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          published_at?: string | null
          status?: string
          version?: string
        }
        Relationships: []
      }
      sales_history: {
        Row: {
          card_identity_key: string
          confidence_score: string
          created_at: string
          grade: string | null
          grader: string | null
          id: string
          image_url: string | null
          raw_or_graded: string
          shipping_price: number | null
          sold_at: string | null
          sold_price: number | null
          source: string
          source_sale_id: string | null
          title: string | null
          total_price: number | null
          url: string | null
        }
        Insert: {
          card_identity_key: string
          confidence_score?: string
          created_at?: string
          grade?: string | null
          grader?: string | null
          id?: string
          image_url?: string | null
          raw_or_graded?: string
          shipping_price?: number | null
          sold_at?: string | null
          sold_price?: number | null
          source?: string
          source_sale_id?: string | null
          title?: string | null
          total_price?: number | null
          url?: string | null
        }
        Update: {
          card_identity_key?: string
          confidence_score?: string
          created_at?: string
          grade?: string | null
          grader?: string | null
          id?: string
          image_url?: string | null
          raw_or_graded?: string
          shipping_price?: number | null
          sold_at?: string | null
          sold_price?: number | null
          source?: string
          source_sale_id?: string | null
          title?: string | null
          total_price?: number | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_history_card_identity_key_fkey"
            columns: ["card_identity_key"]
            isOneToOne: false
            referencedRelation: "cards_normalized"
            referencedColumns: ["card_identity_key"]
          },
        ]
      }
      seller_blacklist: {
        Row: {
          id: string
          is_active: boolean
          label: string | null
          pattern: string
          priority: number
          ruleset_version_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          label?: string | null
          pattern: string
          priority?: number
          ruleset_version_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          label?: string | null
          pattern?: string
          priority?: number
          ruleset_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_blacklist_ruleset_version_id_fkey"
            columns: ["ruleset_version_id"]
            isOneToOne: false
            referencedRelation: "ruleset_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          id: string
          key: string
          label: string
          ruleset_version_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          key: string
          label: string
          ruleset_version_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          key?: string
          label?: string
          ruleset_version_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "sports_ruleset_version_id_fkey"
            columns: ["ruleset_version_id"]
            isOneToOne: false
            referencedRelation: "ruleset_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      tcg_sets: {
        Row: {
          created_at: string
          game: string
          id: string
          set_name: string
          weight: number
        }
        Insert: {
          created_at?: string
          game: string
          id?: string
          set_name: string
          weight?: number
        }
        Update: {
          created_at?: string
          game?: string
          id?: string
          set_name?: string
          weight?: number
        }
        Relationships: []
      }
      tcg_targets: {
        Row: {
          created_at: string
          game: string
          id: string
          name: string
          priority: number
          tags: string | null
        }
        Insert: {
          created_at?: string
          game: string
          id?: string
          name: string
          priority?: number
          tags?: string | null
        }
        Update: {
          created_at?: string
          game?: string
          id?: string
          name?: string
          priority?: number
          tags?: string | null
        }
        Relationships: []
      }
      tcg_traits: {
        Row: {
          created_at: string
          game: string
          id: string
          rarity_tier: string | null
          search_terms: string
          trait: string
          weight: number
        }
        Insert: {
          created_at?: string
          game: string
          id?: string
          rarity_tier?: string | null
          search_terms: string
          trait: string
          weight?: number
        }
        Update: {
          created_at?: string
          game?: string
          id?: string
          rarity_tier?: string | null
          search_terms?: string
          trait?: string
          weight?: number
        }
        Relationships: []
      }
      tcg_watchlist: {
        Row: {
          created_at: string
          game: string
          id: string
          listing_id: string | null
          listing_image: string | null
          listing_price: string | null
          listing_title: string | null
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game: string
          id?: string
          listing_id?: string | null
          listing_image?: string | null
          listing_price?: string | null
          listing_title?: string | null
          query: string
          user_id: string
        }
        Update: {
          created_at?: string
          game?: string
          id?: string
          listing_id?: string | null
          listing_image?: string | null
          listing_price?: string | null
          listing_title?: string | null
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clone_published_to_draft: {
        Args: { p_name: string; p_version: string }
        Returns: string
      }
      create_empty_draft: {
        Args: { p_name: string; p_version: string }
        Returns: string
      }
      get_published_ruleset_snapshot: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      publish_ruleset_version: {
        Args: { p_ruleset_version_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const

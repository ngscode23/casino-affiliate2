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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_emails: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      auth_roles: {
        Row: {
          description: string | null
          role: string
        }
        Insert: {
          description?: string | null
          role: string
        }
        Update: {
          description?: string | null
          role?: string
        }
        Relationships: []
      }
      auth_users: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_login_at: string | null
          metadata: Json
          password_hash: string
          password_updated_at: string | null
          role: string
          token_version: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          metadata?: Json
          password_hash: string
          password_updated_at?: string | null
          role?: string
          token_version?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          metadata?: Json
          password_hash?: string
          password_updated_at?: string | null
          role?: string
          token_version?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      carts: {
        Row: {
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          message: string | null
          metadata: Json | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
        }
        Relationships: []
      }
      ecom_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      ecom_product_image_versions: {
        Row: {
          id: string
          is_current: boolean
          metadata: Json | null
          path: string
          product_id: string
          sku: string | null
          source_url: string | null
          uploaded_at: string
          uploaded_by: string | null
          uploaded_via: string | null
        }
        Insert: {
          id?: string
          is_current?: boolean
          metadata?: Json | null
          path: string
          product_id: string
          sku?: string | null
          source_url?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          uploaded_via?: string | null
        }
        Update: {
          id?: string
          is_current?: boolean
          metadata?: Json | null
          path?: string
          product_id?: string
          sku?: string | null
          source_url?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          uploaded_via?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      ecom_products: {
        Row: {
          category_slug: string | null
          created_at: string
          currency: string | null
          id: string
          image_path: string | null
          images: Json
          price: number
          rating: number
          seller_id: string | null
          short_desc: string | null
          sku: string
          slug: string
          specs: Json
          status: string
          tags: string[]
          title: string
        }
        Insert: {
          category_slug?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          image_path?: string | null
          images?: Json
          price: number
          rating?: number
          seller_id?: string | null
          short_desc?: string | null
          sku: string
          slug: string
          specs?: Json
          status?: string
          tags?: string[]
          title: string
        }
        Update: {
          category_slug?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          image_path?: string | null
          images?: Json
          price?: number
          rating?: number
          seller_id?: string | null
          short_desc?: string | null
          sku?: string
          slug?: string
          specs?: Json
          status?: string
          tags?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "ecom_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      job_runs: {
        Row: {
          id: number
          jobname: string
          ran_at: string
          response: Json | null
          status: number
        }
        Insert: {
          id?: number
          jobname: string
          ran_at?: string
          response?: Json | null
          status: number
        }
        Update: {
          id?: number
          jobname?: string
          ran_at?: string
          response?: Json | null
          status?: number
        }
        Relationships: []
      }
      line_total_is_generated: {
        Row: {
          coalesce: boolean | null
          id: number
        }
        Insert: {
          coalesce?: boolean | null
          id?: number
        }
        Update: {
          coalesce?: boolean | null
          id?: number
        }
        Relationships: []
      }
      offer_clicks: {
        Row: {
          click_id: string | null
          created_at: string
          id: string
          params: Json | null
          referrer: string | null
          slug: string
          target_host: string | null
          target_url: string | null
          target_url_final: string | null
          user_agent: string | null
        }
        Insert: {
          click_id?: string | null
          created_at?: string
          id?: string
          params?: Json | null
          referrer?: string | null
          slug: string
          target_host?: string | null
          target_url?: string | null
          target_url_final?: string | null
          user_agent?: string | null
        }
        Update: {
          click_id?: string | null
          created_at?: string
          id?: string
          params?: Json | null
          referrer?: string | null
          slug?: string
          target_host?: string | null
          target_url?: string | null
          target_url_final?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          meta: Json | null
          order_id: string
          product_id: string | null
          qty: number
          title: string
          total: number | null
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          id?: string
          meta?: Json | null
          order_id: string
          product_id?: string | null
          qty: number
          title: string
          total?: number | null
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          id?: string
          meta?: Json | null
          order_id?: string
          product_id?: string | null
          qty?: number
          title?: string
          total?: number | null
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_order_items_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_history_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "fk_order_items_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_order_items_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_history_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_audit: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: number
          new_status: string
          old_status: string | null
          order_id: string
          reason: string | null
          source: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: number
          new_status: string
          old_status?: string | null
          order_id: string
          reason?: string | null
          source?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: number
          new_status?: string
          old_status?: string | null
          order_id?: string
          reason?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_history_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_status_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          order_id: string
          reason: string | null
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          order_id: string
          reason?: string | null
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          order_id?: string
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_history_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_cents: number | null
          cancelled_at: string | null
          checkout_metadata: Json
          contact_email: string | null
          created_at: string
          currency: string
          discount_total: number
          grand_total: number
          id: string
          metadata_b: Json | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipping_total: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          cancelled_at?: string | null
          checkout_metadata?: Json
          contact_email?: string | null
          created_at?: string
          currency?: string
          discount_total?: number
          grand_total?: number
          id?: string
          metadata_b?: Json | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          cancelled_at?: string | null
          checkout_metadata?: Json
          contact_email?: string | null
          created_at?: string
          currency?: string
          discount_total?: number
          grand_total?: number
          id?: string
          metadata_b?: Json | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          user_id?: string
        }
        Relationships: []
      }
      orders_archive: {
        Row: {
          amount_cents: number | null
          archive_run_id: string
          archived_at: string
          archived_payload: Json
          cancelled_at: string | null
          checkout_metadata: Json | null
          contact_email: string | null
          created_at: string | null
          currency: string | null
          discount_total: number | null
          grand_total: number | null
          id: string
          metadata_b: Json | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_status: string | null
          shipping_total: number | null
          status: string | null
          subtotal: number | null
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          archive_run_id: string
          archived_at?: string
          archived_payload?: Json
          cancelled_at?: string | null
          checkout_metadata?: Json | null
          contact_email?: string | null
          created_at?: string | null
          currency?: string | null
          discount_total?: number | null
          grand_total?: number | null
          id: string
          metadata_b?: Json | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          shipping_total?: number | null
          status?: string | null
          subtotal?: number | null
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          archive_run_id?: string
          archived_at?: string
          archived_payload?: Json
          cancelled_at?: string | null
          checkout_metadata?: Json | null
          contact_email?: string | null
          created_at?: string | null
          currency?: string | null
          discount_total?: number | null
          grand_total?: number | null
          id?: string
          metadata_b?: Json | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_status?: string | null
          shipping_total?: number | null
          status?: string | null
          subtotal?: number | null
          user_id?: string
        }
        Relationships: []
      }
      orders_archive_export: {
        Row: {
          created_at: string
          id: string
          payload_url: string
          run_id: string
          size_bytes: number
        }
        Insert: {
          created_at?: string
          id?: string
          payload_url: string
          run_id: string
          size_bytes?: number
        }
        Update: {
          created_at?: string
          id?: string
          payload_url?: string
          run_id?: string
          size_bytes?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_id: string | null
          provider: string
          provider_ref: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          provider: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_payments_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_history_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "fk_payments_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_payments_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_history_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_impressions: {
        Row: {
          created_at: string
          id: string
          ip: unknown
          product_id: string
          referrer: string | null
          session_id: string | null
          slug: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: unknown
          product_id: string
          referrer?: string | null
          session_id?: string | null
          slug?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip?: unknown
          product_id?: string
          referrer?: string | null
          session_id?: string | null
          slug?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_rating_stats: {
        Row: {
          avg_rating: number
          product_uid: string
          ratings_count: number
          updated_at: string
        }
        Insert: {
          avg_rating?: number
          product_uid: string
          ratings_count?: number
          updated_at?: string
        }
        Update: {
          avg_rating?: number
          product_uid?: string
          ratings_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_rating_stats_product_uid_fkey"
            columns: ["product_uid"]
            isOneToOne: true
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_rating_stats_product_uid_fkey"
            columns: ["product_uid"]
            isOneToOne: true
            referencedRelation: "ecom_products_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_rating_stats_product_uid_fkey"
            columns: ["product_uid"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews_raw: {
        Row: {
          body: string
          created_at: string
          product_id: string
          rating: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          product_id: string
          rating: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          product_id?: string
          rating?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      refresh_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          metadata: Json
          revoked_at: string | null
          revoked_reason: string | null
          token_hash: string
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          revoked_at?: string | null
          revoked_reason?: string | null
          token_hash: string
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          revoked_at?: string | null
          revoked_reason?: string | null
          token_hash?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_users"
            referencedColumns: ["id"]
          },
        ]
      }
      review_rate_limits: {
        Row: {
          count_24h: number
          ip_hash: string
          last_at: string
          user_id: string | null
        }
        Insert: {
          count_24h?: number
          ip_hash: string
          last_at?: string
          user_id?: string | null
        }
        Update: {
          count_24h?: number
          ip_hash?: string
          last_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      review_votes: {
        Row: {
          created_at: string
          product_id: string
          review_author_id: string
          value: number
          voter_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          review_author_id: string
          value: number
          voter_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          review_author_id?: string
          value?: number
          voter_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string
          created_at: string
          product_id: number
          rating: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          product_id: number
          rating: number
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          product_id?: number
          rating?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_clicks: {
        Row: {
          created_at: string
          id: string
          ip: unknown
          product_id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: unknown
          product_id: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip?: unknown
          product_id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_impressions: {
        Row: {
          created_at: string
          id: string
          ip: unknown
          product_id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: unknown
          product_id: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip?: unknown
          product_id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          product_id: string
          qty_available: number
          updated_at: string
        }
        Insert: {
          product_id: string
          qty_available?: number
          updated_at?: string
        }
        Update: {
          product_id?: string
          qty_available?: number
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: number
          order_id: string | null
          order_item_id: string | null
          product_id: string
          qty_delta: number
          reason: string
        }
        Insert: {
          created_at?: string
          id?: number
          order_id?: string | null
          order_item_id?: string | null
          product_id: string
          qty_delta: number
          reason: string
        }
        Update: {
          created_at?: string
          id?: number
          order_id?: string | null
          order_item_id?: string | null
          product_id?: string
          qty_delta?: number
          reason?: string
        }
        Relationships: []
      }
      stripe_balance_transactions_cache: {
        Row: {
          amount: number | null
          attrs: Json | null
          created: string | null
          currency: string | null
          fee: number | null
          id: string
          net: number | null
          status: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          attrs?: Json | null
          created?: string | null
          currency?: string | null
          fee?: number | null
          id: string
          net?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          attrs?: Json | null
          created?: string | null
          currency?: string | null
          fee?: number | null
          id?: string
          net?: number | null
          status?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_charges_cache: {
        Row: {
          amount: number | null
          created: string | null
          currency: string | null
          customer: string | null
          description: string | null
          email: string | null
          id: string
          invoice: string | null
          name: string | null
          payment_intent: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          created?: string | null
          currency?: string | null
          customer?: string | null
          description?: string | null
          email?: string | null
          id: string
          invoice?: string | null
          name?: string | null
          payment_intent?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          created?: string | null
          currency?: string | null
          customer?: string | null
          description?: string | null
          email?: string | null
          id?: string
          invoice?: string | null
          name?: string | null
          payment_intent?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_customers_cache: {
        Row: {
          attrs: Json | null
          created: string | null
          description: string | null
          email: string | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          attrs?: Json | null
          created?: string | null
          description?: string | null
          email?: string | null
          id: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          attrs?: Json | null
          created?: string | null
          description?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_products_cache: {
        Row: {
          active: boolean | null
          attrs: Json | null
          created: string | null
          created_at: string | null
          default_price: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string | null
          updated: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          attrs?: Json | null
          created?: string | null
          created_at?: string | null
          default_price?: string | null
          description?: string | null
          id: string
          is_public?: boolean | null
          name?: string | null
          updated?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          attrs?: Json | null
          created?: string | null
          created_at?: string | null
          default_price?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string | null
          updated?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_webhooks: {
        Row: {
          api_version: string | null
          created_utc: string
          data: Json
          expected_amount_cents: number | null
          expected_currency: string | null
          id: string
          inserted_at: string | null
          livemode: boolean
          mismatch_reason: string | null
          mode: string | null
          notified_desync: boolean
          notified_failed: boolean
          notified_refunded: boolean
          notified_requires_action: boolean
          notified_succeeded: boolean
          processing_error: string | null
          processing_state: string | null
          raw: Json | null
          stripe_amount_cents: number | null
          stripe_currency: string | null
          type: string
        }
        Insert: {
          api_version?: string | null
          created_utc: string
          data: Json
          expected_amount_cents?: number | null
          expected_currency?: string | null
          id: string
          inserted_at?: string | null
          livemode: boolean
          mismatch_reason?: string | null
          mode?: string | null
          notified_desync?: boolean
          notified_failed?: boolean
          notified_refunded?: boolean
          notified_requires_action?: boolean
          notified_succeeded?: boolean
          processing_error?: string | null
          processing_state?: string | null
          raw?: Json | null
          stripe_amount_cents?: number | null
          stripe_currency?: string | null
          type: string
        }
        Update: {
          api_version?: string | null
          created_utc?: string
          data?: Json
          expected_amount_cents?: number | null
          expected_currency?: string | null
          id?: string
          inserted_at?: string | null
          livemode?: boolean
          mismatch_reason?: string | null
          mode?: string | null
          notified_desync?: boolean
          notified_failed?: boolean
          notified_refunded?: boolean
          notified_requires_action?: boolean
          notified_succeeded?: boolean
          processing_error?: string | null
          processing_state?: string | null
          raw?: Json | null
          stripe_amount_cents?: number | null
          stripe_currency?: string | null
          type?: string
        }
        Relationships: []
      }
      stripe_webhooks_failed: {
        Row: {
          api_version: string | null
          created_utc: string | null
          data: Json | null
          id: string
          inserted_at: string | null
          livemode: boolean | null
          raw: Json | null
          surrogate_id: number
          type: string | null
        }
        Insert: {
          api_version?: string | null
          created_utc?: string | null
          data?: Json | null
          id: string
          inserted_at?: string | null
          livemode?: boolean | null
          raw?: Json | null
          surrogate_id?: number
          type?: string | null
        }
        Update: {
          api_version?: string | null
          created_utc?: string | null
          data?: Json | null
          id?: string
          inserted_at?: string | null
          livemode?: boolean | null
          raw?: Json | null
          surrogate_id?: number
          type?: string | null
        }
        Relationships: []
      }
      title_blacklist: {
        Row: {
          pattern: string
        }
        Insert: {
          pattern: string
        }
        Update: {
          pattern?: string
        }
        Relationships: []
      }
      total_is_generated: {
        Row: {
          coalesce: boolean | null
          id: number
        }
        Insert: {
          coalesce?: boolean | null
          id?: number
        }
        Update: {
          coalesce?: boolean | null
          id?: number
        }
        Relationships: []
      }
    }
    Views: {
      clicks: {
        Row: {
          params: Json | null
          referrer: string | null
          slug: string | null
          ts: string | null
        }
        Insert: {
          params?: never
          referrer?: never
          slug?: never
          ts?: string | null
        }
        Update: {
          params?: never
          referrer?: never
          slug?: never
          ts?: string | null
        }
        Relationships: []
      }
      ecom_product_images_latest: {
        Row: {
          created_at: string | null
          id: string | null
          meta: Json | null
          product_id: string | null
          url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      ecom_products_with_ratings: {
        Row: {
          avg_rating: number | null
          category_slug: string | null
          created_at: string | null
          id: string | null
          images: Json | null
          price: number | null
          rating: number | null
          ratings_count: number | null
          short_desc: string | null
          slug: string | null
          specs: Json | null
          status: string | null
          tags: string[] | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "ecom_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      impressions: {
        Row: {
          device: string | null
          lang: string | null
          slug: string | null
          ts: string | null
        }
        Insert: {
          device?: never
          lang?: never
          slug?: never
          ts?: string | null
        }
        Update: {
          device?: never
          lang?: never
          slug?: never
          ts?: string | null
        }
        Relationships: []
      }
      order_history_v: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          order_id: string | null
          status: string | null
        }
        Insert: {
          amount?: never
          created_at?: string | null
          currency?: string | null
          order_id?: string | null
          status?: never
        }
        Update: {
          amount?: never
          created_at?: string | null
          currency?: string | null
          order_id?: string | null
          status?: never
        }
        Relationships: []
      }
      order_items_v: {
        Row: {
          id: string | null
          line_total: number | null
          order_id: string | null
          product_id: string | null
          qty: number | null
          title: string | null
          total: number | null
          unit_price: number | null
          variant_id: string | null
        }
        Insert: {
          id?: string | null
          line_total?: number | null
          order_id?: string | null
          product_id?: string | null
          qty?: number | null
          title?: string | null
          total?: number | null
          unit_price?: number | null
          variant_id?: string | null
        }
        Update: {
          id?: string | null
          line_total?: number | null
          order_id?: string | null
          product_id?: string | null
          qty?: number | null
          title?: string | null
          total?: number | null
          unit_price?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_order_items_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_history_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "fk_order_items_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_order_items_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_history_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_v2: {
        Row: {
          amount_discounts: number | null
          amount_subtotal: number | null
          amount_tax: number | null
          amount_total: number | null
          created_at: string | null
          currency: string | null
          id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          status: Database["public"]["Enums"]["order_status"] | null
          user_id: string | null
        }
        Insert: {
          amount_discounts?: never
          amount_subtotal?: never
          amount_tax?: never
          amount_total?: never
          created_at?: string | null
          currency?: string | null
          id?: string | null
          payment_status?: never
          status?: Database["public"]["Enums"]["order_status"] | null
          user_id?: string | null
        }
        Update: {
          amount_discounts?: never
          amount_subtotal?: never
          amount_tax?: never
          amount_total?: never
          created_at?: string | null
          currency?: string | null
          id?: string | null
          payment_status?: never
          status?: Database["public"]["Enums"]["order_status"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_impressions_30d: {
        Row: {
          day: string | null
          impressions: number | null
          product_key: string | null
          slug: string | null
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          body: string | null
          created_at: string | null
          product_id: number | null
          rating: number | null
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          product_id?: number | null
          rating?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          product_id?: number | null
          rating?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_reviews_admin_v: {
        Row: {
          created_at: string | null
          id: string | null
          product_slug: string | null
          product_title: string | null
          product_uid: string | null
          rating: number | null
          review_body: string | null
          review_title: string | null
          source_pk: string | null
          source_schema: string | null
          source_table: string | null
          status: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category_slug: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string | null
          image_path: string | null
          images: Json | null
          main_image_url: string | null
          price: number | null
          price_cents: number | null
          rating: number | null
          seller_id: string | null
          short_desc: string | null
          sku: string | null
          slug: string | null
          specs: Json | null
          status: string | null
          tags: string[] | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "ecom_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      products_unified: {
        Row: {
          currency: string | null
          id: string | null
          price_amount: number | null
          price_cents: number | null
          slug: string | null
          source: string | null
          status: string | null
          title: string | null
        }
        Relationships: []
      }
      products_unified_dedup: {
        Row: {
          category_slug: string | null
          currency: string | null
          id: string | null
          price_amount: number | null
          price_cents: number | null
          rating: number | null
          sku: string | null
          slug: string | null
          source: string | null
          status: string | null
          tags_text: string[] | null
          title: string | null
        }
        Relationships: []
      }
      products_v: {
        Row: {
          image_path: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          image_path?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          image_path?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_webhooks_with_mode: {
        Row: {
          created_utc: string | null
          data: Json | null
          id: string | null
          livemode: boolean | null
          mode: string | null
          type: string | null
        }
        Insert: {
          created_utc?: string | null
          data?: Json | null
          id?: string | null
          livemode?: boolean | null
          mode?: never
          type?: string | null
        }
        Update: {
          created_utc?: string | null
          data?: Json | null
          id?: string | null
          livemode?: boolean | null
          mode?: never
          type?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          api_version: string | null
          attempt: number | null
          created_at: string | null
          delivery_id: string | null
          duration_ms: number | null
          error: string | null
          event: string | null
          id: string | null
          inserted_at: string | null
          livemode: boolean | null
          payload: Json | null
          request_body: Json | null
          request_headers: Json | null
          response_body: Json | null
          response_headers: Json | null
          source: string | null
          status: number | null
          type: string | null
          url: string | null
          webhook_id: string | null
          webhook_mode: string | null
        }
        Relationships: []
      }
      payment_refunds: {
        Row: {
          amount_cents: number | null
          created_at: string | null
          currency: string | null
          order_id: string | null
          payment_intent_id: string | null
          reason: string | null
          refund_id: string
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string | null
          currency?: string | null
          order_id?: string | null
          payment_intent_id?: string | null
          reason?: string | null
          refund_id?: string
        }
        Update: {
          amount_cents?: number | null
          created_at?: string | null
          currency?: string | null
          order_id?: string | null
          payment_intent_id?: string | null
          reason?: string | null
          refund_id?: string
        }
        Relationships: []
      }
      webhook_logs_app: {
        Row: {
          api_version: string | null
          attempt: number | null
          created_at: string | null
          delivery_id: string | null
          duration_ms: number | null
          error: string | null
          event: string | null
          event_id: string | null
          event_type: string | null
          id: string | null
          inserted_at: string | null
          livemode: boolean | null
          log_status: number | null
          payload: Json | null
          request_body: Json | null
          request_headers: Json | null
          response_body: Json | null
          response_headers: Json | null
          source: string | null
          status: number | null
          type: string | null
          url: string | null
          webhook_id: string | null
          webhook_mode: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _inventory_apply_delta: {
        Args: { p_order_id: string; p_reason: string; p_sign: number }
        Returns: undefined
      }
      _mk_slug: { Args: { src: string }; Returns: string }
      _norm_slug: { Args: { _slug: string }; Returns: string }
      _order_try_validate_transition:
        | { Args: { p_from: string; p_to: string }; Returns: undefined }
        | {
            Args: {
              from_status: Database["public"]["Enums"]["order_status"]
              to_status: Database["public"]["Enums"]["order_status"]
            }
            Returns: boolean
          }
      _order_validate_transition: {
        Args: {
          from_status: Database["public"]["Enums"]["order_status"]
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: undefined
      }
      add_product_review: {
        Args: {
          p_body: string
          p_product_id: string
          p_rating: number
          p_title: string
        }
        Returns: {
          body: string
          created_at: string
          product_id: string
          rating: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "product_reviews_raw"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_review: {
        Args: {
          p_body: string
          p_product_id: number
          p_rating: number
          p_title: string
        }
        Returns: {
          body: string
          created_at: string
          product_id: number
          rating: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "reviews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_review_status: {
        Args: { p_review_id: string; p_status: string }
        Returns: undefined
      }
      apply_stripe_event: { Args: { event: Json }; Returns: undefined }
      apply_successful_payment: {
        Args: { p_order: string }
        Returns: undefined
      }
      cart_add_item: {
        Args: { p_product_id: string; p_qty: number; p_user_id: string }
        Returns: undefined
      }
      cart_ensure: { Args: { p_user_id: string }; Returns: string }
      cart_get_summary: {
        Args: { p_user_id: string }
        Returns: {
          items_count: number
          subtotal: number
        }[]
      }
      clicks_daily: {
        Args: { _from: string; _to: string }
        Returns: {
          count: number
          date: string
        }[]
      }
      create_or_get_pending_order: {
        Args: { p_user_id: string }
        Returns: {
          amount_cents: number | null
          cancelled_at: string | null
          checkout_metadata: Json
          contact_email: string | null
          created_at: string
          currency: string
          discount_total: number
          grand_total: number
          id: string
          metadata_b: Json | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipping_total: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_product_as_seller: {
        Args: {
          p_currency?: string
          p_images?: Json
          p_price: number
          p_slug: string
          p_status?: string
          p_title: string
        }
        Returns: string
      }
      debug_whoami: {
        Args: never
        Returns: {
          db_role: string
          is_admin_flag: boolean
          jwt_email: string
        }[]
      }
      get_my_auth_user: {
        Args: never
        Returns: {
          email: string
          id: string
        }[]
      }
      get_my_reviews: {
        Args: never
        Returns: {
          body: string
          created_at: string
          product_id: string
          product_image_path: string
          product_images: Json
          product_slug: string
          product_title: string
          rating: number
          review_id: string
          status: string
          title: string
          updated_at: string
        }[]
      }
      get_my_seller: {
        Args: never
        Returns: {
          contact_email: string
          created_at: string
          display_name: string
          id: string
          metadata: Json
          slug: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_my_seller_orders: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          items_count: number
          order_id: string
          seller_revenue: number
          status: string
        }[]
      }
      get_my_seller_products: {
        Args: never
        Returns: {
          created_at: string
          currency: string
          price: number
          product_id: string
          qty_available: number
          slug: string
          status: string
          title: string
          updated_at: string
        }[]
      }
      get_my_seller_sales_summary: {
        Args: never
        Returns: {
          gross_revenue: number
          last_order_at: string
          product_id: string
          slug: string
          title: string
          units_sold: number
        }[]
      }
      get_product_page: {
        Args: { _slug: string }
        Returns: {
          id: string
          image_created_at: string
          image_url: string
          price: number
          rating: number
          slug: string
          title: string
        }[]
      }
      get_product_rating_stats: {
        Args: { p_product_id: string }
        Returns: Json
      }
      insert_product_impression: {
        Args: {
          p_ip?: unknown
          p_product_id?: string
          p_referer?: string
          p_session_id?: string
          p_slug: string
          p_user_agent?: string
          p_user_id?: string
          p_utm?: Json
        }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      log_click:
        | {
            Args: { p_params?: Json; p_referrer?: string; p_slug: string }
            Returns: undefined
          }
        | {
            Args: { p_params?: Json; p_product_id: string; p_referrer?: string }
            Returns: undefined
          }
        | {
            Args: {
              p_ip: unknown
              p_product: string
              p_ref: string
              p_session: string
              p_ua: string
            }
            Returns: undefined
          }
        | {
            Args: {
              ip: unknown
              product_id: string
              referrer?: string
              user_agent?: string
            }
            Returns: undefined
          }
      log_impression:
        | {
            Args: { p_params?: Json; p_referrer?: string; p_slug: string }
            Returns: undefined
          }
        | {
            Args: { p_params?: Json; p_product_id: string; p_referrer?: string }
            Returns: undefined
          }
        | {
            Args: {
              p_ip: unknown
              p_product: string
              p_ref: string
              p_session: string
              p_ua: string
            }
            Returns: undefined
          }
        | {
            Args: {
              ip: unknown
              product_id: string
              referrer?: string
              user_agent?: string
            }
            Returns: undefined
          }
      mark_orders_as_sim: {
        Args: { p_mark?: boolean; p_order_ids: string[] }
        Returns: number
      }
      meta_columns: {
        Args: { schemas?: string[]; tbl?: string }
        Returns: {
          column_default: string
          column_name: string
          data_type: string
          is_nullable: string
          schema: string
          table_name: string
        }[]
      }
      meta_policies: {
        Args: { schemas?: string[] }
        Returns: {
          cmd: string
          policy: string
          roles: string[]
          schema: string
          table_name: string
        }[]
      }
      meta_tables: {
        Args: { schemas?: string[] }
        Returns: {
          name: string
          schema: string
        }[]
      }
      meta_views: {
        Args: { schemas?: string[] }
        Returns: {
          name: string
          schema: string
        }[]
      }
      order_allowed_status:
        | {
            Args: { p_status: Database["public"]["Enums"]["order_status"] }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.order_allowed_status(p_status => text), public.order_allowed_status(p_status => order_status). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { p_status: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.order_allowed_status(p_status => text), public.order_allowed_status(p_status => order_status). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      order_allowed_transition:
        | {
            Args: {
              p_from: Database["public"]["Enums"]["order_status"]
              p_to: Database["public"]["Enums"]["order_status"]
            }
            Returns: boolean
          }
        | { Args: { p_from: string; p_to: string }; Returns: boolean }
      order_validate_transition:
        | {
            Args: {
              p_from: Database["public"]["Enums"]["order_status"]
              p_to: Database["public"]["Enums"]["order_status"]
            }
            Returns: undefined
          }
        | { Args: { p_from: string; p_to: string }; Returns: undefined }
      place_order: { Args: { p_user_id: string }; Returns: string }
      place_order_with_items:
        | {
            Args: { payload: Json }
            Returns: {
              order_id: string
            }[]
          }
        | {
            Args: { p_currency?: string; p_items: Json; p_user_id: string }
            Returns: string
          }
      purge_hanging_orders: {
        Args: { p_cutoff?: string; p_dry_run?: boolean }
        Returns: {
          order_id: string
          reason: string
          removed: boolean
        }[]
      }
      purge_processed_events: {
        Args: { cutoff_ts?: string }
        Returns: undefined
      }
      purge_webhook_logs: { Args: { cutoff_ts?: string }; Returns: number }
      purge_webhooks_failed_90d: { Args: never; Returns: undefined }
      recalc_order_totals: { Args: { p_order_id: string }; Returns: undefined }
      recalc_product_rating: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      refresh_analytics_mviews: { Args: never; Returns: undefined }
      refresh_conversions_mviews: { Args: never; Returns: undefined }
      refresh_product_rating_stats:
        | { Args: { p_product_id: string }; Returns: undefined }
        | { Args: never; Returns: undefined }
      refresh_stripe_products_cache: { Args: never; Returns: undefined }
      refund_order_apply: {
        Args: {
          p_amount_cents: number
          p_currency: string
          p_order_id: string
          p_reason?: string
          p_refund_id: string
        }
        Returns: boolean
      }
      search_products: {
        Args: {
          limit_count?: number
          max_price?: number
          min_price?: number
          offset_count?: number
          q?: string
          sort_by?: string
          sort_dir?: string
          statuses?: string[]
        }
        Returns: {
          currency: string | null
          id: string | null
          price_amount: number | null
          price_cents: number | null
          slug: string | null
          source: string | null
          status: string | null
          title: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products_unified"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_products_v2: {
        Args: {
          category_slugs?: string[]
          limit_count?: number
          max_price?: number
          min_price?: number
          min_rating?: number
          offset_count?: number
          q?: string
          skus?: string[]
          sort_by?: string
          sort_dir?: string
          sources?: string[]
          statuses?: string[]
        }
        Returns: {
          currency: string | null
          id: string | null
          price_amount: number | null
          price_cents: number | null
          slug: string | null
          source: string | null
          status: string | null
          title: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products_unified"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_products_v2_count: {
        Args: {
          category_slugs?: string[]
          max_price?: number
          min_price?: number
          min_rating?: number
          q?: string
          skus?: string[]
          sources?: string[]
          statuses?: string[]
        }
        Returns: number
      }
      secure_submit_review_unified: {
        Args: {
          p_body: string
          p_ip_hash: string
          p_rating: number
          p_source_pk: string
          p_source_schema: string
          p_source_table: string
          p_title: string
          p_user_agent: string
          p_user_id?: string
        }
        Returns: string
      }
      set_product_image: {
        Args: {
          p_path: string
          p_product_id: string
          p_sku: string
          p_source_url: string
          p_uploaded_by: string
        }
        Returns: undefined
      }
      table_counts_small: {
        Args: { max_size_mb?: number }
        Returns: {
          exact_count: number
          schema: string
          table_name: string
        }[]
      }
      top_offers_with_share: {
        Args: { _from: string; _limit?: number; _to: string }
        Returns: {
          count: number
          share: number
          slug: string
        }[]
      }
    }
    Enums: {
      order_status:
        | "pending"
        | "paid"
        | "cancelled"
        | "refunded"
        | "canceled"
        | "failed"
      payment_status:
        | "pending"
        | "succeeded"
        | "failed"
        | "authorized"
        | "captured"
        | "paid"
        | "canceled"
        | "refunded"
        | "partial_refund"
        | "requires_action"
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
      order_status: [
        "pending",
        "paid",
        "cancelled",
        "refunded",
        "canceled",
        "failed",
      ],
      payment_status: [
        "pending",
        "succeeded",
        "failed",
        "authorized",
        "captured",
        "paid",
        "canceled",
        "refunded",
        "partial_refund",
        "requires_action",
      ],
    },
  },
} as const

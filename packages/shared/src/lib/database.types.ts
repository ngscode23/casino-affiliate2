export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  aff: {
    Tables: {
      events: {
        Row: {
          event_ts: string
          event_type: Database["aff"]["Enums"]["event_type"]
          id: number
          ip_hash: string | null
          offer_id: number
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          event_ts?: string
          event_type: Database["aff"]["Enums"]["event_type"]
          id?: number
          ip_hash?: string | null
          offer_id: number
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          event_ts?: string
          event_type?: Database["aff"]["Enums"]["event_type"]
          id?: number
          ip_hash?: string | null
          offer_id?: number
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          affiliate_url: string | null
          country: string | null
          created_at: string
          id: number
          is_active: boolean
          license: string | null
          payout_hours: number | null
          slug: string
          source_id: number | null
          title: string
        }
        Insert: {
          affiliate_url?: string | null
          country?: string | null
          created_at?: string
          id?: number
          is_active?: boolean
          license?: string | null
          payout_hours?: number | null
          slug: string
          source_id?: number | null
          title: string
        }
        Update: {
          affiliate_url?: string | null
          country?: string | null
          created_at?: string
          id?: number
          is_active?: boolean
          license?: string | null
          payout_hours?: number | null
          slug?: string
          source_id?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          base_url: string | null
          id: number
          name: string
        }
        Insert: {
          base_url?: string | null
          id?: number
          name: string
        }
        Update: {
          base_url?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      offer_stats_30d: {
        Row: {
          clicks: number | null
          ctr_pct: number | null
          impressions: number | null
          offer_id: number | null
          purchases: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      track_event: {
        Args: {
          p_ip_hash: string
          p_offer_id: number
          p_session: string
          p_type: Database["aff"]["Enums"]["event_type"]
          p_ua: string
        }
        Returns: undefined
      }
    }
    Enums: {
      event_type: "impression" | "click" | "purchase"
      placement_tier: "gold" | "silver" | "bronze"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          country: string
          created_at: string
          id: string
          is_default: boolean
          kind: string
          line1: string
          line2: string | null
          name: string | null
          phone: string | null
          postal_code: string
          user_id: string | null
        }
        Insert: {
          city: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          kind?: string
          line1: string
          line2?: string | null
          name?: string | null
          phone?: string | null
          postal_code: string
          user_id?: string | null
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_default?: boolean
          kind?: string
          line1?: string
          line2?: string | null
          name?: string | null
          phone?: string | null
          postal_code?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          entity: string
          id: number
          payload: Json | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          entity: string
          id?: number
          payload?: Json | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          entity?: string
          id?: number
          payload?: Json | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          price_at_add: number
          product_id: string
          qty: number
          variant_id: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          price_at_add: number
          product_id: string
          qty: number
          variant_id?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          price_at_add?: number
          product_id?: string
          qty?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
        ]
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
      coupon_redemptions: {
        Row: {
          code: string
          order_id: string | null
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code: string
          order_id?: string | null
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code?: string
          order_id?: string | null
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          kind: string
          max_redemptions: number | null
          valid_from: string | null
          valid_to: string | null
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          kind?: string
          max_redemptions?: number | null
          valid_from?: string | null
          valid_to?: string | null
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          kind?: string
          max_redemptions?: number | null
          valid_from?: string | null
          valid_to?: string | null
          value?: number
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
      ecom_products: {
        Row: {
          category_slug: string | null
          created_at: string
          id: string
          sku: string
          images: Json
          price: number
          rating: number
          short_desc: string | null
          slug: string
          specs: Json
          tags: string[]
          title: string
        }
        Insert: {
          category_slug?: string | null
          created_at?: string
          id?: string
          sku: string
          images?: Json
          price: number
          rating?: number
          short_desc?: string | null
          slug: string
          specs?: Json
          tags?: string[]
          title: string
        }
        Update: {
          category_slug?: string | null
          created_at?: string
          id?: string
          sku?: string
          images?: Json
          price?: number
          rating?: number
          short_desc?: string | null
          slug?: string
          specs?: Json
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
      ecom_wishlist: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecom_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
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
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          created_at: string
          currency: string
          discount_total: number
          grand_total: number
          id: string
          paid_at: string | null
          shipping_total: number
          status: string
          subtotal: number
          user_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          discount_total?: number
          grand_total?: number
          id?: string
          paid_at?: string | null
          shipping_total?: number
          status?: string
          subtotal?: number
          user_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          discount_total?: number
          grand_total?: number
          id?: string
          paid_at?: string | null
          shipping_total?: number
          status?: string
          subtotal?: number
          user_id?: string | null
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
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          provider: string
          provider_ref?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string | null
          provider?: string
          provider_ref?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reviews__backup_20250909_181553: {
        Row: {
          content: string | null
          created_at: string
          id: string
          product_id: string | null
          rating: number
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          rating: number
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string | null
          created_at: string
          id: string
          order_id: string | null
          status: string
          tracking_number: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          status?: string
          tracking_number?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          status?: string
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      categories: {
        Row: {
          id: number | null
          name: string | null
          slug: string | null
        }
        Insert: {
          id?: number | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          id?: number | null
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          description: string | null
          id: number | null
          price: number | null
          rating: number | null
          rating_count: number | null
          slug: string | null
          title: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string | null
          id: number | null
          product_id: number | null
          rating: number | null
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: number | null
          product_id?: number | null
          rating?: number | null
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: number | null
          product_id?: number | null
          rating?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews__backup_20250909_181804: {
        Row: {
          body: string | null
          created_at: string | null
          id: number | null
          product_id: number | null
          rating: number | null
          title: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: number | null
          product_id?: number | null
          rating?: number | null
          title?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: number | null
          product_id?: number | null
          rating?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      citext: {
        Args: { "": boolean } | { "": string } | { "": unknown }
        Returns: string
      }
      citext_hash: {
        Args: { "": string }
        Returns: number
      }
      citextin: {
        Args: { "": unknown }
        Returns: string
      }
      citextout: {
        Args: { "": string }
        Returns: unknown
      }
      citextrecv: {
        Args: { "": unknown }
        Returns: string
      }
      citextsend: {
        Args: { "": string }
        Returns: string
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  shop: {
    Tables: {
      categories: {
        Row: {
          id: number
          name: string
          slug: string
        }
        Insert: {
          id?: number
          name: string
          slug: string
        }
        Update: {
          id?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: number
          line_total: number | null
          order_id: number
          price: number
          product_id: number
          qty: number
          variant_id: number | null
        }
        Insert: {
          id?: number
          line_total?: number | null
          order_id: number
          price: number
          product_id: number
          qty: number
          variant_id?: number | null
        }
        Update: {
          id?: number
          line_total?: number | null
          order_id?: number
          price?: number
          product_id?: number
          qty?: number
          variant_id?: number | null
        }
        Relationships: [
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
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          currency: string
          customer_id: string | null
          discount_total: number
          id: number
          status: string
          subtotal: number
          total: number
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount_total?: number
          id?: number
          status?: string
          subtotal: number
          total: number
        }
        Update: {
          created_at?: string
          currency?: string
          customer_id?: string | null
          discount_total?: number
          id?: number
          status?: string
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: number
          product_id: number
          sort_order: number
          url: string
        }
        Insert: {
          id?: number
          product_id: number
          sort_order?: number
          url: string
        }
        Update: {
          id?: number
          product_id?: number
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: number | null
          created_at: string
          currency: string
          description: string | null
          id: number
          is_active: boolean
          price: number
          search: unknown | null
          sku: string
          slug: string | null
          title: string
        }
        Insert: {
          category_id?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: number
          is_active?: boolean
          price: number
          search?: unknown | null
          sku: string
          slug?: string | null
          title: string
        }
        Update: {
          category_id?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: number
          is_active?: boolean
          price?: number
          search?: unknown | null
          sku?: string
          slug?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          conditions: Json
          coupon_code: string | null
          ends_at: string | null
          id: number
          is_stackable: boolean
          name: string
          starts_at: string
          type: Database["shop"]["Enums"]["promo_type"]
          value: number
        }
        Insert: {
          conditions?: Json
          coupon_code?: string | null
          ends_at?: string | null
          id?: number
          is_stackable?: boolean
          name: string
          starts_at?: string
          type: Database["shop"]["Enums"]["promo_type"]
          value: number
        }
        Update: {
          conditions?: Json
          coupon_code?: string | null
          ends_at?: string | null
          id?: number
          is_stackable?: boolean
          name?: string
          starts_at?: string
          type?: Database["shop"]["Enums"]["promo_type"]
          value?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          id: number
          product_id: number
          rating: number
          status: string
          title: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: number
          product_id: number
          rating: number
          status?: string
          title?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: number
          product_id?: number
          rating?: number
          status?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock: {
        Row: {
          qty: number
          updated_at: string
          variant_id: number
        }
        Insert: {
          qty?: number
          updated_at?: string
          variant_id: number
        }
        Update: {
          qty?: number
          updated_at?: string
          variant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: true
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      variants: {
        Row: {
          id: number
          name: string
          price_override: number | null
          product_id: number
          sku: string | null
        }
        Insert: {
          id?: number
          name: string
          price_override?: number | null
          product_id: number
          sku?: string | null
        }
        Update: {
          id?: number
          name?: string
          price_override?: number | null
          product_id?: number
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      product_ratings: {
        Row: {
          product_id: number | null
          rating_count: number | null
          rating_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ratings_vw: {
        Row: {
          product_id: number | null
          rating_count: number | null
          rating_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      active_promotions: {
        Args: { now_ts?: string }
        Returns: {
          conditions: Json
          coupon_code: string | null
          ends_at: string | null
          id: number
          is_stackable: boolean
          name: string
          starts_at: string
          type: Database["shop"]["Enums"]["promo_type"]
          value: number
        }[]
      }
      add_review: {
        Args: {
          p_body: string
          p_product_id: number
          p_rating: number
          p_title: string
        }
        Returns: number
      }
      compute_price: {
        Args: {
          p_coupon?: string
          p_product_id: number
          p_qty?: number
          p_variant_id?: number
        }
        Returns: {
          applied: Json
          final_price: number
        }[]
      }
      moderate_review: {
        Args: { p_review_id: number; p_status: string }
        Returns: undefined
      }
    }
    Enums: {
      promo_type: "percent" | "fixed"
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
  aff: {
    Enums: {
      event_type: ["impression", "click", "purchase"],
      placement_tier: ["gold", "silver", "bronze"],
    },
  },
  public: {
    Enums: {},
  },
  shop: {
    Enums: {
      promo_type: ["percent", "fixed"],
    },
  },
} as const



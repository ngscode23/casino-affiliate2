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
      ab_events: {
        Row: {
          created_at: string
          event: string
          href: string | null
          id: string
          props: Json
          test: string
          ts: string | null
          variant: string
        }
        Insert: {
          created_at?: string
          event: string
          href?: string | null
          id?: string
          props?: Json
          test: string
          ts?: string | null
          variant: string
        }
        Update: {
          created_at?: string
          event?: string
          href?: string | null
          id?: string
          props?: Json
          test?: string
          ts?: string | null
          variant?: string
        }
        Relationships: []
      }
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
      attributes_registry: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          key: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          key: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          key?: string
          type?: string | null
        }
        Relationships: []
      }
      auth_group: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      auth_group_permissions: {
        Row: {
          group_id: number
          id: number
          permission_id: number
        }
        Insert: {
          group_id: number
          id?: number
          permission_id: number
        }
        Update: {
          group_id?: number
          id?: number
          permission_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "auth_group_permissio_permission_id_84c5c92e_fk_auth_perm"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "auth_permission"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_group_permissions_group_id_b120cbf9_fk_auth_group_id"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "auth_group"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_permission: {
        Row: {
          codename: string
          content_type_id: number
          id: number
          name: string
        }
        Insert: {
          codename: string
          content_type_id: number
          id?: number
          name: string
        }
        Update: {
          codename?: string
          content_type_id?: number
          id?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "auth_permission_content_type_id_2f476e4b_fk_django_co"
            columns: ["content_type_id"]
            isOneToOne: false
            referencedRelation: "django_content_type"
            referencedColumns: ["id"]
          },
        ]
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
      auth_user: {
        Row: {
          date_joined: string
          email: string
          first_name: string
          id: number
          is_active: boolean
          is_staff: boolean
          is_superuser: boolean
          last_login: string | null
          last_name: string
          password: string
          username: string
        }
        Insert: {
          date_joined: string
          email: string
          first_name: string
          id?: number
          is_active: boolean
          is_staff: boolean
          is_superuser: boolean
          last_login?: string | null
          last_name: string
          password: string
          username: string
        }
        Update: {
          date_joined?: string
          email?: string
          first_name?: string
          id?: number
          is_active?: boolean
          is_staff?: boolean
          is_superuser?: boolean
          last_login?: string | null
          last_name?: string
          password?: string
          username?: string
        }
        Relationships: []
      }
      auth_user_groups: {
        Row: {
          group_id: number
          id: number
          user_id: number
        }
        Insert: {
          group_id: number
          id?: number
          user_id: number
        }
        Update: {
          group_id?: number
          id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "auth_user_groups_group_id_97559544_fk_auth_group_id"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "auth_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_user_groups_user_id_6a12ed8b_fk_auth_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_user_user_permissions: {
        Row: {
          id: number
          permission_id: number
          user_id: number
        }
        Insert: {
          id?: number
          permission_id: number
          user_id: number
        }
        Update: {
          id?: number
          permission_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "auth_permission"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
        ]
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
      banners: {
        Row: {
          active_from: string | null
          active_to: string | null
          created_at: string
          href: string
          id: string
          image_url: string
          is_active: boolean
          priority: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active_from?: string | null
          active_to?: string | null
          created_at?: string
          href: string
          id?: string
          image_url: string
          is_active?: boolean
          priority?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active_from?: string | null
          active_to?: string | null
          created_at?: string
          href?: string
          id?: string
          image_url?: string
          is_active?: boolean
          priority?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
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
      catalog_published: {
        Row: {
          category_slug: string | null
          created_at: string | null
          id: string
          price: number | null
          rating: number | null
          slug: string | null
          thumbnail_path: string | null
          title: string | null
        }
        Insert: {
          category_slug?: string | null
          created_at?: string | null
          id: string
          price?: number | null
          rating?: number | null
          slug?: string | null
          thumbnail_path?: string | null
          title?: string | null
        }
        Update: {
          category_slug?: string | null
          created_at?: string | null
          id?: string
          price?: number | null
          rating?: number | null
          slug?: string | null
          thumbnail_path?: string | null
          title?: string | null
        }
        Relationships: []
      }
      cms_roles: {
        Row: {
          created_at: string
          created_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          role?: string
          user_id?: string
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
      content_blocks: {
        Row: {
          content_json: Json
          created_at: string
          created_by: string | null
          id: string
          locale: string
          published_at: string | null
          slug: string | null
          status: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content_json?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          locale?: string
          published_at?: string | null
          slug?: string | null
          status?: string
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content_json?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          locale?: string
          published_at?: string | null
          slug?: string | null
          status?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      content_revisions: {
        Row: {
          author: string | null
          created_at: string
          id: string
          locale: string | null
          message: string | null
          snapshot: Json
          target_id: string | null
          target_key: string | null
          target_table: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          id?: string
          locale?: string | null
          message?: string | null
          snapshot: Json
          target_id?: string | null
          target_key?: string | null
          target_table: string
        }
        Update: {
          author?: string | null
          created_at?: string
          id?: string
          locale?: string | null
          message?: string | null
          snapshot?: Json
          target_id?: string | null
          target_key?: string | null
          target_table?: string
        }
        Relationships: []
      }
      currencies: {
        Row: {
          code: string
          minor_unit: number
        }
        Insert: {
          code: string
          minor_unit: number
        }
        Update: {
          code?: string
          minor_unit?: number
        }
        Relationships: []
      }
      django_admin_log: {
        Row: {
          action_flag: number
          action_time: string
          change_message: string
          content_type_id: number | null
          id: number
          object_id: string | null
          object_repr: string
          user_id: number
        }
        Insert: {
          action_flag: number
          action_time: string
          change_message: string
          content_type_id?: number | null
          id?: number
          object_id?: string | null
          object_repr: string
          user_id: number
        }
        Update: {
          action_flag?: number
          action_time?: string
          change_message?: string
          content_type_id?: number | null
          id?: number
          object_id?: string | null
          object_repr?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "django_admin_log_content_type_id_c4bce8eb_fk_django_co"
            columns: ["content_type_id"]
            isOneToOne: false
            referencedRelation: "django_content_type"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "django_admin_log_user_id_c564eba6_fk_auth_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "auth_user"
            referencedColumns: ["id"]
          },
        ]
      }
      django_content_type: {
        Row: {
          app_label: string
          id: number
          model: string
        }
        Insert: {
          app_label: string
          id?: number
          model: string
        }
        Update: {
          app_label?: string
          id?: number
          model?: string
        }
        Relationships: []
      }
      django_migrations: {
        Row: {
          app: string
          applied: string
          id: number
          name: string
        }
        Insert: {
          app: string
          applied: string
          id?: number
          name: string
        }
        Update: {
          app?: string
          applied?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      django_session: {
        Row: {
          expire_date: string
          session_data: string
          session_key: string
        }
        Insert: {
          expire_date: string
          session_data: string
          session_key: string
        }
        Update: {
          expire_date?: string
          session_data?: string
          session_key?: string
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
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_mv"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "ecom_products_view"
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
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_flat"
            referencedColumns: ["id"]
          },
        ]
      }
      ecom_products: {
        Row: {
          catalog_product_id: string | null
          category_slug: string | null
          created_at: string
          currency: string | null
          deleted_at: string | null
          description: string | null
          id: string
          image_path: string | null
          images: Json
          main_image_url: string | null
          price: number
          price_cents: string | null
          rating: number
          seller_id: string | null
          short_desc: string | null
          sku: string
          slug: string
          specs: Json
          status: string
          status_lc: string | null
          tags: string[]
          title: string
          to_delete: boolean | null
        }
        Insert: {
          catalog_product_id?: string | null
          category_slug?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_path?: string | null
          images?: Json
          main_image_url?: string | null
          price: number
          price_cents?: string | null
          rating?: number
          seller_id?: string | null
          short_desc?: string | null
          sku: string
          slug: string
          specs?: Json
          status?: string
          status_lc?: string | null
          tags?: string[]
          title: string
          to_delete?: boolean | null
        }
        Update: {
          catalog_product_id?: string | null
          category_slug?: string | null
          created_at?: string
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_path?: string | null
          images?: Json
          main_image_url?: string | null
          price?: number
          price_cents?: string | null
          rating?: number
          seller_id?: string | null
          short_desc?: string | null
          sku?: string
          slug?: string
          specs?: Json
          status?: string
          status_lc?: string | null
          tags?: string[]
          title?: string
          to_delete?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_products_catalog_product_fk"
            columns: ["catalog_product_id"]
            isOneToOne: false
            referencedRelation: "catalog_product_meta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_products_catalog_product_fk"
            columns: ["catalog_product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_products_catalog_product_id_fkey"
            columns: ["catalog_product_id"]
            isOneToOne: false
            referencedRelation: "catalog_product_meta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_products_catalog_product_id_fkey"
            columns: ["catalog_product_id"]
            isOneToOne: false
            referencedRelation: "catalog_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "fk_ecom_products_currency"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
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
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_flat"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          key: string
          metadata: Json | null
          rollout: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          key: string
          metadata?: Json | null
          rollout?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          key?: string
          metadata?: Json | null
          rollout?: number
          updated_at?: string
        }
        Relationships: []
      }
      feature_toggles: {
        Row: {
          description: string | null
          ends_at: string | null
          is_public: boolean
          key: string
          starts_at: string | null
          updated_at: string
          updated_by: string | null
          value_bool: boolean | null
          value_json: Json | null
        }
        Insert: {
          description?: string | null
          ends_at?: string | null
          is_public?: boolean
          key: string
          starts_at?: string | null
          updated_at?: string
          updated_by?: string | null
          value_bool?: boolean | null
          value_json?: Json | null
        }
        Update: {
          description?: string | null
          ends_at?: string | null
          is_public?: boolean
          key?: string
          starts_at?: string | null
          updated_at?: string
          updated_by?: string | null
          value_bool?: boolean | null
          value_json?: Json | null
        }
        Relationships: []
      }
      form_entries: {
        Row: {
          data: Json
          form_id: string
          id: string
          locale: string | null
          status: string
          submitted_at: string
          submitted_by: string | null
        }
        Insert: {
          data?: Json
          form_id: string
          id?: string
          locale?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
        }
        Update: {
          data?: Json
          form_id?: string
          id?: string
          locale?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_entries_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          schema_json: Json
          slug: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          schema_json?: Json
          slug: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          schema_json?: Json
          slug?: string
          title?: string
        }
        Relationships: []
      }
      hero_campaigns: {
        Row: {
          body: string | null
          created_at: string | null
          end_at: string | null
          eyebrow: string | null
          id: string
          image_alt: string | null
          image_url: string | null
          primary_cta_href: string | null
          primary_cta_label: string | null
          priority: number | null
          published: boolean | null
          secondary_cta_href: string | null
          secondary_cta_label: string | null
          segment_country: string | null
          segment_currency: string | null
          segment_locale: string | null
          start_at: string | null
          theme: string | null
          title: string
          tracking_id: string | null
          updated_at: string | null
          variant: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          end_at?: string | null
          eyebrow?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          primary_cta_href?: string | null
          primary_cta_label?: string | null
          priority?: number | null
          published?: boolean | null
          secondary_cta_href?: string | null
          secondary_cta_label?: string | null
          segment_country?: string | null
          segment_currency?: string | null
          segment_locale?: string | null
          start_at?: string | null
          theme?: string | null
          title: string
          tracking_id?: string | null
          updated_at?: string | null
          variant?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          end_at?: string | null
          eyebrow?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          primary_cta_href?: string | null
          primary_cta_label?: string | null
          priority?: number | null
          published?: boolean | null
          secondary_cta_href?: string | null
          secondary_cta_label?: string | null
          segment_country?: string | null
          segment_currency?: string | null
          segment_locale?: string | null
          start_at?: string | null
          theme?: string | null
          title?: string
          tracking_id?: string | null
          updated_at?: string | null
          variant?: string | null
        }
        Relationships: []
      }
      item_item_similarities: {
        Row: {
          co_events: number
          product_a: string
          product_b: string
          score: number
          updated_at: string
        }
        Insert: {
          co_events?: number
          product_a: string
          product_b: string
          score: number
          updated_at?: string
        }
        Update: {
          co_events?: number
          product_a?: string
          product_b?: string
          score?: number
          updated_at?: string
        }
        Relationships: []
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
      media_assets: {
        Row: {
          alt: string | null
          bucket: string
          checksum: string | null
          created_at: string
          description: string | null
          height: number | null
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_key: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt?: string | null
          bucket?: string
          checksum?: string | null
          created_at?: string
          description?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_key: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt?: string | null
          bucket?: string
          checksum?: string | null
          created_at?: string
          description?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_key?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      navigation_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_external: boolean
          label: string
          locale: string
          menu: string
          parent_id: string | null
          published: boolean
          sort_order: number
          updated_at: string
          updated_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_external?: boolean
          label: string
          locale?: string
          menu: string
          parent_id?: string | null
          published?: boolean
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_external?: boolean
          label?: string
          locale?: string
          menu?: string
          parent_id?: string | null
          published?: boolean
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "navigation_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "navigation_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "published_navigation_links"
            referencedColumns: ["id"]
          },
        ]
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
      offers: {
        Row: {
          created_at: string | null
          currency: string | null
          ends_at: string | null
          id: number
          is_pinned: boolean | null
          partner_id: number | null
          price: number | null
          slug: string
          starts_at: string | null
          title: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          ends_at?: string | null
          id?: number
          is_pinned?: boolean | null
          partner_id?: number | null
          price?: number | null
          slug: string
          starts_at?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          ends_at?: string | null
          id?: number
          is_pinned?: boolean | null
          partner_id?: number | null
          price?: number | null
          slug?: string
          starts_at?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_mv"
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
            referencedRelation: "ecom_products_view"
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
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount_public"
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
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_flat"
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
          amount_cents: string | null
          applied_promotions: Json
          cancelled_at: string | null
          checkout_metadata: Json
          contact_email: string | null
          coupon_codes: string[]
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
          amount_cents?: string | null
          applied_promotions?: Json
          cancelled_at?: string | null
          checkout_metadata?: Json
          contact_email?: string | null
          coupon_codes?: string[]
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
          amount_cents?: string | null
          applied_promotions?: Json
          cancelled_at?: string | null
          checkout_metadata?: Json
          contact_email?: string | null
          coupon_codes?: string[]
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
        Relationships: [
          {
            foreignKeyName: "fk_orders_currency"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      orders_archive: {
        Row: {
          amount_cents: string | null
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
          amount_cents?: string | null
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
          amount_cents?: string | null
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
      page_sections: {
        Row: {
          block_id: string
          created_at: string
          created_by: string | null
          id: string
          is_draft: boolean
          locale: string
          page_path: string
          published_at: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
          visible: boolean
        }
        Insert: {
          block_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_draft?: boolean
          locale?: string
          page_path: string
          published_at?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          visible?: boolean
        }
        Update: {
          block_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_draft?: boolean
          locale?: string
          page_path?: string
          published_at?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "page_sections_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "content_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_sections_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "published_content_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_offers: {
        Row: {
          created_at: string | null
          offer_id: number
          partner_id: number
          pin_expires_at: string | null
          pinned: boolean | null
        }
        Insert: {
          created_at?: string | null
          offer_id: number
          partner_id: number
          pin_expires_at?: string | null
          pinned?: boolean | null
        }
        Update: {
          created_at?: string | null
          offer_id?: number
          partner_id?: number
          pin_expires_at?: string | null
          pinned?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_offers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          created_at: string | null
          id: number
          name: string
          slug: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          slug?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          slug?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      payment_refunds: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: number
          order_id: string | null
          reason: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: number
          order_id?: string | null
          reason?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: number
          order_id?: string | null
          reason?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_history_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payment_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      processed_events: {
        Row: {
          created_at: string | null
          event_id: string
          event_type: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          event_type?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          event_type?: string | null
        }
        Relationships: []
      }
      product_attributes: {
        Row: {
          created_at: string | null
          key: string
          product_id: string
          value: string | null
        }
        Insert: {
          created_at?: string | null
          key: string
          product_id: string
          value?: string | null
        }
        Update: {
          created_at?: string | null
          key?: string
          product_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_key_fkey"
            columns: ["key"]
            isOneToOne: false
            referencedRelation: "attributes_registry"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_flat"
            referencedColumns: ["id"]
          },
        ]
      }
      product_id_map: {
        Row: {
          created_at: string | null
          external_id: string
          id: number
          product_id: string | null
          source: string
        }
        Insert: {
          created_at?: string | null
          external_id: string
          id?: number
          product_id?: string | null
          source: string
        }
        Update: {
          created_at?: string | null
          external_id?: string
          id?: number
          product_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_id_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_id_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_id_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_id_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_id_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_id_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_id_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_id_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_id_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_id_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_id_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_id_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_id_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_flat"
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
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_mv"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "ecom_products_view"
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
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_flat"
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
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_rating_stats_product_uid_fkey"
            columns: ["product_uid"]
            isOneToOne: true
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_rating_stats_product_uid_fkey"
            columns: ["product_uid"]
            isOneToOne: true
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_rating_stats_product_uid_fkey"
            columns: ["product_uid"]
            isOneToOne: true
            referencedRelation: "catalog_mv"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "ecom_products_view"
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
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_rating_stats_product_uid_fkey"
            columns: ["product_uid"]
            isOneToOne: true
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_rating_stats_product_uid_fkey"
            columns: ["product_uid"]
            isOneToOne: true
            referencedRelation: "product_with_discount_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_rating_stats_product_uid_fkey"
            columns: ["product_uid"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_rating_stats_product_uid_fkey"
            columns: ["product_uid"]
            isOneToOne: true
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_rating_stats_product_uid_fkey"
            columns: ["product_uid"]
            isOneToOne: true
            referencedRelation: "v_products_flat"
            referencedColumns: ["id"]
          },
        ]
      }
      product_review_messages: {
        Row: {
          author_id: string | null
          author_role: string
          body: string
          created_at: string
          id: string
          parent_id: string | null
          product_id: string
          review_raw_id: string | null
          root_review_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_role: string
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          product_id: string
          review_raw_id?: string | null
          root_review_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_role?: string
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          product_id?: string
          review_raw_id?: string | null
          root_review_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_review_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_review_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_flat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_raw_fk"
            columns: ["review_raw_id"]
            isOneToOne: false
            referencedRelation: "product_reviews_admin_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_raw_fk"
            columns: ["review_raw_id"]
            isOneToOne: false
            referencedRelation: "product_reviews_admin_v"
            referencedColumns: ["review_id"]
          },
          {
            foreignKeyName: "product_review_messages_raw_fk"
            columns: ["review_raw_id"]
            isOneToOne: false
            referencedRelation: "product_reviews_raw"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_raw_fk"
            columns: ["review_raw_id"]
            isOneToOne: false
            referencedRelation: "reviews_unified"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_review_messages_raw_fk"
            columns: ["review_raw_id"]
            isOneToOne: false
            referencedRelation: "reviews_unified"
            referencedColumns: ["review_id"]
          },
          {
            foreignKeyName: "product_review_messages_root_fk"
            columns: ["root_review_id"]
            isOneToOne: false
            referencedRelation: "product_review_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews_raw: {
        Row: {
          body: string
          created_at: string
          id: string
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
          id?: string
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
          id?: string
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
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_mv"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "ecom_products_view"
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
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_flat"
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
      promotion_actions: {
        Row: {
          config: Json
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["promotion_action_kind"]
          promotion_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["promotion_action_kind"]
          promotion_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["promotion_action_kind"]
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_actions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_conditions: {
        Row: {
          config: Json
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["promotion_condition_kind"]
          promotion_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["promotion_condition_kind"]
          promotion_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["promotion_condition_kind"]
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_conditions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_coupons: {
        Row: {
          code: string
          created_at: string
          ends_at: string | null
          id: string
          metadata: Json
          promotion_id: string
          starts_at: string | null
          updated_at: string
          usage_limit_per_user: number | null
          usage_limit_total: number | null
        }
        Insert: {
          code: string
          created_at?: string
          ends_at?: string | null
          id?: string
          metadata?: Json
          promotion_id: string
          starts_at?: string | null
          updated_at?: string
          usage_limit_per_user?: number | null
          usage_limit_total?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          metadata?: Json
          promotion_id?: string
          starts_at?: string | null
          updated_at?: string
          usage_limit_per_user?: number | null
          usage_limit_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_coupons_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_usages: {
        Row: {
          applied_actions: Json
          context: Json
          coupon_id: string | null
          created_at: string
          currency: string
          discount_amount: number
          id: string
          order_id: string | null
          promotion_id: string
          user_id: string | null
        }
        Insert: {
          applied_actions?: Json
          context?: Json
          coupon_id?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          promotion_id: string
          user_id?: string | null
        }
        Update: {
          applied_actions?: Json
          context?: Json
          coupon_id?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          id?: string
          order_id?: string | null
          promotion_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_promo_usages_currency"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "promotion_usages_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "promotion_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_usages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_history_v"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "promotion_usages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_usages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_usages_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          combinable: boolean
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          metadata: Json
          name: string
          priority: number
          slug: string
          stack_group: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["promotion_status"]
          updated_at: string
        }
        Insert: {
          combinable?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          metadata?: Json
          name: string
          priority?: number
          slug: string
          stack_group?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["promotion_status"]
          updated_at?: string
        }
        Update: {
          combinable?: boolean
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          metadata?: Json
          name?: string
          priority?: number
          slug?: string
          stack_group?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["promotion_status"]
          updated_at?: string
        }
        Relationships: []
      }
      publish_jobs: {
        Row: {
          action: string
          attempts: number
          created_by: string | null
          executed_at: string | null
          id: string
          last_error: string | null
          payload: Json
          scheduled_at: string
          status: string
          target: string
        }
        Insert: {
          action?: string
          attempts?: number
          created_by?: string | null
          executed_at?: string | null
          id?: string
          last_error?: string | null
          payload?: Json
          scheduled_at?: string
          status?: string
          target: string
        }
        Update: {
          action?: string
          attempts?: number
          created_by?: string | null
          executed_at?: string | null
          id?: string
          last_error?: string | null
          payload?: Json
          scheduled_at?: string
          status?: string
          target?: string
        }
        Relationships: []
      }
      recent_views: {
        Row: {
          anon_id: string | null
          id: string
          product_id: string
          seen_at: string
          user_id: string | null
          weight: number
        }
        Insert: {
          anon_id?: string | null
          id?: string
          product_id: string
          seen_at?: string
          user_id?: string | null
          weight?: number
        }
        Update: {
          anon_id?: string | null
          id?: string
          product_id?: string
          seen_at?: string
          user_id?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "recent_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recent_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recent_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recent_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recent_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recent_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recent_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "ecom_products_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recent_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recent_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recent_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recent_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recent_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recent_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_flat"
            referencedColumns: ["id"]
          },
        ]
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
      scheduled_content: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          payload: Json
          processed_at: string | null
          publish_at: string
          target: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          publish_at: string
          target: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          publish_at?: string
          target?: string
        }
        Relationships: []
      }
      sellers: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: number
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: number
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: number
          status?: string | null
          user_id?: string | null
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
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_mv"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "ecom_products_view"
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
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_flat"
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
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_mv"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "ecom_products_view"
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
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_impressions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_flat"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          is_public: boolean
          key: string
          locale: string
          updated_at: string
          updated_by: string | null
          value_json: Json
        }
        Insert: {
          is_public?: boolean
          key: string
          locale?: string
          updated_at?: string
          updated_by?: string | null
          value_json?: Json
        }
        Update: {
          is_public?: boolean
          key?: string
          locale?: string
          updated_at?: string
          updated_by?: string | null
          value_json?: Json
        }
        Relationships: []
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
          expected_amount_cents: string | null
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
          stripe_amount_cents: string | null
          stripe_currency: string | null
          type: string
        }
        Insert: {
          api_version?: string | null
          created_utc: string
          data: Json
          expected_amount_cents?: string | null
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
          stripe_amount_cents?: string | null
          stripe_currency?: string | null
          type: string
        }
        Update: {
          api_version?: string | null
          created_utc?: string
          data?: Json
          expected_amount_cents?: string | null
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
          stripe_amount_cents?: string | null
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
      translations: {
        Row: {
          id: string
          locale: string
          namespace: string | null
          ns_norm: string | null
          tkey: string
          updated_at: string
          updated_by: string | null
          value_json: Json | null
          value_text: string | null
        }
        Insert: {
          id?: string
          locale: string
          namespace?: string | null
          ns_norm?: string | null
          tkey: string
          updated_at?: string
          updated_by?: string | null
          value_json?: Json | null
          value_text?: string | null
        }
        Update: {
          id?: string
          locale?: string
          namespace?: string | null
          ns_norm?: string | null
          tkey?: string
          updated_at?: string
          updated_by?: string | null
          value_json?: Json | null
          value_text?: string | null
        }
        Relationships: []
      }
      user_events: {
        Row: {
          anon_id: string
          category: string | null
          country: string | null
          device: string | null
          event: string
          experiment_variant: string | null
          id: number
          metadata: Json | null
          price_bucket: string | null
          price_cents: string | null
          product_id: string | null
          referrer: string | null
          ts: string
          weight: number
        }
        Insert: {
          anon_id: string
          category?: string | null
          country?: string | null
          device?: string | null
          event: string
          experiment_variant?: string | null
          id?: number
          metadata?: Json | null
          price_bucket?: string | null
          price_cents?: string | null
          product_id?: string | null
          referrer?: string | null
          ts?: string
          weight?: number
        }
        Update: {
          anon_id?: string
          category?: string | null
          country?: string | null
          device?: string | null
          event?: string
          experiment_variant?: string | null
          id?: number
          metadata?: Json | null
          price_bucket?: string | null
          price_cents?: string | null
          product_id?: string | null
          referrer?: string | null
          ts?: string
          weight?: number
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          anon_id: string
          categories: string[]
          cold_start: boolean
          countries: string[]
          device_pref: string | null
          discount_affinity: number
          experiment_variant: string | null
          first_seen: string
          last_seen: string
          opt_out: boolean
          updated_at: string
          visit_count: number
        }
        Insert: {
          anon_id: string
          categories?: string[]
          cold_start?: boolean
          countries?: string[]
          device_pref?: string | null
          discount_affinity?: number
          experiment_variant?: string | null
          first_seen?: string
          last_seen?: string
          opt_out?: boolean
          updated_at?: string
          visit_count?: number
        }
        Update: {
          anon_id?: string
          categories?: string[]
          cold_start?: boolean
          countries?: string[]
          device_pref?: string | null
          discount_affinity?: number
          experiment_variant?: string | null
          first_seen?: string
          last_seen?: string
          opt_out?: boolean
          updated_at?: string
          visit_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      _alert_dangling_category_slugs: {
        Row: {
          category_slug: string | null
          id: string | null
          slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      _alert_inactive_category_products: {
        Row: {
          category_slug: string | null
          id: string | null
          slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      _alert_missing_thumbnails: {
        Row: {
          created_at: string | null
          id: string | null
          slug: string | null
        }
        Relationships: []
      }
      catalog_brands: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
          slug: string | null
          status: string | null
          is_active: boolean | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
          status?: string | null
          is_active?: boolean | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
          status?: string | null
          is_active?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      catalog_mv: {
        Row: {
          category_slug: string | null
          created_at: string | null
          id: string | null
          price: number | null
          rating: number | null
          slug: string | null
          thumbnail_path: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      catalog_product_meta: {
        Row: {
          brand_id: string | null
          brand_name: string | null
          brand_slug: string | null
          id: string | null
          slug: string | null
          title: string | null
        }
        Relationships: []
      }
      catalog_products: {
        Row: {
          brand_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string | null
          price: number | null
          slug: string | null
          specs: Json | null
          status: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string | null
          price?: number | null
          slug?: string | null
          specs?: Json | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string | null
          price?: number | null
          slug?: string | null
          specs?: Json | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          description: string | null
          id: string | null
          is_active: boolean | null
          parent_id: string | null
          slug: string | null
          sort_order: number | null
          title: string | null
        }
        Insert: {
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          parent_id?: string | null
          slug?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Update: {
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          parent_id?: string | null
          slug?: string | null
          sort_order?: number | null
          title?: string | null
        }
        Relationships: []
      }
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
      co_viewed_mv: {
        Row: {
          product_a: string | null
          product_b: string | null
          score: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      conversions_by_slug_day_mv: {
        Row: {
          conversions: number | null
          day: string | null
          slug: string | null
        }
        Relationships: []
      }
      conversions_by_source_day_mv: {
        Row: {
          conversions: number | null
          day: string | null
          source: string | null
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
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_mv"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "ecom_products_view"
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
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_flat"
            referencedColumns: ["id"]
          },
        ]
      }
      ecom_products_view: {
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
          price_cents: string | null
          rating: number | null
          short_desc: string | null
          sku: string | null
          slug: string | null
          specs: Json | null
          status: string | null
          tags: string[] | null
          title: string | null
        }
        Insert: {
          category_slug?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string | null
          image_path?: string | null
          images?: Json | null
          main_image_url?: never
          price?: number | null
          price_cents?: string | null
          rating?: number | null
          short_desc?: string | null
          sku?: string | null
          slug?: string | null
          specs?: Json | null
          status?: string | null
          tags?: string[] | null
          title?: string | null
        }
        Update: {
          category_slug?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string | null
          image_path?: string | null
          images?: Json | null
          main_image_url?: never
          price?: number | null
          price_cents?: string | null
          rating?: number | null
          short_desc?: string | null
          sku?: string | null
          slug?: string | null
          specs?: Json | null
          status?: string | null
          tags?: string[] | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "fk_ecom_products_currency"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
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
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      filters: {
        Row: {
          category_id: string | null
          filter_key: string | null
          id: string | null
          label: string | null
          options: Json | null
          sort_order: number | null
          type: string | null
        }
        Insert: {
          category_id?: string | null
          filter_key?: string | null
          id?: string | null
          label?: string | null
          options?: Json | null
          sort_order?: number | null
          type?: string | null
        }
        Update: {
          category_id?: string | null
          filter_key?: string | null
          id?: string | null
          label?: string | null
          options?: Json | null
          sort_order?: number | null
          type?: string | null
        }
        Relationships: []
      }
      header_categories: {
        Row: {
          description: string | null
          id: string | null
          is_active: boolean | null
          parent_id: string | null
          slug: string | null
          sort_order: number | null
          title: string | null
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "fk_orders_currency"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
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
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_mv"
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
            referencedRelation: "ecom_products_view"
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
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount_public"
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
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_flat"
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
        Relationships: [
          {
            foreignKeyName: "fk_orders_currency"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      product: {
        Row: {
          currency: string | null
          id: string | null
          name: string | null
          priceCents: string | null
          sku: string | null
          updatedAt: string | null
        }
        Relationships: []
      }
      product_catalog: {
        Row: {
          created_at: string | null
          product_uid: string | null
          slug: string | null
          source_pk: string | null
          source_schema: string | null
          source_table: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          product_uid?: string | null
          slug?: string | null
          source_pk?: string | null
          source_schema?: string | null
          source_table?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          product_uid?: string | null
          slug?: string | null
          source_pk?: string | null
          source_schema?: string | null
          source_table?: string | null
          title?: string | null
        }
        Relationships: []
      }
      product_catalog_v: {
        Row: {
          created_at: string | null
          product_uid: string | null
          slug: string | null
          source_pk: string | null
          source_schema: string | null
          source_table: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          product_uid?: string | null
          slug?: string | null
          source_pk?: string | null
          source_schema?: string | null
          source_table?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          product_uid?: string | null
          slug?: string | null
          source_pk?: string | null
          source_schema?: string | null
          source_table?: string | null
          title?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          category_id: string | null
          is_primary: boolean | null
          product_id: string | null
        }
        Insert: {
          category_id?: string | null
          is_primary?: boolean | null
          product_id?: string | null
        }
        Update: {
          category_id?: string | null
          is_primary?: boolean | null
          product_id?: string | null
        }
        Relationships: []
      }
      product_filters: {
        Row: {
          filter_key: string | null
          filter_value: string | null
          product_id: string | null
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
      product_media: {
        Row: {
          alt: string | null
          id: string | null
          product_id: string | null
          sort_order: number | null
          type: string | null
          url: string | null
        }
        Insert: {
          alt?: string | null
          id?: string | null
          product_id?: string | null
          sort_order?: number | null
          type?: string | null
          url?: string | null
        }
        Update: {
          alt?: string | null
          id?: string | null
          product_id?: string | null
          sort_order?: number | null
          type?: string | null
          url?: string | null
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
          review_id: string | null
          review_title: string | null
          reviewer_id: string | null
          source_pk: string | null
          source_schema: string | null
          source_table: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "catalog_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "ecom_products_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "ecom_products_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "product_with_discount_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "v_products_flat"
            referencedColumns: ["id"]
          },
        ]
      }
      product_with_discount: {
        Row: {
          amountOffCts: number | null
          base_cents: string | null
          category_slug: string | null
          created_at: string | null
          currency: string | null
          discount_id: string | null
          discount_name: string | null
          effective_price_cents: string | null
          id: string | null
          percentOff: number | null
          sku: string | null
          slug: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "fk_ecom_products_currency"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      product_with_discount_public: {
        Row: {
          basePriceCents: string | null
          category_slug: string | null
          created_at: string | null
          currency: string | null
          effectivePriceCents: string | null
          hasDiscount: boolean | null
          id: string | null
          name: string | null
          priceCents: string | null
          rating: number | null
          sku: string | null
          slug: string | null
          thumbnail: string | null
          thumbnail_path: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      product_with_discount_with_dataset: {
        Row: {
          basePriceCents: string | null
          category_slug: string | null
          created_at: string | null
          currency: string | null
          dataset: string | null
          effectivePriceCents: string | null
          hasDiscount: boolean | null
          id: string | null
          name: string | null
          priceCents: string | null
          rating: number | null
          sku: string | null
          slug: string | null
          thumbnail: string | null
          thumbnail_path: string | null
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
          price_cents: string | null
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
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "fk_ecom_products_currency"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      products_unified: {
        Row: {
          currency: string | null
          id: string | null
          price_amount: number | null
          price_cents: string | null
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
          price_cents: string | null
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
      published_catalog: {
        Row: {
          category_slug: string | null
          created_at: string | null
          id: string | null
          price: number | null
          rating: number | null
          slug: string | null
          thumbnail_path: string | null
          title: string | null
        }
        Insert: {
          category_slug?: string | null
          created_at?: string | null
          id?: string | null
          price?: number | null
          rating?: number | null
          slug?: string | null
          thumbnail_path?: string | null
          title?: string | null
        }
        Update: {
          category_slug?: string | null
          created_at?: string | null
          id?: string | null
          price?: number | null
          rating?: number | null
          slug?: string | null
          thumbnail_path?: string | null
          title?: string | null
        }
        Relationships: []
      }
      published_content_blocks: {
        Row: {
          content_json: Json | null
          id: string | null
          locale: string | null
          published_at: string | null
          slug: string | null
          type: string | null
        }
        Insert: {
          content_json?: Json | null
          id?: string | null
          locale?: string | null
          published_at?: string | null
          slug?: string | null
          type?: string | null
        }
        Update: {
          content_json?: Json | null
          id?: string | null
          locale?: string | null
          published_at?: string | null
          slug?: string | null
          type?: string | null
        }
        Relationships: []
      }
      published_media_assets: {
        Row: {
          alt: string | null
          bucket: string | null
          created_at: string | null
          description: string | null
          height: number | null
          id: string | null
          mime_type: string | null
          size_bytes: number | null
          storage_key: string | null
          width: number | null
        }
        Insert: {
          alt?: string | null
          bucket?: string | null
          created_at?: string | null
          description?: string | null
          height?: number | null
          id?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          storage_key?: string | null
          width?: number | null
        }
        Update: {
          alt?: string | null
          bucket?: string | null
          created_at?: string | null
          description?: string | null
          height?: number | null
          id?: string | null
          mime_type?: string | null
          size_bytes?: number | null
          storage_key?: string | null
          width?: number | null
        }
        Relationships: []
      }
      published_navigation_links: {
        Row: {
          id: string | null
          is_external: boolean | null
          label: string | null
          locale: string | null
          menu: string | null
          sort_order: number | null
          url: string | null
        }
        Insert: {
          id?: string | null
          is_external?: boolean | null
          label?: string | null
          locale?: string | null
          menu?: string | null
          sort_order?: number | null
          url?: string | null
        }
        Update: {
          id?: string | null
          is_external?: boolean | null
          label?: string | null
          locale?: string | null
          menu?: string | null
          sort_order?: number | null
          url?: string | null
        }
        Relationships: []
      }
      published_page_sections: {
        Row: {
          block_id: string | null
          id: string | null
          locale: string | null
          page_path: string | null
          sort_order: number | null
        }
        Insert: {
          block_id?: string | null
          id?: string | null
          locale?: string | null
          page_path?: string | null
          sort_order?: number | null
        }
        Update: {
          block_id?: string | null
          id?: string | null
          locale?: string | null
          page_path?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "page_sections_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "content_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_sections_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "published_content_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      published_site_settings: {
        Row: {
          key: string | null
          locale: string | null
          value_json: Json | null
        }
        Insert: {
          key?: string | null
          locale?: string | null
          value_json?: Json | null
        }
        Update: {
          key?: string | null
          locale?: string | null
          value_json?: Json | null
        }
        Relationships: []
      }
      published_translations: {
        Row: {
          locale: string | null
          namespace: string | null
          tkey: string | null
          value: string | null
        }
        Insert: {
          locale?: string | null
          namespace?: string | null
          tkey?: string | null
          value?: never
        }
        Update: {
          locale?: string | null
          namespace?: string | null
          tkey?: string | null
          value?: never
        }
        Relationships: []
      }
      reviews_unified: {
        Row: {
          created_at: string | null
          id: string | null
          product_slug: string | null
          product_title: string | null
          product_uid: string | null
          rating: number | null
          review_body: string | null
          review_id: string | null
          review_title: string | null
          reviewer_id: string | null
          source_pk: string | null
          source_schema: string | null
          source_table: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "catalog_mv"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "ecom_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "ecom_products_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "ecom_products_with_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "product_with_discount_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_uid"]
            isOneToOne: false
            referencedRelation: "v_products_flat"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string | null
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          key?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          key?: string | null
          updated_at?: string | null
          value?: Json | null
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
      user_interest_scores: {
        Row: {
          anon_id: string | null
          category: string | null
          last_event: string | null
          score: number | null
        }
        Relationships: []
      }
      v_catalog: {
        Row: {
          category_slug: string | null
          id: string | null
          image_path: string | null
          main_image_url: string | null
          price: number | null
          rating: number | null
          slug: string | null
          title: string | null
        }
        Insert: {
          category_slug?: string | null
          id?: string | null
          image_path?: string | null
          main_image_url?: string | null
          price?: number | null
          rating?: number | null
          slug?: string | null
          title?: string | null
        }
        Update: {
          category_slug?: string | null
          id?: string | null
          image_path?: string | null
          main_image_url?: string | null
          price?: number | null
          rating?: number | null
          slug?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      v_product_images: {
        Row: {
          metadata: Json | null
          path: string | null
          product_id: string | null
          source_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_dangling_category_slugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_inactive_category_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "_alert_missing_thumbnails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog_mv"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "ecom_products_view"
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
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_with_discount_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecom_product_image_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_products_flat"
            referencedColumns: ["id"]
          },
        ]
      }
      v_products_flat: {
        Row: {
          attributes: Json | null
          category_slug: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          id: string | null
          image_path: string | null
          images: Json | null
          main_image_url: string | null
          price: number | null
          price_cents: string | null
          rating: number | null
          seller_id: string | null
          short_desc: string | null
          sku: string | null
          slug: string | null
          specs: Json | null
          status: string | null
          status_lc: string | null
          tags: string[] | null
          title: string | null
          to_delete: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fk"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "ecom_products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "header_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "fk_ecom_products_currency"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
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
      _best_discount_for_product: {
        Args: { p_category: string; p_id: string }
        Returns: {
          amount_off_cents: string
          percent_off: number
        }[]
      }
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
      _thumbnail_for_product: {
        Args: { p_id: string; p_sku: string; p_slug: string }
        Returns: string
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
          id: string
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
      add_review_v2: {
        Args: {
          _body: string
          _product_id: string
          _rating: number
          _title: string
          _user_id: string
        }
        Returns: Json
      }
      admin_dashboard_metrics_v1: {
        Args: { day_count?: number; month_count?: number }
        Returns: Json
      }
      admin_post_review_reply: {
        Args: { _actor_id?: string; _body: string; _review_id: string }
        Returns: string
      }
      admin_purge_except_product: {
        Args: { dry_run?: boolean; keep_id: string }
        Returns: Json
      }
      admin_set_product_status: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      admin_set_review_status: {
        Args: { p_review_id: string; p_status: string }
        Returns: undefined
      }
      admin_upsert_product: { Args: { p: Json }; Returns: string }
      anon_from_session: { Args: { session_id: string }; Returns: string }
      api_catalog_list: {
        Args: { _category?: string; _limit?: number; _offset?: number }
        Returns: {
          created_at: string
          id: string
          price: number
          rating: number
          slug: string
          thumbnail_path: string
          title: string
        }[]
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
      cleanup_clicks_before: { Args: { ts: string }; Returns: number }
      cleanup_recent_views: { Args: never; Returns: undefined }
      clicks_daily: {
        Args: { _from: string; _to: string }
        Returns: {
          count: number
          date: string
        }[]
      }
      cms_attach_section: {
        Args: {
          p_block_id: string
          p_is_draft?: boolean
          p_locale: string
          p_page_path: string
          p_published_at?: string
          p_sort_order?: number
          p_visible?: boolean
        }
        Returns: string
      }
      cms_create_block: {
        Args: {
          p_content: Json
          p_locale: string
          p_slug?: string
          p_status?: string
          p_type: string
        }
        Returns: string
      }
      cms_enqueue_publish: {
        Args: { p_action?: string; p_payload?: Json; p_target: string }
        Returns: string
      }
      cms_insert_revision: {
        Args: {
          p_locale: string
          p_message?: string
          p_snapshot: Json
          p_target_id: string
          p_target_key: string
          p_target_table: string
        }
        Returns: string
      }
      cms_is_admin: { Args: never; Returns: boolean }
      cms_is_editor: { Args: never; Returns: boolean }
      cms_publish_block: {
        Args: { p_block_id: string; p_when?: string }
        Returns: undefined
      }
      cms_publish_nav: {
        Args: { p_locale?: string; p_menu: string; p_when?: string }
        Returns: undefined
      }
      cms_publish_section: {
        Args: { p_section_id: string; p_when?: string }
        Returns: undefined
      }
      cms_unpublish_block: { Args: { p_block_id: string }; Returns: undefined }
      cms_unpublish_nav: {
        Args: { p_locale?: string; p_menu: string }
        Returns: undefined
      }
      cms_unpublish_section: {
        Args: { p_section_id: string }
        Returns: undefined
      }
      cms_upsert_setting: {
        Args: {
          p_is_public?: boolean
          p_key: string
          p_locale: string
          p_value: Json
        }
        Returns: undefined
      }
      cms_upsert_translation: {
        Args: {
          p_locale: string
          p_namespace?: string
          p_tkey: string
          p_value_json?: Json
          p_value_text?: string
        }
        Returns: string
      }
      create_or_get_pending_order: {
        Args: { p_user_id: string }
        Returns: {
          amount_cents: string | null
          applied_promotions: Json
          cancelled_at: string | null
          checkout_metadata: Json
          contact_email: string | null
          coupon_codes: string[]
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
      ecom_wishlist_toggle: { Args: { p_product_id: string }; Returns: string }
      ensure_review_root: { Args: { _review_id: string }; Returns: string }
      expire_partner_pins: { Args: never; Returns: number }
      get_header_categories: {
        Args: { p_limit?: number }
        Returns: Database["public"]["Views"]["categories"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "categories"
          isOneToOne: false
          isSetofReturn: true
        }
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
      get_recent_products: {
        Args: { _limit?: number }
        Returns: {
          category_slug: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string | null
          image_path: string | null
          images: Json | null
          main_image_url: string | null
          price: number | null
          price_cents: string | null
          rating: number | null
          seller_id: string | null
          short_desc: string | null
          sku: string | null
          slug: string | null
          specs: Json | null
          status: string | null
          tags: string[] | null
          title: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_recommendations_recent: {
        Args: { _limit?: number }
        Returns: {
          product_id: string
          score: number
        }[]
      }
      get_recommendations_recent_with_details: {
        Args: { _limit?: number }
        Returns: {
          category_slug: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string | null
          image_path: string | null
          images: Json | null
          main_image_url: string | null
          price: number | null
          price_cents: string | null
          rating: number | null
          seller_id: string | null
          short_desc: string | null
          sku: string | null
          slug: string | null
          specs: Json | null
          status: string | null
          tags: string[] | null
          title: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_recs: {
        Args: { p_actor: string; p_limit?: number }
        Returns: {
          product_id: string
          reason: string
          score: number
        }[]
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
      log_impression_v1: {
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
      merge_recent_views: {
        Args: { _anon_id: string; _user_id: string }
        Returns: undefined
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
      pending_reviews_admin_v1: {
        Args: { limit_count?: number }
        Returns: Json
      }
      pinned_offer_meta: { Args: { slug: string }; Returns: Json }
      pinned_offer_slugs: { Args: never; Returns: string[] }
      place_order: { Args: { p_user_id: string }; Returns: string }
      place_order_with_items: {
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
      purge_old_events: { Args: { days?: number }; Returns: Json }
      purge_processed_events: {
        Args: { cutoff_ts?: string }
        Returns: undefined
      }
      purge_public_data: {
        Args: { _dry_run?: boolean; _keep?: string[] }
        Returns: Json
      }
      purge_webhook_logs: { Args: { cutoff_ts?: string }; Returns: number }
      purge_webhooks_failed_90d: { Args: never; Returns: undefined }
      recalc_order_totals: { Args: { p_order_id: string }; Returns: undefined }
      recalc_product_rating: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      record_recent_view: {
        Args: { _product_id: string; _weight?: number }
        Returns: undefined
      }
      recs_metrics: {
        Args: { p_days?: number }
        Returns: {
          add_to_cart: number
          atc_rate: number
          clicks: number
          conv_rate: number
          ctr: number
          gmv_cents: string
          impressions: number
          purchases: number
          revenue_per_click: number
          revenue_per_impression: number
          treatment: string
        }[]
      }
      refresh_analytics_mviews: { Args: never; Returns: undefined }
      refresh_analytics_mvs: { Args: never; Returns: undefined }
      refresh_co_viewed_mv: { Args: never; Returns: undefined }
      refresh_conversions_mviews: { Args: never; Returns: undefined }
      refresh_item_item_similarities: {
        Args: { p_window_days?: number }
        Returns: undefined
      }
      refresh_product_rating_stats:
        | { Args: { p_product_id: string }; Returns: undefined }
        | { Args: never; Returns: undefined }
      refresh_stripe_products_cache: { Args: never; Returns: undefined }
      refresh_user_interest_scores: { Args: never; Returns: undefined }
      refund_order_apply: {
        Args: {
          p_amount_cents: string
          p_currency: string
          p_order_id: string
          p_reason?: string
          p_refund_id: string
        }
        Returns: boolean
      }
      request_anon_id: { Args: never; Returns: string }
      search_products:
        | {
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
              price_cents: string | null
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
        | {
            Args: {
              _category?: string
              _limit?: number
              _offset?: number
              _q?: string
            }
            Returns: {
              category_slug: string
              currency: string
              description: string
              id: string
              main_image_url: string
              price: number
              rank: number
              rating: number
              short_desc: string
              slug: string
              title: string
            }[]
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
          price_cents: string | null
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
      sync_catalog_published: {
        Args: { p_refresh_mv?: boolean }
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
      promotion_action_kind:
        | "percentage_discount"
        | "fixed_amount_discount"
        | "buy_x_get_y"
        | "free_shipping"
        | "gift_product"
      promotion_condition_kind:
        | "product"
        | "category"
        | "collection"
        | "order_total"
        | "order_quantity"
        | "user_segment"
        | "utm"
        | "schedule"
        | "custom"
      promotion_status:
        | "draft"
        | "scheduled"
        | "active"
        | "expired"
        | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

export type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

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
      promotion_action_kind: [
        "percentage_discount",
        "fixed_amount_discount",
        "buy_x_get_y",
        "free_shipping",
        "gift_product",
      ],
      promotion_condition_kind: [
        "product",
        "category",
        "collection",
        "order_total",
        "order_quantity",
        "user_segment",
        "utm",
        "schedule",
        "custom",
      ],
      promotion_status: ["draft", "scheduled", "active", "expired", "archived"],
    },
  },
} as const

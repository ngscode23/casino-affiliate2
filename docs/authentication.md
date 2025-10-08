# Custom Authentication Overview

## Server API layout
- All auth endpoints live under `apps/web-next/app/api/auth/` and compile into the Next.js server bundle.
- Shared helpers (hashing, JWT utilities, cookie helpers) live in `packages/shared`.
- REST surface:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`

## Database schema
### `public.auth_roles`
- `role text primary key` — semantic role id (`admin`, `manager`, `user`).
- `description text` — optional human readable label.
- `created_at timestamptz` — audit of creation.

### `public.auth_users`
- `id uuid primary key` — stable user id used in JWTs and foreign keys.
- `email citext unique not null` — case-insensitive login; indexed.
- `password_hash text not null` — `bcrypt` hash.
- `role text not null default 'user'` — FK to `auth_roles`.
- `is_active boolean not null default true` — soft-disable support.
- `last_login_at timestamptz` — updated on successful login.
- `password_updated_at timestamptz` — for forced reset flows.
- `metadata jsonb default '{}'` — extra profile data (name, phone, etc.).
- `token_version smallint default 1` — bump to revoke outstanding tokens.
- `created_at timestamptz default now()`.
- `updated_at timestamptz default now()` — maintained by trigger.





### `public.refresh_tokens`
- `id uuid primary key` — internal id for chaining / revocation logs.
- `user_id uuid references auth_users(id)` — cascades on delete.
- `token_hash text unique not null` — SHA-256 hash of refresh token.
- `user_agent text` / `ip_address inet` — audit trail for session management.
- `metadata jsonb default '{}'` — arbitrary session metadata.
- `expires_at timestamptz not null` — TTL for refresh token.
- `revoked_at timestamptz` & `revoked_reason text` — revocation metadata.
- `created_at timestamptz default now()`.

### Support objects
- Trigger `trg_auth_users_set_updated_at` keeps `updated_at` fresh.
- Indices: `auth_users(email)`, `auth_users(role)`, `refresh_tokens(user_id)`, partial `refresh_tokens(user_id, expires_at)` for active tokens.
- RLS: tables restricted to the Supabase secret key (server-side handlers use the Service key).

## JWT / session model
- Access tokens: short-lived JWT (`sub`, `role`, `email`, `iat`, `exp`, `jti`).
- Refresh tokens: opaque 256-bit string, stored hashed.
- Revocation strategy: mark `refresh_tokens.revoked_at`; rotated refresh tokens replace prior entry.

## Middleware & roles
- Shared middleware validates JWT (signature, expiration, `jti` presence).
- Role guard checks `payload.role` against required roles.
- Future: add `auth_role_permissions` if we need fine-grained scopes.

## Environment
Supabase manages access/refresh tokens. No additional JWT secrets are required beyond `SUPABASE_SECRET_KEY`.

## Migration references
- Supabase migration: `supabase/migrations/20250916_210500_auth_schema.sql`.

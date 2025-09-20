import type { AuthUserRecord } from "./guard";

export interface PublicUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export function toPublicUser(user: AuthUserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.is_active,
    metadata: user.metadata,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at,
  };
}



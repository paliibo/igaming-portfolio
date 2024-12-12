import type { Role } from '@igaming/contracts';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  displayName: string;
}

export interface RequestMeta {
  ip: string | undefined;
}

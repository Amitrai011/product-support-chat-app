import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restrict a route to one or more roles, e.g. @Roles('agent'). */
export const Roles = (...roles: Array<'customer' | 'agent'>) =>
  SetMetadata(ROLES_KEY, roles);

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '@guild/shared-types';
import { hasPermission } from '@guild/shared-utils';
import { PERMISSIONS_KEY } from '../decorators/auth.decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user?.permissions) {
      throw new ForbiddenException('Missing permissions');
    }
    if (!hasPermission(user.permissions, required)) {
      throw new ForbiddenException(
        `Required permissions: ${required.join(', ')}`,
      );
    }
    return true;
  }
}

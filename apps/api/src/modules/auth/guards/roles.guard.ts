import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { Role } from "@isp/database";

const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 100,
  ISP_OWNER: 80,
  MANAGER: 60,
  NETWORK_ENGINEER: 50,
  ACCOUNTANT: 40,
  SUPPORT: 20,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const userLevel = ROLE_HIERARCHY[user.role as Role] ?? 0;
    const hasAccess = required.some((r) => userLevel >= ROLE_HIERARCHY[r]);

    if (!hasAccess) throw new ForbiddenException("Insufficient permissions");
    return true;
  }
}

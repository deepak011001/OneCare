import { Module } from '@nestjs/common';
import { AuthController, UsersController } from './presentation/auth.controller';
import { TenantsController } from '../tenancy/presentation/tenants.controller';
import { RbacController } from '../rbac/presentation/rbac.controller';

@Module({
  controllers: [AuthController, UsersController, TenantsController, RbacController],
})
export class IdentityModule {}

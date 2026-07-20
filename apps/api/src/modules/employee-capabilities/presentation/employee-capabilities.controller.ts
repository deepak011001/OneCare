import { Controller, Get } from '@nestjs/common';
import { PERMISSIONS } from '@onecare/auth';
import { RequirePermissions } from '../../../shared/presentation/auth.decorators';
import { EmployeeCapabilitiesService } from '../application/employee-capabilities.service';

@Controller('v1/employee/capabilities')
export class EmployeeCapabilitiesController {
  constructor(private readonly capabilities: EmployeeCapabilitiesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AI_CHAT)
  list() {
    return { data: this.capabilities.list() };
  }

  @Get('widgets')
  @RequirePermissions(PERMISSIONS.AI_CHAT)
  widgets() {
    return { data: this.capabilities.widgets() };
  }

  @Get('prompts')
  @RequirePermissions(PERMISSIONS.AI_CHAT)
  prompts() {
    return { data: this.capabilities.prompts() };
  }

  @Get('help')
  @RequirePermissions(PERMISSIONS.AI_CHAT)
  help() {
    return { data: this.capabilities.help() };
  }
}

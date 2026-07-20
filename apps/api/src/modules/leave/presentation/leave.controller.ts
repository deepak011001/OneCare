import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { PERMISSIONS } from '@onecare/auth';
import {
  RequirePermissions,
  type AuthenticatedRequest,
} from '../../../shared/presentation/auth.decorators';
import { LeaveService } from '../application/leave.service';

@Controller('v1/leave')
export class LeaveController {
  constructor(private readonly leave: LeaveService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  async dashboard(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.leave.getDashboard(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('balance')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  async balance(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.leave.getBalance(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('history')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  async history(@Req() req: AuthenticatedRequest, @Query('status') status?: string) {
    return {
      data: await this.leave.getHistory(req.requestContext!, {
        ...(status ? { status } : {}),
      }),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('types')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  async types(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.leave.getTypes(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('holidays')
  @RequirePermissions(PERMISSIONS.HOLIDAY_READ)
  async holidays(@Req() req: AuthenticatedRequest, @Query('month') month?: string) {
    return {
      data: await this.leave.getHolidays(req.requestContext!, month),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('requests/:id')
  @RequirePermissions(PERMISSIONS.LEAVE_READ)
  async request(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return {
      data: await this.leave.getRequest(req.requestContext!, id),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }
}

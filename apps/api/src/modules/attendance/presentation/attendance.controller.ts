import { Controller, Get, Query, Req } from '@nestjs/common';
import { PERMISSIONS } from '@onecare/auth';
import {
  RequirePermissions,
  type AuthenticatedRequest,
} from '../../../shared/presentation/auth.decorators';
import { AttendanceService } from '../application/attendance.service';

@Controller('v1/attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async dashboard(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.attendance.getDashboard(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('today')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async today(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.attendance.getToday(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('history')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async history(@Req() req: AuthenticatedRequest, @Query('status') status?: string) {
    return {
      data: await this.attendance.getHistory(req.requestContext!, status),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('summary')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async summary(@Req() req: AuthenticatedRequest, @Query('month') month?: string) {
    return {
      data: await this.attendance.getSummary(req.requestContext!, month),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('hours')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async hours(@Req() req: AuthenticatedRequest, @Query('month') month?: string) {
    return {
      data: await this.attendance.getHours(req.requestContext!, month),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('shift')
  @RequirePermissions(PERMISSIONS.ATTENDANCE_READ)
  async shift(@Req() req: AuthenticatedRequest) {
    return {
      data: await this.attendance.getShift(req.requestContext!),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }
}

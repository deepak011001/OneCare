import { Module } from '@nestjs/common';
import { LeaveService } from './application/leave.service';
import { LeaveController } from './presentation/leave.controller';

@Module({
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}

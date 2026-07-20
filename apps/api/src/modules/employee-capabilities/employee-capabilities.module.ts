import { Module } from '@nestjs/common';
import { EmployeeCapabilitiesService } from './application/employee-capabilities.service';
import { EmployeeCapabilitiesController } from './presentation/employee-capabilities.controller';

@Module({
  controllers: [EmployeeCapabilitiesController],
  providers: [EmployeeCapabilitiesService],
  exports: [EmployeeCapabilitiesService],
})
export class EmployeeCapabilitiesModule {}

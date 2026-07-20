import { Module } from '@nestjs/common';
import { McpGatewayController } from './mcp-gateway.controller';

@Module({
  controllers: [McpGatewayController],
})
export class AppModule {}

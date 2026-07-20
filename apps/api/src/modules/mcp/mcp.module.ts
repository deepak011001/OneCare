import { Global, Module } from '@nestjs/common';
import { createMcpPlatform } from '@onecare/mcp';
import { McpService } from './application/mcp.service';
import { MCP_TOKENS } from './mcp.tokens';
import { McpController } from './presentation/mcp.controller';

@Global()
@Module({
  controllers: [McpController],
  providers: [
    {
      provide: MCP_TOKENS.PLATFORM,
      useFactory: () => createMcpPlatform(),
    },
    {
      provide: MCP_TOKENS.GATEWAY,
      useFactory: async (platform: Awaited<ReturnType<typeof createMcpPlatform>>) =>
        platform.gateway,
      inject: [MCP_TOKENS.PLATFORM],
    },
    McpService,
  ],
  exports: [MCP_TOKENS.PLATFORM, MCP_TOKENS.GATEWAY, McpService],
})
export class McpModule {}

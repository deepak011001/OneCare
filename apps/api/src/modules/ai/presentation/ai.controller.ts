import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PERMISSIONS } from '@onecare/auth';
import { SseStreamController } from '@onecare/ai';
import { DomainError } from '@onecare/shared';
import {
  RequirePermissions,
  type AuthenticatedRequest,
} from '../../../shared/presentation/auth.decorators';
import { AiService } from '../application/ai.service';

@Controller('v1/ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('agents')
  @RequirePermissions(PERMISSIONS.AI_AGENTS_READ)
  listAgents(@Req() req: AuthenticatedRequest) {
    return {
      data: this.ai.listAgents(),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('tools')
  @RequirePermissions(PERMISSIONS.AI_TOOLS_READ)
  listTools(@Req() req: AuthenticatedRequest) {
    return {
      data: this.ai.listTools(),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('models')
  @RequirePermissions(PERMISSIONS.AI_MODELS_READ)
  listModels(@Req() req: AuthenticatedRequest) {
    return {
      data: this.ai.listModels(),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('conversations')
  @RequirePermissions(PERMISSIONS.AI_CHAT)
  async listConversations(@Req() req: AuthenticatedRequest) {
    const data = await this.ai.listConversations(req.requestContext!);
    return {
      data: data.map(summarizeConversation),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Get('conversations/:id')
  @RequirePermissions(PERMISSIONS.AI_CHAT)
  async getConversation(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const conversation = await this.ai.getConversation(req.requestContext!, id);
    return {
      data: serializeConversation(conversation),
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Post('plan')
  @RequirePermissions(PERMISSIONS.AI_PLAN)
  async plan(
    @Req() req: AuthenticatedRequest,
    @Body() body: { message?: string; conversationId?: string },
  ) {
    const message = body.message?.trim();
    if (!message) {
      throw new DomainError('VALIDATION', 'message is required');
    }
    const plan = await this.ai.plan(message, req.requestContext!, body.conversationId);
    return {
      data: plan,
      meta: { correlationId: req.correlationId, requestId: req.requestId },
    };
  }

  @Post('chat')
  @RequirePermissions(PERMISSIONS.AI_CHAT)
  async chat(
    @Req() req: AuthenticatedRequest & Request,
    @Res() res: Response,
    @Body()
    body: {
      message?: string;
      conversationId?: string;
      stream?: boolean;
      approvedToolConfirmations?: Record<string, string>;
    },
  ) {
    const message = body.message?.trim();
    if (!message) {
      throw new DomainError('VALIDATION', 'message is required');
    }

    const wantsStream =
      body.stream === true ||
      (typeof req.headers.accept === 'string' && req.headers.accept.includes('text/event-stream'));

    if (!wantsStream) {
      const result = await this.ai.chat({
        message,
        context: req.requestContext!,
        ...(body.conversationId ? { conversationId: body.conversationId } : {}),
        ...(body.approvedToolConfirmations
          ? { approvedToolConfirmations: body.approvedToolConfirmations }
          : {}),
      });
      res.status(200).json({
        data: {
          conversationId: result.conversation.id,
          assistantMessage: result.assistantMessage,
          plan: result.plan,
          observation: result.observation,
          conversation: serializeConversation(result.conversation),
        },
        meta: { correlationId: req.correlationId, requestId: req.requestId },
      });
      return;
    }

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sse = new SseStreamController();
    const abort = new AbortController();
    req.on('close', () => abort.abort('client_closed'));

    sse.onEvent((event) => {
      res.write(sse.formatSse(event));
    });

    try {
      await this.ai.chatStream(
        {
          message,
          context: req.requestContext!,
          ...(body.conversationId ? { conversationId: body.conversationId } : {}),
          ...(body.approvedToolConfirmations
            ? { approvedToolConfirmations: body.approvedToolConfirmations }
            : {}),
        },
        (event) => sse.emit({ type: event.type, data: event.data }),
        abort.signal,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'stream_failed';
      res.write(
        sse.formatSse({
          type: 'error',
          sequence: 0,
          data: { message: detail },
        }),
      );
    } finally {
      res.end();
    }
  }
}

function summarizeConversation(conversation: {
  id: unknown;
  title: string;
  updatedAt: Date;
  messages: readonly unknown[];
}) {
  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
    messageCount: conversation.messages.length,
  };
}

function serializeConversation(conversation: {
  id: unknown;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: readonly {
    id: unknown;
    role: string;
    content: string;
    createdAt: Date;
    metadata?: unknown;
  }[];
  streaming: unknown;
  metadata: unknown;
}) {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    streaming: conversation.streaming,
    metadata: conversation.metadata,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      ...(m.metadata ? { metadata: m.metadata } : {}),
    })),
  };
}

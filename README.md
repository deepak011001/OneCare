# OneCare Monorepo

**One Place. Every Answer.**

Enterprise Agentic AI Platform — multi-tenant, MCP-first, multi-agent.

## Repository layout

```
apps/           Deployable applications
packages/       Shared libraries (Clean Architecture building blocks)
docs/           Architecture source of truth
infra/          Cloud / IaC
docker/         Local compose & Dockerfiles
scripts/        Developer & CI scripts
tests/          Cross-cutting / e2e suites
.cursor/        Cursor rules (enforce docs)
.github/        CI/CD
```

## Prerequisites

- Node.js ≥ 22
- [pnpm](https://pnpm.io) ≥ 9 (`corepack enable` or `npm i -g pnpm`)
- Docker (PostgreSQL + Redis)

## Quick start

```bash
pnpm install
pnpm docker:up
pnpm typecheck
pnpm lint
```

## Applications

| App | Role |
|-----|------|
| `apps/web` | Employee / manager product UI (Next.js) |
| `apps/admin` | Tenant admin portal (Next.js) |
| `apps/api` | Core HTTP/WS API (NestJS) |
| `apps/mcp-gateway` | MCP client gateway — tool allowlists & secrets boundary |
| `apps/workers` | BullMQ + agent/ingestion workers |

## Packages

| Package | Role |
|---------|------|
| `@onecare/config` | Typed configuration (Zod) |
| `@onecare/shared` | Shared types, errors, branded IDs |
| `@onecare/auth` | AuthN/Z contracts & helpers |
| `@onecare/database` | Prisma schema & client |
| `@onecare/ai` | LLM providers, Master Orchestrator, agent registry, streaming |
| `@onecare/conversations` | Conversation / message model & store ports |
| `@onecare/prompts` | Versioned prompt templates & rendering |
| `@onecare/memory` | Conversation / user / session / agent memory ports |
| `@onecare/planner` | Execution planning (single / multi-agent) |
| `@onecare/tools` | Tool metadata registry + MCP executor |
| `@onecare/connector-sdk` | Enterprise connector contract |
| `@onecare/connectors` | Vendor connectors (Keka leave tools) |
| `@onecare/policies` | Tool execution policy engine |
| `@onecare/confirmations` | Human-in-the-loop confirmation store |
| `@onecare/mcp` | MCP gateway, registry, resilience |
| `@onecare/ess-capability` | Employee capability framework (registry, entities, validate/clarify) |
| `@onecare/ess-leave` | Employee leave capability (intents, dates, validation, clarify/confirm) |
| `@onecare/ess-attendance` | Employee attendance capability (clock in/out, history, regularization) |
| `@onecare/workflows` | Workflow engine contracts |
| `@onecare/integrations` | Integration adapter ports |
| `@onecare/telemetry` | Logging, AI metrics hooks & OpenTelemetry |
| `@onecare/ui` | Shared UI primitives |

## Documentation

Start at [`docs/README.md`](./docs/README.md). Cursor agents: see [`AGENTS.md`](./AGENTS.md) and [`docs/CURSOR_RULES.md`](./docs/CURSOR_RULES.md).

## Milestone

Current: **M4 Enterprise MCP Platform** — see [`docs/ROADMAP.md`](./docs/ROADMAP.md).

### API + database (M1)

```bash
cp .env.example .env
pnpm docker:up
pnpm db:deploy && pnpm db:seed
pnpm --filter @onecare/api dev
```

### Local web shell (M2+)

```bash
pnpm --filter @onecare/web dev
# open http://localhost:3000
# sign in with a seeded development user (API must be running on :3001)
# open /app/ai for mock-streamed chat
```

Set `NEXT_PUBLIC_API_BASE_URL` and optionally `NEXT_PUBLIC_AUTH_MODE=entra` in `.env`. Re-seed after pull to pick up `ai.*` permissions.
## License

Proprietary — All rights reserved.

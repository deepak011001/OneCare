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
| `@onecare/ai` | Agent contracts & orchestration ports |
| `@onecare/mcp` | MCP protocol types & gateway client |
| `@onecare/workflows` | Workflow engine contracts |
| `@onecare/integrations` | Integration adapter ports |
| `@onecare/telemetry` | Logging & OpenTelemetry |
| `@onecare/ui` | Shared UI primitives |

## Documentation

Start at [`docs/README.md`](./docs/README.md). Cursor agents: see [`AGENTS.md`](./AGENTS.md) and [`docs/CURSOR_RULES.md`](./docs/CURSOR_RULES.md).

## Milestone

Current: **M1 Identity & Security** — see [`docs/ROADMAP.md`](./docs/ROADMAP.md).

### Local auth smoke (development mode)

```bash
cp .env.example .env   # AUTH_MODE=development
pnpm docker:up
pnpm db:deploy && pnpm db:seed
pnpm --filter @onecare/api dev

# Login as seeded employee
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"employee@demo.onecare.local\"}"
```

## License

Proprietary — All rights reserved.

# Local Development

```bash
cp .env.example .env
pnpm install
pnpm docker:up
pnpm typecheck
pnpm --filter @onecare/api dev
pnpm --filter @onecare/web dev
```

Ports: web `3000`, admin `3002`, api `3001`, mcp-gateway `3003`.

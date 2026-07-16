# OneCare — Coding Guidelines

**Status:** Living Document — Source of Truth  
**Stack:** TypeScript (strict) · NestJS · Next.js · Prisma · React

---

## 1. Non-Negotiables

1. Strict TypeScript — no implicit `any`  
2. SOLID, Clean Architecture, DDD boundaries  
3. Feature modules — no cross-feature table diving  
4. No secrets in code or tests  
5. No business logic in controllers / React components  
6. No duplicated abstractions — extract shared packages carefully  
7. Every public function has clear inputs/outputs and error behavior  
8. Prefer composition over inheritance  

---

## 2. TypeScript

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true
}
```

- Prefer `unknown` over `any`; narrow explicitly  
- Use `satisfies` for config objects  
- Branded types for `TenantId`, `UserId` where helpful  
- Exhaustive `switch` with `never` checks  

---

## 3. Backend (NestJS) Structure

```
modules/<feature>/
  presentation/   # controllers, dto, presenters
  application/    # use-cases, commands, queries
  domain/         # entities, value objects, ports, domain errors
  infrastructure/ # prisma repos, mcp adapters, mappers
  <feature>.module.ts
```

### Dependency Rule

`presentation → application → domain ← infrastructure`

Infrastructure implements domain ports; wired via DI.

### Use Case Pattern

```typescript
export class ApplyLeaveUseCase {
  constructor(
    private readonly leaveTools: LeaveToolsPort,
    private readonly audit: AuditPort,
    private readonly uow: UnitOfWorkPort,
  ) {}

  async execute(input: ApplyLeaveCommand, ctx: RequestContext): Promise<ApplyLeaveResult> {
    // validate domain rules, authorize, invoke port, audit
  }
}
```

---

## 4. Frontend (Next.js)

- App Router  
- Server Components by default; Client Components for interactivity  
- Data fetching via React Query for client state from API  
- Zustand for UI/session ephemeral state — **not** server cache  
- Feature folders under `app/(product)/` and `features/<name>/`  
- Shadcn components wrapped in design-system primitives — don’t fork copies  

### Component Rules

- Presentational vs container clarity  
- No raw `fetch` scattered — use API client module  
- Loading / error / empty / skeleton states required for async views  
- Accessibility: labels, focus traps, keyboard  

---

## 5. Naming

| Kind | Convention |
|------|------------|
| Files | `apply-leave.use-case.ts`, `leave.controller.ts` |
| Classes | `PascalCase` |
| Functions / vars | `camelCase` |
| Constants | `UPPER_SNAKE` only for true constants |
| DB tables | `snake_case` plural |
| React components | `PascalCase.tsx` |

Names express **intent**, not tech (`LeaveBalanceRepository` not `PrismaLeave`).

---

## 6. Error Handling

- Domain errors extend a base `DomainError` with `code`  
- Map to HTTP in a single exception filter  
- Log with correlation id + tenant id + user id  
- Never swallow errors empty-catch  

---

## 7. Testing

| Layer | What |
|-------|------|
| Domain | Pure unit tests |
| Application | Unit with mocked ports |
| Infrastructure | Contract / integration tests |
| API | e2e critical paths |
| Agents | Golden dialogues + tool mock |

Coverage is not a vanity metric — protect money/PII/auth/leave paths first.

---

## 8. Linting & Formatting

- ESLint + Prettier mandatory in CI  
- `eslint-disable` requires comment justification  
- Import order enforced  
- No unused exports in app code  

---

## 9. Async & Performance

- Avoid N+1 — batch in repositories  
- Use BullMQ for > few hundred ms third-party work when request path allows  
- Stream LLM tokens; don’t buffer entire completions when UI expects stream  
- Careful with `useMemo`/`useCallback` — follow React Compiler guidance; don’t sprinkle preemptively  

---

## 10. Config

- Zod-validate env at boot  
- Feature flags for incomplete features  
- No magic numbers — named constants or config  

---

## 11. Git & Reviews

- Small PRs aligned to milestones  
- ADRs for architectural changes  
- Do not commit generated secrets, `.env`, credentials  

---

## 12. Documentation Expectations

When adding a module:

- Update relevant `docs/*` if behavior/architecture changes  
- OpenAPI annotations for new endpoints  
- README section only if runbooks change  

---

## 13. Anti-Patterns

- God services (`EnterpriseService`)  
- Shared `utils.ts` dumping ground — name by domain  
- Copy-paste agents with slight prompt diffs — config instead  
- Prisma client in React Server Components talking past Application layer for writes  

---

## Related

`ARCHITECTURE.md` · `API_STANDARDS.md` · `SECURITY.md` · `UI_GUIDELINES.md` · `CURSOR_RULES.md`

# OneCare — UI Guidelines

**Status:** Living Document — Source of Truth  
**Stack:** Next.js · React · TailwindCSS · Shadcn UI · React Query · Zustand

---

## 1. Product UI Principles

1. **Minimal, professional, enterprise** — calm UI; no gimmicks  
2. **Chat is a work surface** — outcomes, plans, confirmations; not novelty chat bubbles only  
3. **One job per view/section**  
4. **Accessible** — WCAG 2.2 AA target  
5. **Responsive** — desktop-first enterprise, solid mobile  
6. **Dark mode** supported via design tokens  
7. **States matter** — loading, empty, error, skeleton for every async surface  

---

## 2. Brand

- **Name:** OneCare  
- **Tagline:** One Place. Every Answer.  
- On marketing/landing surfaces, brand is a **hero-level** signal — not only nav text  
- Avoid generic “AI purple gradient” clichés; define OneCare tokens deliberately (see §4)  

---

## 3. Information Architecture

| Area | Routes (illustrative) |
|------|------------------------|
| Landing | `/` |
| Auth | `/login` |
| App shell | `/app` |
| Chat | `/app/chat`, `/app/chat/[id]` |
| Employee | `/app/employee/*` |
| Manager | `/app/manager/*` |
| Knowledge | `/app/knowledge` |
| Analytics | `/app/analytics` |
| Admin | `/app/admin/*` |
| Settings / Profile | `/app/settings` |
| Notifications | `/app/notifications` |

Nav visibility is **role-aware**.

---

## 4. Design Tokens

Define CSS variables (example direction — refine in brand workshop):

```css
:root {
  --oc-bg: …;
  --oc-fg: …;
  --oc-muted: …;
  --oc-border: …;
  --oc-accent: …;      /* primary CTA — not default indigo/purple cliché */
  --oc-danger: …;
  --oc-success: …;
  --oc-radius: …;
  --oc-font-sans: …;   /* distinctive, licensed enterprise font */
  --oc-font-display: …;
}
```

- Prefer purposeful fonts — avoid defaulting to Inter/Roboto/Arial as the brand voice  
- Atmosphere: subtle gradients or textures OK on marketing; app shell stays quieter for productivity  
- Do **not** rely on flat single-color marketing pages with no depth  

When extending Shadcn, map tokens → component variants; don’t hardcode hex in features.

---

## 5. Landing / Marketing

Follow enterprise landing discipline:

- First viewport: brand, one headline, one supporting sentence, CTA group, one dominant visual  
- Full-bleed hero visual preferred on promotional pages  
- No card grids in the hero  
- No floating badges/stickers on hero media  
- Avoid cluttered stat strips in the first viewport  

---

## App shell (M2)

- Routes live under `/app/*` with collapsible sidebar + top bar.
- Nav items are filtered by RBAC permissions returned from `/v1/auth/me`.
- Theme: light / dark / system via `next-themes` (persisted).
- Command palette (`Ctrl/Cmd+K`) is a UI placeholder for future AI search.
- Cross-origin SPA auth uses Bearer tokens from login/refresh responses (not cross-site cookies).

---

## 7. Chat Interface UX

**Required elements:**

- Message list with clear user/assistant roles  
- Streaming tokens with reduced-motion respect  
- **Plan** panel or inline steps for multi-tool runs  
- **Confirmation** cards for medium+ risk tools (primary/secondary actions)  
- Citations for knowledge (title + link)  
- Tool status chips (started/succeeded/failed) — sparse, not noisy  
- Composer with attach (policy-gated), send, stop generation  

**Avoid:**

- Fake “thinking” fluff without real plan state  
- Auto-running high-risk tools  
- Over-animated bubbles  

---

## 8. Component Reuse

- Build on Shadcn primitives  
- Shared: `PageHeader`, `EmptyState`, `ErrorState`, `DataTable`, `ConfirmDialog`, `PermissionGate`  
- Cards only when they contain interaction or dense structured content — not decorative wrappers  
- No duplicate button styles across features  

---

## 9. Feedback & Motion

- Toasts for transient success/failure  
- Inline errors for forms  
- Motion: 2–3 intentional patterns (e.g., sidebar collapse, chat confirm entrance, streaming caret) — not noise  
- Honor `prefers-reduced-motion`  

---

## 10. Admin UI

- Dense but scannable tables  
- Destructive actions require confirm + typed name for irreversible ops  
- Show health of MCP servers visually  
- Prompt editor with version diff  

---

## 11. Accessibility Checklist

- Focus visible  
- Contrast AA  
- Icons have text alternatives  
- Dialogs trap focus  
- Live regions for streaming status (polite)  

---

## 12. Anti-Patterns

- Dashboard-looking landing pages  
- Purple-on-white AI cliché theme as default brand  
- Emoji as primary navigation affordances  
- Multiple competing CTAs in one section  

---

## Related

`PRD.md` · `CODING_GUIDELINES.md` · `SECURITY.md`

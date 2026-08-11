# AGENTS.md — Priority Compass

Project conventions for AI coding agents and human contributors working in this
repository. Read this before making changes.

## What this is

Priority Compass is a personal productivity OS — a Next.js 16 (App Router) +
TypeScript + Supabase app. The core loop: morning check-in → focused execution
(Focus Timer) → evening reflection, anchored by a life vision (North Star),
core values, and year-level goals (WarMap).

## Commands

```bash
pnpm dev        # start dev server (pnpm 9.15.0 — pinned via packageManager)
pnpm test       # run vitest suite (unit + component)
pnpm lint       # ESLint (fails on errors AND warnings — pre-commit hook)
pnpm typecheck  # npx tsc --noEmit
pnpm build      # production build
```

- **Use pnpm, not npm.** The repo pins `packageManager: pnpm@9.15.0`; CI runs
  pnpm 9 with a `--frozen-lockfile` install. Never regenerate the lockfile with
  a newer pnpm — it changes the format and breaks CI.
- **Never use bare `next build`/`next dev` in CI contexts** — use `pnpm build`.
- If `pnpm install` complains about `onlyBuiltDependencies`, add to the `pnpm`
  field in `package.json` (pnpm 9 home), not a `pnpm-workspace.yaml`.

## Code quality gates (must all pass before commit)

1. `pnpm lint` — zero errors AND zero warnings (husky pre-commit enforces this)
2. `pnpm typecheck` — `tsc --noEmit` clean
3. `pnpm test` — all tests green
4. `pnpm build` — compiles

Common lint issues and their fixes are listed in the "Common ESLint fixes"
section below.

## Project structure

```
app/          # Next.js App Router pages (app/layout.tsx holds PWA metadata)
components/   # Reusable UI; components/ui/ = shadcn; components/onboarding/, etc.
lib/          # Data/domain logic (supabase queries, scheduling, analytics, focus)
hooks/        # Custom React hooks (useAuth, useSpotify, useOnboarding, useNotifications)
types/        # TS type definitions (index.ts, database.ts, notifications.ts)
supabase/     # Migrations + edge functions (send-notifications)
docs/         # development, oauth-setup, notifications, RECURRING_TASKS
tests/        # vitest tests mirroring lib/ and components/ structure
public/       # Static assets incl. PWA manifest.json, sw.js, PNG icons
```

## Key architecture facts

- **Auth**: `lib/auth-context.ts` provides `useAuth()` (Supabase auth). Pages use
  `<AuthGuard>` to gate protected routes.
- **Supabase access**: always via `lib/supabase` client. Data logic lives in
  `lib/*.ts` (e.g. `lib/tasks.ts`, `lib/focus.ts`, `lib/analytics.ts`) — UI
  components call these, they don't query Supabase directly.
- **Types**: the `Task` interface in `types/index.ts` includes recurrence fields
  (`recurrence_type`, `recurrence_interval`, `recurrence_end_date`,
  `recurrence_weekdays`, `parent_task_id`, `skipped_dates`,
  `is_recurrence_template`). **Any new code creating a `Task` must provide these.**
- **Onboarding**: dual-path — a standalone `/onboarding` page and an
  `OnboardingTrigger` modal on the dashboard. Both use
  `DEFAULT_ONBOARDING_STEPS` from `components/onboarding/OnboardingFlow.tsx`.
  Steps can be interactive: `north-star`, `first-task` (creates a real task),
  and `start-focus` (deep-links to `/focus?taskId=`) have custom components.
- **Focus page** (`app/focus/page.tsx`): reads a `taskId` search param to
  pre-select a task; uses `useSearchParams`, so it MUST stay wrapped in a
  Suspense boundary for static prerendering.
- **PWA**: `public/manifest.json` (PNG icons), `public/sw.js` (push + offline
  caching), `app/layout.tsx` (iOS + theme-color metadata). Push subscription
  flow lives in `lib/notifications.ts` / `hooks/useNotifications.ts`.

## Testing conventions

- Tests live in `tests/` mirroring the source structure (`tests/lib/`,
  `tests/components/`).
- **Lib tests mock Supabase** using `vi.mock("@/lib/supabase")` with a
  thenable-chain builder (`makeChain`). See `tests/lib/tasks.test.ts` or
  `tests/lib/analytics.test.ts` for the pattern.
- **Component tests** use `@testing-library/react` + `userEvent`, mocking any
  hooks/libs the component depends on (`vi.mock`).
- Prefer local-time `Date` construction in tests over hardcoded UTC strings to
  avoid timezone flakiness (see `tests/lib/analytics.test.ts`).

## Deployment

- Production: Vercel at `https://prioritycompass.vercel.app` (auto-deploys from
  `main`). Use `vercel --prod --yes` to deploy manually.
- Database: hosted Supabase (production) + local Supabase (dev).
- GitHub remote: `https://github.com/theamazingmrb/priority-compass`

## Things that are intentional

- The internal Vercel project and deployment slugs still derive from `pulse`
  (e.g. `pulse-lnp8jgkh1-...`), even though the public alias and GitHub repo are
  now `priority-compass`. Don't churn the internal deployment identifiers.
- Some build artifacts (`next-env.d.ts`, `tsconfig.tsbuildinfo`) regenerate on
  build — revert them before committing; don't include in PRs.
- The app is dark-theme first (`defaultTheme="dark"`).

## Common ESLint fixes

- **Hook deps** (`useEffect has a missing dependency`) — wrap the function in
  `useCallback` with the right deps, or add the dep to the array. Don't just
  silence it.
- **Unused imports/vars** — remove them.
- **`<img>` → `next/image`** — use `Image` from `next/image` for LCP.
- **Empty TS interfaces** — use `type Alias = Base` instead of an empty
  `interface extends Base {}`.
- **Unescaped apostrophes** — in JSX, use `&apos;` (e.g. `I&apos;ll`) or the
  lint fails. This one is a hard error, not a warning.

## Development workflow

1. Branch off `main` (`git checkout -b feature/your-feature-name`).
2. Make changes following the conventions above; write tests for new logic.
3. Run quality gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
4. Commit — the husky pre-commit hook runs ESLint and blocks on any error OR
   warning.
5. Push & open a PR; CI runs the full checks on `main`/PRs.

## Contributing checklist

- [ ] ESLint passes (no errors or warnings)
- [ ] TypeScript compiles without errors
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Documentation updated
- [ ] Performance considerations addressed
- [ ] Security implications considered


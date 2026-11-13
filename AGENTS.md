# Repository Guidelines

## Project Structure & Module Organization

This pnpm/Turborepo workspace has a Next.js app in `apps/web` and the Phaser runtime in `packages/game`. Keep React integration in `apps/web/components`; put game creation and scene code in `packages/game/src`. The other `packages/*` directories and root `tests/` are scaffolds. Unit tests currently live in `packages/game/tests`; browser tests and their isolated Vite fixture live in `apps/web/tests/e2e` and `apps/web/tests/fixtures`. Put web static files in `apps/web/public`. Product, architecture, and asset guidance is in `docs/`; execution reports belong in `docs/reports`.

## Build, Test, and Development Commands

Use the pinned package manager: `pnpm install`. Run `pnpm dev` for the local Next.js app, `pnpm typecheck` for both workspaces, and `pnpm build` for the production build. After a successful build, `pnpm start` serves it locally. Run `pnpm --filter @mfd/game test` for Vitest unit tests, `pnpm --filter @mfd/web test:e2e` for Chromium fixture tests, and `pnpm --filter @mfd/web test:production` for the built homepage. The root `lint` script exists, but package lint scripts and a lint configuration have not been established; do not report lint as passing without running a configured check.

## Coding Style & Naming Conventions

Follow nearby TypeScript, TSX, and CommonJS files: two-space indentation, semicolons, and single-quoted imports. Use kebab-case filenames such as `phaser-host.tsx`, PascalCase React components and Phaser Scenes, and camelCase functions. Keep browser-only Phaser initialization inside the Client Host's effect; keep runtime internals out of the web package's public API. Do not turn Draft, Proposed, or TBD game-design values into implementation defaults.

## Testing Guidelines

Name unit files `*.test.ts` and browser files `*.spec.cjs`. Add focused tests for behavior changed, including lifecycle failure paths. Browser tests must import the production Host through the fixture; a canvas-count assertion alone does not prove resource cleanup. No coverage threshold or approved screenshot baseline is defined. Save candidate screenshots for Owner review before treating visual comparisons as passing.

## Commits & Pull Requests

Recent commits commonly use `feat:` or `docs:` followed by a short action; one commit uses a plain imperative subject. Keep changes scoped and state the behavior in the subject. A pull request should describe the change, list commands and results, link an issue when one exists, and include a screenshot for visible UI changes. Preserve existing uncommitted work; do not commit or push unless the task authorizes it.

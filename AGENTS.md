# AGENTS.md

## Repo Shape

- Bun workspace monorepo with app workspaces in `apps/` and shared packages in `packages/`.
- Current workspaces are `apps/server`, `apps/cli`, and `packages/shared`.
- Root workspace config is in `package.json`; Bun uses a hoisted linker via `bunfig.toml`.
- Shared TypeScript defaults live in `tsconfig.base.json`. Package-level `tsconfig.json` files only hold runtime-specific overrides.

## Commands

- Install dependencies from the repo root with `bun install`.
- Verified repo-level check command: `bun run check`.
- Run the Hono server from the root with `bun run dev:server`.
- Run the OpenTUI app from the root with `bun run dev:cli`.

## Package Entry Points

- Server entrypoint: `apps/server/src/index.ts`.
- CLI entrypoint: `apps/cli/src/index.tsx`.
- Shared package entrypoint: `packages/shared/src/index.ts`.
- Server dev script uses `bun --watch run src/index.ts`.
- CLI dev script uses `bun --watch run src/index.tsx`.

## Important Gotcha

- Do not switch `dev:cli` to Bun workspace filtering. The root script intentionally uses `bun run --cwd apps/cli dev` because `bun run --filter @puhutko/cli dev` can print wrapper/status output that leaks into the fullscreen OpenTUI screen.
- `dev:server` is safe to keep workspace-native with `bun run --filter @puhutko/server dev`.

## Verification

- There is no lint or test setup yet. The only verified automated check is TypeScript typechecking via `bun run check`.
- For focused checks, run `bun run check` inside `apps/server/`, `apps/cli/`, or `packages/shared/`.

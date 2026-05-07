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
- In OpenTUI, raising `zIndex` on an absolutely positioned child may not be enough to overlay later sibling content. If a popup still renders under surrounding UI, raise the `zIndex` on the popup's outer wrapper too so the whole component stacks above sibling layout items.
- In OpenTUI lists, do not identify rendered items by array index when items can be inserted, removed, or reordered. Use a stable item identity for `key`, element `id`, and scroll targets, or the UI can show stale rows even when navigation state and data are correct.
- In `bun:sqlite`, SQL placeholders may use names like `$wordValue`, but object bindings passed to `.get()`, `.all()`, or `.run()` should use keys without the prefix, like `{ wordValue: value }` rather than `{ $wordValue: value }`.

## Verification

- There is no lint or test setup yet. The only verified automated check is TypeScript typechecking via `bun run check`.
- For focused checks, run `bun run check` inside `apps/server/`, `apps/cli/`, or `packages/shared/`.

## Code Style

- Prefer `import React from "react"` over named React imports.
- Prefer `React.useState`, `React.useEffect`, and other `React.*` hook calls instead of importing hooks directly.
- Prefer `React.ReactNode` for React types instead of importing `ReactNode` separately.

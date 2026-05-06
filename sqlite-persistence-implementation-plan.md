# SQLite Persistence Implementation Plan

## Goal

Persist these features to SQLite using Bun's `bun:sqlite` support:

- word tag assignments
- recent word searches
- word examples

The implementation should keep persistence reusable across platforms instead of owning it inside `apps/cli`.

The plan should also keep syncable data ready for a future cloud-sync feature without forcing account support into the first local-only release.

## Storage Location

Use a single SQLite database file stored in the user's home directory.

- macOS: `~/.puhutko-lite/puhutko-lite.sqlite`
- Windows: `%USERPROFILE%\\.puhutko-lite\\puhutko-lite.sqlite`

Resolved shape:

- base directory: user home + `.puhutko-lite`
- database file: `puhutko-lite.sqlite`

This path policy should live in shared SQLite bootstrap code so apps do not reimplement it.

## Architecture

Move persistence out of `apps/cli` and into reusable packages.

### Existing Packages

Add SQLite adapters to these domain packages:

1. `@puhutko/word-tags`
2. `@puhutko/word-example`

### New Packages

Add:

1. `@puhutko/recent-searches`
2. `@puhutko/sqlite` or `@puhutko/storage-sqlite`

Recommended names:

1. `@puhutko/recent-searches`
2. `@puhutko/sqlite`

## Sync Readiness

Future cloud sync is expected for:

- tags
- word tag assignments
- word examples

Recent searches are explicitly device-local and should not sync.

Current product assumptions:

- one user account per device
- user account support does not exist yet
- when account support is added later, the app should ask whether existing local syncable data should be attached to the signed-in account

Because of that, syncable tables should be designed now with:

- nullable `owner_user_id`
- globally unique IDs for user-created entities
- enough timestamps to resolve future sync updates
- soft deletes where true deletion semantics matter

## Package Responsibilities

### `@puhutko/sqlite`

Shared SQLite bootstrap package.

Responsibilities:

- resolve the database path from the user home directory
- ensure the parent directory exists
- open the SQLite database with `bun:sqlite`
- apply shared pragmas
- export a small helper for package-level schema initialization
- later own app-level metadata such as `device_id` and sync bootstrap state

Suggested API:

- `resolveDatabasePath()`
- `openDatabase()`

Recommended startup pragmas:

- `PRAGMA foreign_keys = ON`
- `PRAGMA journal_mode = WAL`
- `PRAGMA synchronous = NORMAL`

### `@puhutko/word-tags`

Keep the current repository and service contracts. Add a SQLite repository adapter.

Add:

- `src/adapters/sqlite.ts`

Keep:

- `WordTagsRepository`
- `createWordTagsService()`

Export the new adapter from `src/index.ts`.

### `@puhutko/word-example`

Keep the current repository and service contracts. Add a SQLite repository adapter.

Add:

- `src/adapters/sqlite.ts`

Keep the current single-example-per-word model.

Export the new adapter from `src/index.ts`.

### `@puhutko/recent-searches`

Create a new reusable domain package for persisted recent searches.

Suggested files:

- `src/types.ts`
- `src/repository.ts`
- `src/service.ts`
- `src/adapters/memory.ts`
- `src/adapters/sqlite.ts`
- `src/index.ts`

This package should not depend on the CLI screen implementation.

This package should remain device-local only and must not take on cloud-sync responsibilities.

## Schema

Use one shared SQLite database. Each package should create only the tables it owns.

### `@puhutko/word-tags`

```sql
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS word_tag_links (
  owner_user_id TEXT,
  word_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  PRIMARY KEY (word_id, tag_id),
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS tags_normalized_name_active_idx
  ON tags (normalized_name)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS word_tag_links_tag_id_idx
  ON word_tag_links (tag_id);

CREATE INDEX IF NOT EXISTS word_tag_links_owner_user_id_idx
  ON word_tag_links (owner_user_id);
```

Rules:

- `tags.id` must be globally unique. Use `UUID` or `ULID`, not local counters.
- `deleted_at` is required for sync-safe tag and assignment deletion.
- `owner_user_id` stays `NULL` until account support exists.

### `@puhutko/word-example`

```sql
CREATE TABLE IF NOT EXISTS word_examples (
  owner_user_id TEXT,
  word_id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS word_examples_owner_user_id_idx
  ON word_examples (owner_user_id);
```

Rules:

- removing an example should keep the row and write `text = ''`
- `word_examples` does not need `deleted_at` under the current product rule
- `owner_user_id` stays `NULL` until account support exists

### `@puhutko/recent-searches`

```sql
CREATE TABLE IF NOT EXISTS recent_searches (
  word_value TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  url TEXT,
  last_searched_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS recent_searches_last_searched_at_idx
  ON recent_searches (last_searched_at DESC);
```

Rules:

- `recent_searches` is device-local only
- do not add `owner_user_id`
- do not include this table in future cloud sync

## Schema Ownership

Each package should initialize its own tables instead of relying on one app-owned migration file.

This means:

- `@puhutko/word-tags` initializes `tags` and `word_tag_links`
- `@puhutko/word-example` initializes `word_examples`
- `@puhutko/recent-searches` initializes `recent_searches`

Benefits:

- packages remain portable
- schema responsibility stays close to the domain code
- future apps can compose only the persistence modules they need
- syncable and device-local concerns stay clearly separated

## Recent Searches Package API

Model recent searches independently from the CLI component, but keep it compatible with current search items.

Suggested type:

- `value`
- `label`
- `description?`
- `url?`
- `lastSearchedAt`

This package should remain independent from future user-account or sync flows.

Suggested service API:

- `listRecentSearches(limit?: number)`
- `saveRecentSearch(item)`
- `clearRecentSearches()`

Optional later:

- `removeRecentSearch(value)`

## Implementation Steps

1. Create `@puhutko/sqlite`.
2. Implement home-directory database path resolution for macOS and Windows.
3. Add directory creation and database opening with shared pragmas.
4. Add future-sync-ready schema fields to syncable tables:
   - nullable `owner_user_id`
   - `updated_at` on all syncable records
   - `deleted_at` on tags and tag links
5. Add SQLite adapter to `@puhutko/word-tags`.
6. Generate globally unique tag IDs with `UUID` or `ULID` instead of local counters.
7. Add SQLite adapter to `@puhutko/word-example`.
8. Preserve empty-text example removal by keeping the row and updating `text = ""`.
9. Create `@puhutko/recent-searches` with memory and SQLite adapters.
10. Wire `apps/cli` to use the new packages instead of in-memory persistence.
11. Load recent searches from the persistence layer on screen mount.
12. Save recent searches when a word is selected from autocomplete.
13. Keep existing UI behavior for tag assignment, example editing, and recent search selection.
14. Run `bun run check`.
15. Manually verify persistence across CLI restarts.

## CLI Wiring Changes

`apps/cli` should only compose services and providers.

### `WordTagsProvider`

Replace the in-memory repository with the SQLite adapter while keeping the existing `changeToken` refresh behavior.

### `WordExampleProvider`

Replace the in-memory repository with the SQLite adapter while keeping the existing `changeToken` refresh behavior.

### `WordSearch`

Replace component-owned recent-search persistence with the new `@puhutko/recent-searches` package.

Behavior to preserve:

- de-duplicate by search value
- keep newest searches first
- respect `RECENT_SEARCH_LIMIT`
- keep current keyboard navigation behavior

Behavior to clarify:

- recent searches stay local to the device even after account and sync support exist

## SQL Behavior Notes

### Word Tags

- use prepared statements
- use soft-delete-aware logic for tag rows and tag-link rows
- preserve current repository semantics
- generate globally unique tag IDs inside the adapter
- keep `owner_user_id` nullable until auth exists

### Word Examples

- use `INSERT ... ON CONFLICT(word_id) DO UPDATE`
- preserve the current one-text-per-word behavior
- keep rows when the example is removed and store an empty string instead
- keep `owner_user_id` nullable until auth exists

### Recent Searches

- upsert by `word_value`
- update `last_searched_at` on every save
- list ordered by `last_searched_at DESC`
- apply the requested limit when reading
- do not add sync or user-ownership fields

## Future Account Claim Flow

When sign-in is added later:

1. detect syncable rows with `owner_user_id IS NULL`
2. ask the user whether local data on this device should be attached to the signed-in account
3. if confirmed, backfill `owner_user_id` on syncable rows
4. upload claimed rows during the first sync

Recent searches should stay out of this flow.

## Future Metadata

When sync work starts, add app-level local metadata for:

- `device_id`
- current signed-in user
- sync bootstrap state

This does not need to block the first local-only SQLite release.

## Verification

Run:

- `bun run check`

Manual smoke test:

1. start the CLI
2. search for a word
3. restart the CLI and confirm recent searches persist
4. assign tags to a word
5. restart the CLI and confirm tag assignments persist
6. save a word example
7. restart the CLI and confirm the example persists

## Notes

- Do not keep SQLite-only persistence code inside `apps/cli` except composition and service wiring.
- Keep the current `wordId` usage for tags and examples.
- Keep word examples as a single text block per word unless the product model changes later.
- Use nullable `owner_user_id` now so local-only data can be claimed by a user later.
- Keep recent searches device-local even after syncable data is introduced.
- Avoid adding a heavy migration system for this first pass; package-local `CREATE TABLE IF NOT EXISTS` initialization is enough.

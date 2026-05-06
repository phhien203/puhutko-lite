import type { RecentSearch, RecentSearchInput } from "./types"

export type RecentSearchesRepository = {
  listRecentSearches(limit?: number): Promise<RecentSearch[]>
  saveRecentSearch(item: RecentSearchInput): Promise<RecentSearch>
  clearRecentSearches(): Promise<void>
}

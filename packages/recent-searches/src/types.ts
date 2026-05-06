import type { WiktionarySearchItem } from "@puhutko/shared"

export type RecentSearch = WiktionarySearchItem & {
  lastSearchedAt: string
}

export type RecentSearchInput = WiktionarySearchItem

export type RecentSearchesService = {
  listRecentSearches(limit?: number): Promise<RecentSearch[]>
  saveRecentSearch(item: RecentSearchInput): Promise<RecentSearch>
  clearRecentSearches(): Promise<void>
}

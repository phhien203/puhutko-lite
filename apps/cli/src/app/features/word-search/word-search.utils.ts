import type { WiktionarySearchItem } from "@puhutko/shared"
import { RECENT_SEARCH_LIMIT } from "./word-search.constants"
import type { FocusTarget } from "./word-search.types"

export function addRecentSearch(
  items: WiktionarySearchItem[],
  item: WiktionarySearchItem,
): WiktionarySearchItem[] {
  return [item, ...items.filter((existingItem) => existingItem.value !== item.value)].slice(
    0,
    RECENT_SEARCH_LIMIT,
  )
}

export function getNextFocusTarget(current: FocusTarget, backwards: boolean): FocusTarget {
  const order: FocusTarget[] = ["autocomplete", "recent", "details"]
  const currentIndex = order.indexOf(current)
  const step = backwards ? -1 : 1
  const nextIndex = (currentIndex + step + order.length) % order.length

  return order[nextIndex] ?? "autocomplete"
}

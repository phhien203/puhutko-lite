import type { FocusTarget } from "./word-search.types"

export function getNextFocusTarget(current: FocusTarget, backwards: boolean): FocusTarget {
  const order: FocusTarget[] = ["autocomplete", "recent", "details"]
  const currentIndex = order.indexOf(current)
  const step = backwards ? -1 : 1
  const nextIndex = (currentIndex + step + order.length) % order.length

  return order[nextIndex] ?? "autocomplete"
}

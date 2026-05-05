import { normalizeTagName } from "./normalization"
import type { Tag } from "./types"

export function getCircularIndex(currentIndex: number, delta: 1 | -1, length: number): number {
  if (length <= 0) {
    return 0
  }

  return (currentIndex + delta + length) % length
}

export function findNextJumpMatch(tags: Tag[], currentIndex: number, typedChar: string): number {
  if (tags.length === 0) {
    return currentIndex
  }

  const normalizedTypedChar = normalizeTagName(typedChar).normalizedName

  if (normalizedTypedChar.length === 0) {
    return currentIndex
  }

  for (let offset = 1; offset <= tags.length; offset += 1) {
    const nextIndex = (currentIndex + offset + tags.length) % tags.length

    if (tags[nextIndex]?.normalizedName.startsWith(normalizedTypedChar)) {
      return nextIndex
    }
  }

  return currentIndex
}

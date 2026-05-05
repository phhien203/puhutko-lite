import type { Tag } from "./types"

export function sortTagsAlphabetically(tags: Tag[]): Tag[] {
  return tags
    .map((tag, index) => ({ tag, index }))
    .sort((left, right) => {
      const comparison = left.tag.normalizedName.localeCompare(right.tag.normalizedName, "fi-FI")

      if (comparison !== 0) {
        return comparison
      }

      return left.index - right.index
    })
    .map(({ tag }) => tag)
}

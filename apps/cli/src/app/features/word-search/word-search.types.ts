import { WordDetail } from "@puhutko/shared"

export type FocusTarget = "autocomplete" | "recent" | "details"

export type WordSearchState = {
  focusTarget: FocusTarget
  isSidebarExpanded: boolean
  isAutocompleteActive: boolean
}

export type WordSearchAction =
  | { type: "autocomplete/set-active"; active: boolean }
  | { type: "sidebar/toggle"; isNarrowTerminal: boolean }
  | { type: "focus/next"; backwards: boolean; isNarrowTerminal: boolean }
  | { type: "layout/sync"; isSidebarVisible: boolean; isNarrowTerminal: boolean }

export type TagsManagerDialogWord = Pick<WordDetail, "id" | "word">

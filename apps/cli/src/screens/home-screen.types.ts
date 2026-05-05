export type HomeScreenOutletContext = {
  setAutocompleteActive: (active: boolean) => void
}

export type FocusTarget = "autocomplete" | "recent" | "details"

export type HomeScreenState = {
  focusTarget: FocusTarget
  isSidebarExpanded: boolean
  isAutocompleteActive: boolean
}

export type HomeScreenAction =
  | { type: "autocomplete/set-active"; active: boolean }
  | { type: "sidebar/toggle"; isNarrowTerminal: boolean }
  | { type: "focus/next"; backwards: boolean; isNarrowTerminal: boolean }
  | { type: "layout/sync"; isSidebarVisible: boolean; isNarrowTerminal: boolean }

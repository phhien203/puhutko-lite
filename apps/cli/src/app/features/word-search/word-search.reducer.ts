import type { WordSearchAction, WordSearchState } from "./word-search.types"
import { getNextFocusTarget } from "./word-search.utils"

export const initialWordSearchState: WordSearchState = {
  focusTarget: "autocomplete",
  isSidebarExpanded: true,
  isAutocompleteActive: false,
}

export function wordSearchReducer(
  state: WordSearchState,
  action: WordSearchAction,
): WordSearchState {
  switch (action.type) {
    case "autocomplete/set-active":
      return {
        ...state,
        isAutocompleteActive: action.active,
      }
    case "sidebar/toggle":
      if (
        action.isNarrowTerminal ||
        state.focusTarget === "autocomplete" ||
        state.isAutocompleteActive
      ) {
        return state
      }

      return {
        ...state,
        focusTarget: state.isSidebarExpanded ? "details" : state.focusTarget,
        isSidebarExpanded: !state.isSidebarExpanded,
      }
    case "focus/next":
      if (action.isNarrowTerminal || !state.isSidebarExpanded) {
        if (state.focusTarget === "details") {
          return state
        }

        return {
          ...state,
          focusTarget: "details",
        }
      }

      return {
        ...state,
        focusTarget: getNextFocusTarget(state.focusTarget, action.backwards),
      }
    case "layout/sync":
      if (!action.isSidebarVisible || action.isNarrowTerminal) {
        if (state.focusTarget === "details") {
          return state
        }

        return {
          ...state,
          focusTarget: "details",
        }
      }

      return state
    default:
      return state
  }
}

import type { WordSearchAction, WordSearchState } from "./word-search.types"
import { getNextFocusTarget } from "./word-search.utils"

export const initialWordSearchState: WordSearchState = {
  focusTarget: "autocomplete",
  isSidebarExpanded: true,
  isSidebarOverlayOpen: false,
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
    case "overlay/close":
      if (!state.isSidebarOverlayOpen && state.focusTarget === "details") {
        return state
      }

      return {
        ...state,
        focusTarget: "details",
        isSidebarOverlayOpen: false,
      }
    case "sidebar/toggle":
      if (state.focusTarget === "autocomplete" || state.isAutocompleteActive) {
        return state
      }

      if (action.isNarrowTerminal) {
        if (state.isSidebarOverlayOpen) {
          return {
            ...state,
            focusTarget: "details",
            isSidebarOverlayOpen: false,
          }
        }

        return {
          ...state,
          focusTarget: "autocomplete",
          isSidebarOverlayOpen: true,
        }
      }

      return {
        ...state,
        focusTarget: state.isSidebarExpanded ? "details" : state.focusTarget,
        isSidebarExpanded: !state.isSidebarExpanded,
      }
    case "focus/next":
      if (action.isNarrowTerminal) {
        if (!state.isSidebarOverlayOpen) {
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
          focusTarget: state.focusTarget === "recent" ? "autocomplete" : "recent",
        }
      }

      if (!state.isSidebarExpanded) {
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
      if (action.isNarrowTerminal) {
        if (!state.isSidebarOverlayOpen) {
          if (state.focusTarget === "details") {
            return state
          }

          return {
            ...state,
            focusTarget: "details",
          }
        }

        return state
      }

      if (state.isSidebarOverlayOpen) {
        return {
          ...state,
          focusTarget:
            !action.isSidebarVisible && state.focusTarget !== "details"
              ? "details"
              : state.focusTarget,
          isSidebarOverlayOpen: false,
        }
      }

      if (!action.isSidebarVisible) {
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

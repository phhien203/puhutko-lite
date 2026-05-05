export const draculaColors = {
  background: "#22212C",
  background2: "#212C2A",
  currentLine: "#454158",
  foreground: "#F8F8F2",
  comment: "#7970A9",
  cyan: "#80FFEA",
  green: "#8AFF80",
  pink: "#FF80BF",
  red: "#FF9580",
} as const

export const homeScreenTheme = {
  panelFocusedBackground: draculaColors.currentLine,
  panelBorder: draculaColors.comment,
  panelFocusedBorder: draculaColors.foreground,
  autocompleteLoading: draculaColors.green,
  autocompleteMenuBackground: draculaColors.background,
  autocompleteItemHighlightedBackground: draculaColors.pink,
  autocompleteItemHighlightedForeground: draculaColors.foreground,
  recentSearchFocusedForeground: draculaColors.foreground,
  mutedText: draculaColors.comment,
  linkText: draculaColors.cyan,
  errorText: draculaColors.red,
} as const

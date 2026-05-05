export const draculaColors = {
  background: "#282A36",
  currentLine: "#44475A",
  foreground: "#F8F8F2",
  comment: "#6272A4",
  cyan: "#8BE9FD",
  green: "#50FA7B",
  pink: "#FF79C6",
  red: "#FF5555",
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

import { useDialogState } from "@opentui-ui/dialog/react"
import { useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/react"
import React from "react"
import { Outlet, useLocation, useNavigate } from "react-router"
import { NARROW_TERMINAL_WIDTH } from "./features/word-search/word-search.constants"
import { draculaColors } from "./theme/colors"
import type { RootLayoutOutletContext } from "./root-layout.types"
import type { AppRouteMeta } from "./router"

type RootLayoutProps = {
  routes: AppRouteMeta[]
}

export function RootLayout({ routes }: RootLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const renderer = useRenderer()
  const { width } = useTerminalDimensions()
  const isDialogOpen = useDialogState((state) => state.isOpen)
  const [isAutocompleteActive, setIsAutocompleteActive] = React.useState(false)
  const toggleSidebarShortcutHandlerRef = React.useRef<(() => void) | null>(null)
  const isNarrowTerminal = width < NARROW_TERMINAL_WIDTH

  const activeRoute = routes.find((route) => route.path === location.pathname)
  const footerHints =
    activeRoute?.path === "/word-explorer"
      ? isNarrowTerminal
        ? "Ctrl+g/Esc Word Search   Ctrl+b Toggle Sidebar"
        : "Ctrl+g/Esc Word Search   Ctrl+b Toggle Sidebar   Ctrl+c Quit"
      : isNarrowTerminal
        ? "Ctrl+x Word Explorer   Ctrl+b Toggle Sidebar"
        : "Ctrl+x Word Explorer   Ctrl+b Toggle Sidebar   Ctrl+c Quit"
  const footerCredits = isNarrowTerminal ? null : "Made with ❤︎ by Hien Pham"
  const setToggleSidebarShortcutHandler = React.useCallback((handler: (() => void) | null) => {
    toggleSidebarShortcutHandlerRef.current = handler
  }, [])

  useKeyboard((key) => {
    const isCtrlShortcut = key.ctrl && !key.meta && !key.option

    if (isCtrlShortcut && key.name === "l") {
      renderer.console.toggle()
      key.preventDefault()
      key.stopPropagation()
      return
    }

    if (isDialogOpen) {
      return
    }

    const isRouteShortcut = routes.some((route) => route.shortcut === key.name)

    if (!isCtrlShortcut || (isAutocompleteActive && key.name !== "c" && key.name !== "b" && !isRouteShortcut)) {
      return
    }

    if (key.name === "c") {
      renderer.destroy()
      return
    }

    if (key.name === "b") {
      toggleSidebarShortcutHandlerRef.current?.()
      return
    }

    const nextRoute = routes.find((route) => route.shortcut === key.name)

    if (nextRoute) {
      navigate(nextRoute.path)
    }
  })

  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      padding={0}
      gap={1}
      backgroundColor={draculaColors.background2}
    >
      <box padding={0} flexGrow={1} minHeight={0}>
        <Outlet
          context={
            {
              setAutocompleteActive: setIsAutocompleteActive,
              setToggleSidebarShortcutHandler,
            } satisfies RootLayoutOutletContext
          }
        />
      </box>

      <box
        flexShrink={0}
        paddingX={2}
        paddingY={1}
        backgroundColor={draculaColors.background}
        flexDirection="row"
        alignItems="center"
      >
        <box flexGrow={1} minWidth={0}>
          <text>{footerHints}</text>
        </box>
        {footerCredits ? (
          <box flexShrink={0} marginLeft={2}>
            <text>{footerCredits}</text>
          </box>
        ) : null}
      </box>
    </box>
  )
}

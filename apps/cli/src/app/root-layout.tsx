import { useDialogState } from "@opentui-ui/dialog/react"
import { useKeyboard, useRenderer } from "@opentui/react"
import React from "react"
import { Outlet, useLocation, useNavigate } from "react-router"
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
  const isDialogOpen = useDialogState((state) => state.isOpen)
  const [isAutocompleteActive, setIsAutocompleteActive] = React.useState(false)
  const toggleSidebarShortcutHandlerRef = React.useRef<(() => void) | null>(null)

  const activeRoute = routes.find((route) => route.path === location.pathname)
  const footerHints =
    activeRoute?.path === "/word-explorer"
      ? "Ctrl+g/Esc Word Search   Ctrl+b Toggle Sidebar   Ctrl+c Quit"
      : "Ctrl+x Word Explorer   Ctrl+b Toggle Sidebar   Ctrl+c Quit"
  const footerCredits = "Made with ♥︎ by Hien Pham"
  const setToggleSidebarShortcutHandler = React.useCallback((handler: (() => void) | null) => {
    toggleSidebarShortcutHandlerRef.current = handler
  }, [])

  useKeyboard((key) => {
    if (isDialogOpen) {
      return
    }

    const isCtrlShortcut = key.ctrl && !key.meta && !key.option
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
          context={{
            setAutocompleteActive: setIsAutocompleteActive,
            setToggleSidebarShortcutHandler,
          } satisfies RootLayoutOutletContext}
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
        <box flexShrink={0} marginLeft={2}>
          <text>{footerCredits}</text>
        </box>
      </box>
    </box>
  )
}

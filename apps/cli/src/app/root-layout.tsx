import { useDialogState } from "@opentui-ui/dialog/react"
import { useKeyboard, useRenderer } from "@opentui/react"
import React from "react"
import { Outlet, useLocation, useNavigate } from "react-router"
import { draculaColors } from "./theme/colors"
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

  const activeRoute = routes.find((route) => route.path === location.pathname)
  const footerHints = routes.map((route) => `[${route.shortcut}] ${route.label}`).join("   ")

  useKeyboard((key) => {
    if (isAutocompleteActive || isDialogOpen) {
      return
    }

    if (key.name === "q") {
      renderer.destroy()
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
        <Outlet context={{ setAutocompleteActive: setIsAutocompleteActive }} />
      </box>

      <box flexShrink={0} paddingX={2} paddingY={1} backgroundColor={draculaColors.background}>
        <text>
          {footerHints}
          {"   "}[b] Sidebar{"   "}[Tab] Next{"   "}[q] Quit
        </text>
      </box>
    </box>
  )
}

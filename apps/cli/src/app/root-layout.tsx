import { useDialogState } from "@opentui-ui/dialog/react"
import { useKeyboard, useRenderer } from "@opentui/react"
import React from "react"
import { Outlet, useLocation, useNavigate } from "react-router"
import type { AppRouteMeta } from "./router"
import { draculaColors } from "../theme/colors"

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
  const footerHints = routes.map((route) => `[${route.shortcut}] ${route.label}`).join("  ")

  useKeyboard((key) => {
    if (isAutocompleteActive || isDialogOpen) {
      return
    }

    if (key.name === "q" || key.name === "escape") {
      renderer.destroy()
      return
    }

    const nextRoute = routes.find((route) => route.shortcut === key.name)

    if (nextRoute) {
      navigate(nextRoute.path)
    }
  })

  return (
    <box width="100%" height="100%" flexDirection="column" padding={0} gap={1} backgroundColor={draculaColors.background2}>
      {/*<box paddingX={1} paddingY={1}>
        <text>
          <strong>puhutko-lite</strong>
          {"  "}
          <span fg="gray">{activeRoute?.label ?? "Not Found"}</span>
          {"  "}
          <span fg="gray">{location.pathname}</span>
        </text>
      </box>*/}

      <box padding={0} flexGrow={1} minHeight={0}>
        <Outlet context={{ setAutocompleteActive: setIsAutocompleteActive }} />
      </box>

      <box flexShrink={0} paddingX={1} paddingY={1} backgroundColor={draculaColors.background}>
        <text>
          {footerHints}  [b] Sidebar    [Tab] Next    [q] Quit    [Esc] Quit
        </text>
      </box>
    </box>
  )
}

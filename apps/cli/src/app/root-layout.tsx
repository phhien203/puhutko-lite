import { useKeyboard, useRenderer } from "@opentui/react"
import { Outlet, useLocation, useNavigate } from "react-router"
import type { AppRouteMeta } from "./router"

type RootLayoutProps = {
  routes: AppRouteMeta[]
}

export function RootLayout({ routes }: RootLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const renderer = useRenderer()

  const activeRoute = routes.find((route) => route.path === location.pathname)
  const footerHints = routes.map((route) => `[${route.shortcut}] ${route.label}`).join("  ")

  useKeyboard((key) => {
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
    <box width="100%" height="100%" flexDirection="column" padding={1} gap={1}>
      <box border borderStyle="rounded" paddingX={1} paddingY={0}>
        <text>
          <strong>puhutko-lite</strong>
          {"  "}
          <span fg="gray">{activeRoute?.label ?? "Not Found"}</span>
          {"  "}
          <span fg="gray">{location.pathname}</span>
        </text>
      </box>

      <box border borderStyle="rounded" padding={1} flexGrow={1} minHeight={0}>
        <Outlet />
      </box>

      <box border borderStyle="rounded" paddingX={1} paddingY={0}>
        <text>
          {footerHints}  <strong>[q]</strong> Quit <strong>[Esc]</strong> Quit
        </text>
      </box>
    </box>
  )
}

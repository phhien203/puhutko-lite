import React from "react"
import { createMemoryRouter } from "react-router"
import { RootLayout } from "./root-layout"
import { AboutScreen } from "../screens/about-screen"
import { HomeScreen } from "../screens/home-screen"
import { NotFoundScreen } from "../screens/not-found-screen"
import { SettingsScreen } from "../screens/settings-screen"

export type AppRouteMeta = {
  path: `/${string}`
  label: string
  shortcut: string
  element: React.ReactNode
}

export const routes: AppRouteMeta[] = [
  {
    path: "/",
    label: "Home",
    shortcut: "h",
    element: <HomeScreen />
  },
  {
    path: "/about",
    label: "About",
    shortcut: "a",
    element: <AboutScreen />
  },
  {
    path: "/settings",
    label: "Settings",
    shortcut: "s",
    element: <SettingsScreen />
  }
]

export const router = createMemoryRouter([
  {
    path: "/",
    element: <RootLayout routes={routes} />,
    children: [
      ...routes.map((route) => ({
        index: route.path === "/" ? true : undefined,
        path: route.path === "/" ? undefined : route.path.slice(1),
        element: route.element
      })),
      {
        path: "*",
        element: <NotFoundScreen />
      }
    ]
  }
])

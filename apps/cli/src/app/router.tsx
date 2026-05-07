import React from "react"
import { createMemoryRouter } from "react-router"

import { WordExplorer } from "./features/word-explorer/word-explorer"
import { WordSearch } from "./features/word-search/word-search"
import { NotFoundScreen } from "./not-found-screen"
import { RootLayout } from "./root-layout"

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
    shortcut: "g",
    element: <WordSearch />,
  },
  {
    path: "/word-explorer",
    label: "Explorer",
    shortcut: "x",
    element: <WordExplorer />,
  },
]

export const router = createMemoryRouter([
  {
    path: "/",
    element: <RootLayout routes={routes} />,
    children: [
      ...routes.map((route) => ({
        index: route.path === "/" ? true : undefined,
        path: route.path === "/" ? undefined : route.path.slice(1),
        element: route.element,
      })),
      {
        path: "*",
        element: <NotFoundScreen />,
      },
    ],
  },
])

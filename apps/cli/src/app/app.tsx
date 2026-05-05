import { DialogProvider } from "@opentui-ui/dialog/react"
import { RouterProvider } from "react-router"
import { WordTagsProvider } from "../features/word-tags/word-tags-provider"
import { router } from "./router"

export function App() {
  return (
    <WordTagsProvider>
      <DialogProvider>
        <RouterProvider router={router} />
      </DialogProvider>
    </WordTagsProvider>
  )
}

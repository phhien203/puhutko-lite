import { DialogProvider } from "@opentui-ui/dialog/react"
import { RouterProvider } from "react-router"
import { WordTagsProvider } from "./providers/word-tags-provider"
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

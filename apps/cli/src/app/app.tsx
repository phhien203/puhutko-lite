import { DialogProvider } from "@opentui-ui/dialog/react"
import { RouterProvider } from "react-router"
import { WordExampleProvider } from "./providers/word-example-provider"
import { WordTagsProvider } from "./providers/word-tags-provider"
import { router } from "./router"

export function App() {
  return (
    <WordExampleProvider>
      <WordTagsProvider>
        <DialogProvider>
          <RouterProvider router={router} />
        </DialogProvider>
      </WordTagsProvider>
    </WordExampleProvider>
  )
}

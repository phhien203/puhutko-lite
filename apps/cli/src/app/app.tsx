import { DialogProvider } from "@opentui-ui/dialog/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "react-router"
import { queryClient } from "./query/query-client"
import { router } from "./router"

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <DialogProvider>
          <RouterProvider router={router} />
        </DialogProvider>
    </QueryClientProvider>
  )
}

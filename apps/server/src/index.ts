import { appSignature } from "@puhutko/shared"
import { Hono } from "hono"

const app = new Hono()

app.get("/", (c) => {
  return c.json({
    name: "puhutko-lite-server",
    message: `Hello from ${appSignature("server")}`
  })
})

app.get("/health", (c) => {
  return c.json({ ok: true })
})

const port = Number(process.env.PORT ?? 3000)

Bun.serve({
  port,
  fetch: app.fetch
})

console.log(`server listening on http://localhost:${port}`)

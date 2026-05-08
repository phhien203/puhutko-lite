import { ConsolePosition, createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./app/app"
import { APP_NAME, APP_VERSION } from "./app/version"

const args = process.argv.slice(2)

if (args.includes("--version") || args.includes("-v")) {
  console.log(`${APP_NAME} ${APP_VERSION}`)
  process.exit(0)
}

if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: puhutko-lite [--version|-v] [--help|-h]")
  process.exit(0)
}

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  consoleOptions: {
    position: ConsolePosition.BOTTOM,
    sizePercent: 40,
  },
})

createRoot(renderer).render(<App />)

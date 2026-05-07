import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "puhutko | Interactive Finnish Dictionary with command line interface",
  description:
    "A fast keyboard-driven terminal dictionary for Finnish word exploration, pattern learning, and practical lookup workflows.",
  openGraph: {
    title: "puhutko | Interactive Terminal Finnish Dictionary",
    description:
      "Install puhutko-lite on macOS Apple Silicon or Windows x64 and start learning Finnish words directly in your terminal.",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

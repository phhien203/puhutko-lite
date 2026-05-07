"use client"

import React from "react"

const windowsDownloadUrl =
  "https://github.com/phhien203/puhutko-lite/releases/latest/download/puhutko-lite-windows-x64.zip"

type Platform = "macos" | "windows"

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") {
    return "macos"
  }

  const userAgent = navigator.userAgent.toLowerCase()
  const platform = (navigator.platform || "").toLowerCase()

  if (platform.includes("win") || userAgent.includes("windows")) {
    return "windows"
  }

  return "macos"
}

export function DownloadTabs() {
  const [activeTab, setActiveTab] = React.useState<Platform>("macos")

  React.useEffect(() => {
    setActiveTab(detectPlatform())
  }, [])

  return (
    <div className="tabs-root">
      <div className="tabs-list" role="tablist" aria-label="Operating systems">
        <button
          className={`tab-trigger ${activeTab === "macos" ? "is-active" : ""}`}
          role="tab"
          aria-selected={activeTab === "macos"}
          onClick={() => setActiveTab("macos")}
        >
          macOS Apple Silicon
        </button>
        <button
          className={`tab-trigger ${activeTab === "windows" ? "is-active" : ""}`}
          role="tab"
          aria-selected={activeTab === "windows"}
          onClick={() => setActiveTab("windows")}
        >
          Windows x64
        </button>
      </div>

      {activeTab === "macos" ? (
        <article className="install-card" role="tabpanel">
          <h3>macOS Apple Silicon</h3>
          <ol>
            <li>Tap the Homebrew source</li>
            <li>Install the app</li>
            <li>Run it from your terminal</li>
          </ol>
          <pre>
            <code>{`brew tap phhien203/puhutko-lite
brew install puhutko-lite
puhutko-lite`}</code>
          </pre>
        </article>
      ) : (
        <article className="install-card" role="tabpanel">
          <h3>Windows x64</h3>
          <ol>
            <li>
              Download <a href={windowsDownloadUrl}>puhutko-lite-windows-x64.zip</a> directly
            </li>
            <li>Extract the ZIP archive</li>
            <li>
              Run <code>PuhutkoLite-Setup.exe</code>
            </li>
            <li>Open a new CMD or PowerShell window</li>
            <li>
              Run <code>puhutko-lite</code>
            </li>
          </ol>
        </article>
      )}
    </div>
  )
}

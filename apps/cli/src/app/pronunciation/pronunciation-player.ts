import type { ChildProcess } from "node:child_process"
import { spawn, spawnSync } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { extname, join } from "node:path"

import type { PronunciationAudio, WordDetail } from "@puhutko/shared"

type ActivePlayback = {
  child: ChildProcess
  completion: Promise<void>
  interrupted: boolean
}

type ManagedPlaybackOptions = {
  defaultErrorMessage: string
  mapExitError?: (code: number | null, stderr: string) => string
  windowsHide?: boolean
}

const pronunciationTempDirectory = join(tmpdir(), "puhutko-lite-pronunciation")
const audioDownloadCache = new Map<string, Promise<string>>()

export const PRONUNCIATION_PLAYBACK_SHORTCUT_ENABLED = false

let activePlayback: ActivePlayback | null = null
let playbackTransition: Promise<void> = Promise.resolve()
let latestPlaybackRequestId = 0
let macosFinnishVoicePromise: Promise<string | null> | null = null

class PlaybackInterruptedError extends Error {
  constructor() {
    super("Pronunciation playback interrupted.")
  }
}

export function isPronunciationPlaybackSupported() {
  return process.platform === "darwin" || process.platform === "win32"
}

export async function playPronunciation(detail: WordDetail): Promise<void> {
  const requestId = ++latestPlaybackRequestId
  const startPromise = playbackTransition.then(async () => {
    await stopActivePlayback()

    if (requestId !== latestPlaybackRequestId) {
      return null
    }

    let playback: ActivePlayback

    try {
      playback = await createPlayback(detail)
    } catch (error) {
      if (requestId !== latestPlaybackRequestId) {
        return null
      }

      throw error
    }

    if (requestId !== latestPlaybackRequestId) {
      await interruptPlayback(playback)
      return null
    }

    activePlayback = playback
    return playback
  })

  playbackTransition = startPromise.then(
    () => undefined,
    () => undefined,
  )

  const playback = await startPromise

  if (!playback) {
    return
  }

  try {
    await playback.completion
  } catch (error) {
    if (error instanceof PlaybackInterruptedError) {
      return
    }

    throw error
  } finally {
    if (activePlayback === playback) {
      activePlayback = null
    }
  }
}

export function stopPronunciation() {
  latestPlaybackRequestId += 1

  const stopPromise = playbackTransition.then(async () => {
    await stopActivePlayback()
  })

  playbackTransition = stopPromise.then(
    () => undefined,
    () => undefined,
  )
}

async function createPlayback(detail: WordDetail): Promise<ActivePlayback> {
  const audio = detail.pronunciationAudios?.[0]

  if (audio) {
    const localFilePath = await getCachedAudioFilePath(audio)
    return createRecordedAudioPlayback(localFilePath)
  }

  const word = detail.word.trim() || detail.normalizedWord.trim()

  if (!word) {
    throw new Error("Failed to play pronunciation.")
  }

  return createTextToSpeechPlayback(word)
}

async function getCachedAudioFilePath(audio: PronunciationAudio) {
  const cachedFilePath = audioDownloadCache.get(audio.preferredPlaybackUrl)

  if (cachedFilePath) {
    return cachedFilePath
  }

  const downloadPromise = downloadAudioFile(audio)
  audioDownloadCache.set(audio.preferredPlaybackUrl, downloadPromise)

  try {
    return await downloadPromise
  } catch (error) {
    audioDownloadCache.delete(audio.preferredPlaybackUrl)
    throw error
  }
}

async function downloadAudioFile(audio: PronunciationAudio) {
  const response = await fetch(audio.preferredPlaybackUrl)

  if (!response.ok) {
    throw new Error("Failed to download pronunciation audio.")
  }

  const filePath = join(
    pronunciationTempDirectory,
    `${hashString(audio.preferredPlaybackUrl)}-${sanitizePlaybackBaseName(audio.fileName)}${getPlaybackExtension(audio)}`,
  )

  await mkdir(pronunciationTempDirectory, { recursive: true })
  await writeFile(filePath, Buffer.from(await response.arrayBuffer()))

  return filePath
}

function sanitizePlaybackBaseName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "")
  const sanitized = withoutExtension.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "")

  return sanitized.length > 0 ? sanitized : "pronunciation"
}

function getPlaybackExtension(audio: PronunciationAudio) {
  if (audio.mimeType.startsWith("audio/mpeg")) {
    return ".mp3"
  }

  if (audio.mimeType === "audio/ogg") {
    return ".ogg"
  }

  if (audio.mimeType === "audio/wav") {
    return ".wav"
  }

  try {
    const urlExtension = extname(new URL(audio.preferredPlaybackUrl).pathname)

    if (urlExtension) {
      return urlExtension
    }
  } catch {
    // Ignore malformed playback URLs and fall back to the source filename.
  }

  return extname(audio.fileName) || ".bin"
}

function hashString(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash.toString(16)
}

function createRecordedAudioPlayback(localFilePath: string) {
  if (process.platform === "darwin") {
    return createManagedPlayback("afplay", [localFilePath], {
      defaultErrorMessage: "Failed to play pronunciation.",
    })
  }

  if (process.platform === "win32") {
    return createWindowsRecordedAudioPlayback(localFilePath)
  }

  throw new Error("Pronunciation playback is not supported on this platform.")
}

async function createTextToSpeechPlayback(word: string) {
  if (process.platform === "darwin") {
    const voice = await getMacosFinnishVoice()

    if (!voice) {
      throw new Error("No Finnish system voice available.")
    }

    return createManagedPlayback("say", ["-v", voice, word], {
      defaultErrorMessage: "Failed to play pronunciation.",
      windowsHide: false,
    })
  }

  if (process.platform === "win32") {
    return createWindowsTextToSpeechPlayback(word)
  }

  throw new Error("Pronunciation playback is not supported on this platform.")
}

function createWindowsRecordedAudioPlayback(localFilePath: string) {
  const escapedLocalFilePath = escapePowerShellString(localFilePath)
  const script = [
    `$localPath = '${escapedLocalFilePath}'`,
    "Add-Type -AssemblyName PresentationCore",
    "Add-Type -AssemblyName WindowsBase",
    "$script:PlaybackFailed = $false",
    "$script:PlaybackError = $null",
    "$dispatcher = [System.Windows.Threading.Dispatcher]::CurrentDispatcher",
    "$player = [System.Windows.Media.MediaPlayer]::new()",
    "Register-ObjectEvent -InputObject $player -EventName MediaOpened -Action { $Event.Sender.Play() } | Out-Null",
    "Register-ObjectEvent -InputObject $player -EventName MediaEnded -MessageData $dispatcher -Action { $Event.MessageData.InvokeShutdown() } | Out-Null",
    "Register-ObjectEvent -InputObject $player -EventName MediaFailed -MessageData $dispatcher -Action { $script:PlaybackFailed = $true; $script:PlaybackError = $EventArgs.ErrorException.Message; $Event.MessageData.InvokeShutdown() } | Out-Null",
    "$player.Open([Uri]::new($localPath))",
    "[System.Windows.Threading.Dispatcher]::Run()",
    "$player.Close()",
    "if ($script:PlaybackFailed) { Write-Error $script:PlaybackError; exit 1 }",
  ].join("\n")

  return createEncodedPowerShellPlayback(script, {
    defaultErrorMessage: "Failed to play pronunciation.",
  })
}

function createWindowsTextToSpeechPlayback(word: string) {
  const escapedWord = escapePowerShellString(word)
  const script = [
    `$word = '${escapedWord}'`,
    "Add-Type -AssemblyName System.Speech",
    "$synth = [System.Speech.Synthesis.SpeechSynthesizer]::new()",
    "$voice = $synth.GetInstalledVoices([System.Globalization.CultureInfo]::GetCultureInfo('fi-FI')) | Select-Object -First 1",
    "if (-not $voice) { exit 2 }",
    "$synth.SelectVoice($voice.VoiceInfo.Name)",
    "$synth.SetOutputToDefaultAudioDevice()",
    "$synth.Speak($word)",
  ].join("\n")

  return createEncodedPowerShellPlayback(script, {
    defaultErrorMessage: "Failed to play pronunciation.",
    mapExitError: (code, stderr) => {
      if (code === 2) {
        return "No Finnish system voice available."
      }

      return stderr || "Failed to play pronunciation."
    },
  })
}

function createEncodedPowerShellPlayback(script: string, options: ManagedPlaybackOptions) {
  const encodedCommand = Buffer.from(script, "utf16le").toString("base64")

  return createManagedPlayback(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-STA",
      "-WindowStyle",
      "Hidden",
      "-EncodedCommand",
      encodedCommand,
    ],
    options,
  )
}

function createManagedPlayback(
  command: string,
  args: string[],
  {
    defaultErrorMessage,
    mapExitError,
    windowsHide = true,
  }: ManagedPlaybackOptions,
): ActivePlayback {
  const child = spawn(command, args, {
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide,
  })
  const playback: ActivePlayback = {
    child,
    interrupted: false,
    completion: Promise.resolve(),
  }

  playback.completion = new Promise<void>((resolve, reject) => {
    let stderr = ""

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString()
    })

    child.once("error", (error) => {
      if (playback.interrupted) {
        reject(new PlaybackInterruptedError())
        return
      }

      reject(error instanceof Error ? error : new Error(defaultErrorMessage))
    })

    child.once("exit", (code) => {
      if (playback.interrupted) {
        reject(new PlaybackInterruptedError())
        return
      }

      if (code === 0) {
        resolve()
        return
      }

      const trimmedStderr = stderr.trim()
      const errorMessage = mapExitError?.(code, trimmedStderr) || trimmedStderr || defaultErrorMessage
      reject(new Error(errorMessage))
    })
  })

  return playback
}

async function stopActivePlayback() {
  if (!activePlayback) {
    return
  }

  const playback = activePlayback
  activePlayback = null

  await interruptPlayback(playback)
}

async function interruptPlayback(playback: ActivePlayback) {
  playback.interrupted = true

  if (!playback.child.killed) {
    playback.child.kill()
  }

  try {
    await playback.completion
  } catch (error) {
    if (error instanceof PlaybackInterruptedError) {
      return
    }

    throw error
  }
}

function escapePowerShellString(value: string) {
  return value.replace(/'/g, "''")
}

async function getMacosFinnishVoice() {
  if (!macosFinnishVoicePromise) {
    macosFinnishVoicePromise = Promise.resolve(resolveMacosFinnishVoice())
  }

  return macosFinnishVoicePromise
}

function resolveMacosFinnishVoice() {
  const voiceList = spawnSync("say", ["-v", "?"], {
    encoding: "utf8",
  })

  if (voiceList.status !== 0) {
    return null
  }

  const voices = voiceList.stdout
    .split(/\r?\n/)
    .map((line) => {
      const match = /^\s*(\S+)\s+(\S+)/.exec(line)

      if (!match) {
        return null
      }

      return {
        name: match[1],
        locale: match[2],
      }
    })
    .filter((voice): voice is { name: string; locale: string } => voice !== null)

  return voices.find((voice) => voice.name === "Satu")?.name
    ?? voices.find((voice) => voice.locale === "fi_FI")?.name
    ?? null
}

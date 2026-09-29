import {
  useEffect,
  useState,
} from "react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome:
      | "accepted"
      | "dismissed"
    platform: string
  }>
}

const INSTALL_PROMO_DISMISSED_KEY =
  "uma-pct-install-promo-dismissed"

const PWA_INSTALLED_KEY =
  "uma-pct-pwa-installed"

let sharedInstallPrompt:
  | BeforeInstallPromptEvent
  | null = null

const installPromptListeners =
  new Set<
    (
      prompt:
        | BeforeInstallPromptEvent
        | null
    ) => void
  >()

function setSharedInstallPrompt(
  prompt:
    | BeforeInstallPromptEvent
    | null
) {
  sharedInstallPrompt = prompt

  installPromptListeners.forEach(
    (listener) => {
      listener(prompt)
    }
  )
}

function getIsStandalone() {
  const displayModeStandalone =
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches

  const iosStandalone =
    (
      navigator as Navigator & {
        standalone?: boolean
      }
    ).standalone === true

  return (
    displayModeStandalone ||
    iosStandalone
  )
}

export function usePwaInstall() {
  const [
    installPrompt,
    setInstallPrompt,
  ] = useState<
    BeforeInstallPromptEvent | null
  >(() => sharedInstallPrompt)

  const [
    isStandalone,
    setIsStandalone,
  ] = useState(() =>
    getIsStandalone()
  )

  const [
    isInstalled,
    setIsInstalled,
  ] = useState(() => {
    return (
      getIsStandalone() ||
      localStorage.getItem(
        PWA_INSTALLED_KEY
      ) === "true"
    )
  })

  const [
    isPromoDismissed,
    setIsPromoDismissed,
  ] = useState(
    () =>
      localStorage.getItem(
        INSTALL_PROMO_DISMISSED_KEY
      ) === "true"
  )

  const isIos =
    /iphone|ipad|ipod/i.test(
      navigator.userAgent
    ) ||
    (
      navigator.platform === "MacIntel" &&
      navigator.maxTouchPoints > 1
    )

  useEffect(() => {
    const standalone =
      getIsStandalone()

    setIsStandalone(standalone)

    if (standalone) {
      localStorage.setItem(
        PWA_INSTALLED_KEY,
        "true"
      )

      setIsInstalled(true)
    }

    const syncInstallPrompt = (
      prompt:
        | BeforeInstallPromptEvent
        | null
    ) => {
      setInstallPrompt(prompt)
    }

    installPromptListeners.add(
      syncInstallPrompt
    )

    const handleBeforeInstallPrompt = (
      event: Event
    ) => {
      event.preventDefault()

      localStorage.removeItem(
        PWA_INSTALLED_KEY
      )

      setIsInstalled(false)

      setSharedInstallPrompt(
        event as BeforeInstallPromptEvent
      )
    }

    const handleAppInstalled = () => {
      localStorage.setItem(
        PWA_INSTALLED_KEY,
        "true"
      )

      setIsInstalled(true)

      setSharedInstallPrompt(null)
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    )

    window.addEventListener(
      "appinstalled",
      handleAppInstalled
    )

    return () => {
      installPromptListeners.delete(
        syncInstallPrompt
      )

      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      )

      window.removeEventListener(
        "appinstalled",
        handleAppInstalled
      )
    }
  }, [])

  const install = async () => {
    if (!installPrompt) {
      return false
    }

    await installPrompt.prompt()

    const choice =
      await installPrompt.userChoice

    setSharedInstallPrompt(null)

    if (
      choice.outcome === "accepted"
    ) {
      localStorage.setItem(
        PWA_INSTALLED_KEY,
        "true"
      )

      setIsInstalled(true)

      return true
    }

    return false
  }

  const dismissPromo = () => {
    localStorage.setItem(
      INSTALL_PROMO_DISMISSED_KEY,
      "true"
    )

    setIsPromoDismissed(true)
  }

  return {
    isInstalled,
    isStandalone,
    isIos,
    canInstall:
      installPrompt !== null,
    isPromoDismissed,
    install,
    dismissPromo,
  }
}
import {
  useEffect,
  useRef,
  useState,
} from "react"

import { registerSW } from "virtual:pwa-register"
import "./SplashScreen.css"

type SplashScreenProps = {
  onFinished: () => void
  version?: string
  status?: string
  isHomeNight?: boolean
}

function SplashScreen({
  onFinished,
  version,
  status = "Welcome, Trainer",
  isHomeNight = false,
}: SplashScreenProps) {
  const [isLeaving, setIsLeaving] =
    useState(false)

  const [displayStatus, setDisplayStatus] =
    useState(status)

  const registrationRef =
    useRef<ServiceWorkerRegistration | null>(
      null
    )

  const updateServiceWorkerRef =
    useRef<
      | ((
          reloadPage?: boolean
        ) => Promise<void>)
      | null
    >(null)

  const needsRefreshRef =
    useRef(false)

  const onFinishedRef =
    useRef(onFinished)

  useEffect(() => {
    onFinishedRef.current = onFinished
  }, [onFinished])

  useEffect(() => {
    updateServiceWorkerRef.current =
      registerSW({
        immediate: true,

        onRegisteredSW(
          _swUrl,
          registration
        ) {
          registrationRef.current =
            registration ?? null
        },

        onNeedRefresh() {
          needsRefreshRef.current = true
        },

        onRegisterError(error) {
          console.error(
            "Service Worker registration error:",
            error
          )
        },
      })
  }, [])

  useEffect(() => {
    let cancelled = false

    const delay = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms)
      })

    const finishSplash = async () => {
      await delay(500)

      if (cancelled) {
        return
      }

      setIsLeaving(true)

      await delay(500)

      if (!cancelled) {
        onFinishedRef.current()
      }
    }

    const waitForWorker = (
      worker: ServiceWorker
    ) =>
      new Promise<void>((resolve) => {
        if (
          worker.state === "installed" ||
          worker.state === "activated" ||
          worker.state === "redundant"
        ) {
          resolve()
          return
        }

        const handleStateChange = () => {
          if (
            worker.state === "installed" ||
            worker.state === "activated" ||
            worker.state === "redundant"
          ) {
            worker.removeEventListener(
              "statechange",
              handleStateChange
            )

            resolve()
          }
        }

        worker.addEventListener(
          "statechange",
          handleStateChange
        )
      })

    const checkForUpdates = async () => {
      setDisplayStatus(
        "Checking for updates..."
      )
      const checkingStartedAt =
        Date.now()

      const ensureCheckingVisible =
        async () => {
          const elapsed =
            Date.now() - checkingStartedAt

          if (elapsed < 600) {
            await delay(600 - elapsed)
          }
        }

      if (
        !("serviceWorker" in navigator)
      ) {
        await ensureCheckingVisible()
        await finishSplash()
        return
      }

      try {
        const scopeUrl = new URL(
          import.meta.env.BASE_URL,
          window.location.origin
        ).href

        const registration =
          registrationRef.current ??
          (await navigator.serviceWorker.getRegistration(
            scopeUrl
          ))

        if (!registration) {
          await ensureCheckingVisible()
          await finishSplash()
          return
        }

        registrationRef.current =
          registration

        /*
         * An update may already have been
         * downloaded during a previous session.
         */
        if (
          navigator.serviceWorker.controller &&
          registration.waiting
        ) {
          await ensureCheckingVisible()
          setDisplayStatus("Updating...")

          await delay(400)

          await updateServiceWorkerRef.current?.(
            true
          )

          return
        }

        let installingWorker:
          | ServiceWorker
          | null = null

        const handleUpdateFound = () => {
          installingWorker =
            registration.installing
        }

        registration.addEventListener(
          "updatefound",
          handleUpdateFound
        )

        try {
          await registration.update()
        } finally {
          registration.removeEventListener(
            "updatefound",
            handleUpdateFound
          )
        }

        const worker =
          registration.installing ??
          installingWorker

        if (worker) {
          await waitForWorker(worker)
        }

        if (
          navigator.serviceWorker.controller &&
          (
            registration.waiting ||
            needsRefreshRef.current
          )
        ) {
          await ensureCheckingVisible()
          setDisplayStatus("Updating...")

          await delay(400)

          await updateServiceWorkerRef.current?.(
            true
          )

          return
        }

       await ensureCheckingVisible()
       await finishSplash()
      } catch (error) {
        console.error(
          "Could not check for app updates:",
          error
        )

        /*
         * No internet or update check failed.
         * Start the currently installed version.
         */
        await ensureCheckingVisible()
        await finishSplash()
      }
    }

    /*
     * Keep the original welcome splash first.
     */
    const introTimer =
      window.setTimeout(() => {
        void checkForUpdates()
      }, 2800)

    return () => {
      cancelled = true

      window.clearTimeout(introTimer)
    }
  }, [])

  return (
    <div className="app-splash" data-leaving={isLeaving} data-night={isHomeNight} aria-label="Starting UmaPCT">
      <div className="app-splash-home-reveal" aria-hidden="true" />

      <div className="app-splash-center">
        <div className="app-splash-brand">
          <div className="app-splash-logo-space" aria-hidden="true" />
          <div className="app-splash-logo" aria-hidden="true">
            <img
              className="app-splash-logo-night"
              src={import.meta.env.BASE_URL + "pwa-192x192.png"}
              alt=""
              width="96"
              height="96"
            />
            <img
              className="app-splash-logo-day"
              src={import.meta.env.BASE_URL + "pwa-2-192x192.png"}
              alt=""
              width="96"
              height="96"
            />
          </div>
          <div className="app-splash-brand-copy">
            <div className="app-splash-brand-label">UMAMUSUME</div>
            <div className="app-splash-brand-title">Personal Competitive Tracker</div>
          </div>
        </div>

        <div className="app-splash-meta">
          {version && <div className="app-splash-version">v{version}</div>}
          <div className="app-splash-divider" aria-hidden="true" />
          <div className="app-splash-status" role="status" aria-live="polite">
            {displayStatus}
          </div>
          <div className="app-splash-loading" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SplashScreen

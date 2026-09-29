import {
  useEffect,
  useRef,
  useState,
} from "react"

import { registerSW } from "virtual:pwa-register"

type SplashScreenProps = {
  onFinished: () => void
  version?: string
  status?: string
}

function SplashScreen({
  onFinished,
  version,
  status = "Welcome, Trainer",
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
    <div
      className={`fixed inset-0 z-[1000] flex min-h-screen items-center justify-center overflow-hidden bg-[#030811] transition-opacity duration-500 ${
        isLeaving
          ? "opacity-0"
          : "opacity-100"
      }`}
    >
      {/* BACKGROUND GLOW */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/[0.08] blur-[120px]" />

      <div className="pointer-events-none absolute left-[35%] top-[40%] h-64 w-64 rounded-full bg-sky-500/[0.06] blur-[100px]" />

      {/* CONTENT */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[22px] border border-violet-300/15 bg-[#07111f]/95 text-[88px] leading-none text-violet-300 shadow-[0_0_30px_rgba(167,139,250,0.18)]">
          ♞
        </div>

        <div className="text-5xl font-black tracking-[0.08em] text-white">
          UMAMUSUME
        </div>

        <div className="mt-3 text-lg font-bold tracking-[0.12em] text-sky-200/75">
          Personal Competitive Tracker
        </div>

        {version && (
          <div className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-violet-200/35">
            v{version}
          </div>
        )}

        <div className="mt-10 h-px w-44 bg-gradient-to-r from-transparent via-violet-300/50 to-transparent" />

        <div className="mt-5 text-[10px] font-bold uppercase tracking-[0.28em] text-blue-100/25">
          {displayStatus}
        </div>

        {/* LOADING */}
        <div className="mt-9 flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300/70" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300/60 [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300/70 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

export default SplashScreen
import { useEffect, useState } from "react"

type SplashScreenProps = {
  onFinished: () => void
}

function SplashScreen({
  onFinished,
}: SplashScreenProps) {

   const [isLeaving, setIsLeaving] =
    useState(false)

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => {
    setIsLeaving(true)
    }, 2800)

    const finishTimer = window.setTimeout(() => {
    onFinished()
    }, 3400)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(finishTimer)
    }
  }, [onFinished])
  
  
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

          <div className="mt-10 h-px w-44 bg-gradient-to-r from-transparent via-violet-300/50 to-transparent" />

          <div className="mt-5 text-[10px] font-bold uppercase tracking-[0.28em] text-blue-100/25">
            Welcome, Trainer
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
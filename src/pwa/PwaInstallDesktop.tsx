import {
  useEffect,
  useState,
} from "react"

import { usePwaInstall } from "./usePwaInstall"

function PwaInstallDesktop() {
  const [isVisible, setIsVisible] =
    useState(false)

  const {
    isInstalled,
    isPromoDismissed,
    install,
    dismissPromo,
  } = usePwaInstall()

  useEffect(() => {
    const frame =
      requestAnimationFrame(() => {
        setIsVisible(true)
      })

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [])

  if (
    isInstalled ||
    isPromoDismissed
  ) {
    return null
  }

  return (
    <div
      className={`
        absolute right-4 top-0
        flex h-[68px] w-[330px]
        items-center justify-between gap-4
        border-x border-b border-sky-300/15
        bg-[#07111f]/95
        px-4
        shadow-xl
        backdrop-blur-xl
        transition-transform
        duration-500
        ease-out
        ${
          isVisible
            ? "translate-y-0"
            : "-translate-y-full"
        }
      `}
    >
      <div className="min-w-0">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-sky-300/50">
          Available as an app
        </div>

        <div className="mt-0.5 text-sm font-black text-white">
          Install UmaPCT on your PC
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => {
            void install()
          }}
          className="rounded-lg border border-sky-300/20 bg-sky-400/[0.08] px-3 py-2 text-[10px] font-black text-sky-200 transition hover:border-sky-300/35 hover:bg-sky-400/[0.14]"
        >
          Install
        </button>

        <button
          type="button"
          onClick={() => {
            setIsVisible(false)

            window.setTimeout(() => {
                dismissPromo()
            }, 500)
            }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-blue-100/30 transition hover:bg-white/[0.05] hover:text-white"
          aria-label="Hide install message"
          title="Hide"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default PwaInstallDesktop
import { useState } from "react"

import { usePwaInstall } from "./usePwaInstall"

function PwaInstallSettings() {
  const [showIosInstructions, setShowIosInstructions] =
    useState(false)

  const {
  isInstalled,
  isStandalone,
  isIos,
  canInstall,
  install,
} = usePwaInstall()

  if (isStandalone) {
    return null
  }

  const handleInstall = () => {
    if (isIos) {
      setShowIosInstructions(true)
      return
    }

    void install()
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-sky-300/15 bg-[#07111f]/95 shadow-2xl">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300/50">
          App Installation
        </div>
      </div>

      <div className="flex items-center justify-between gap-6 px-6 py-5">
        <div className="min-w-0">
          <div className="text-sm font-black text-white">
            Install UmaPCT
          </div>

          <p className="mt-1 text-xs leading-relaxed text-blue-100/40">
            Install app version of UmaPCT 
          </p>

          {isInstalled && (
            <div className="mt-2 text-xs font-bold text-emerald-300">
              UmaPCT is installed on this device.
            </div>
          )}

          {!isInstalled &&
            !isIos &&
            !canInstall && (
              <div className="mt-2 text-xs text-blue-100/30">
                Installation is not currently available in this browser.
              </div>
            )}
        </div>

        {!isInstalled && (
          <button
            type="button"
            onClick={handleInstall}
            disabled={!isIos && !canInstall}
            className="
              shrink-0
              rounded-xl
              border border-sky-300/20
              bg-sky-400/10
              px-4 py-2
              text-xs font-black
              text-sky-200
              transition
              hover:bg-sky-400/20
              disabled:cursor-not-allowed
              disabled:opacity-35
              disabled:hover:bg-sky-400/10
            "
          >
            Install
          </button>
        )}
      </div>

      {showIosInstructions && (
        <div className="border-t border-white/[0.06] px-6 py-5">
          <div className="text-sm font-black text-white">
            Install UmaPCT
          </div>

          <p className="mt-1 text-xs leading-relaxed text-blue-100/45">
            Open the Share menu in Safari and choose{" "}
            <span className="font-bold text-sky-200">
              Add to Home Screen
            </span>
            .
          </p>
        </div>
      )}
    </section>
  )
}

export default PwaInstallSettings
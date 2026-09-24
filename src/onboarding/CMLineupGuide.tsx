import {
  useEffect,
  useState,
} from "react"

import ModalPortal from "../components/ModalPortal"

type CMLineupGuideProps = {
  cmNumber?: number
  onComplete: () => void
}

const guideSteps = [
  {
    title: "Your Champions Meeting",
    description:
      "Each Champions Meeting you create appears as a card containing its race conditions, current team, progress, and results.",
    target: "cm-card",
  },
  {
    title: "Edit Champions Meeting",
    description:
      "Use Edit when you need to update the Champions Meeting or change your current team.",
    target: "cm-edit",
  },
  {
    title: "Update Your Team",
    description:
      "Changed an Uma in-game? Update the corresponding runner here. Previous participants and results remain in the Champions Meeting history.",
    target: "cm-team-lineup",
  },
]

function CMLineupGuide({
  cmNumber,
  onComplete,
}: CMLineupGuideProps) {
  const [stepIndex, setStepIndex] =
    useState(0)

  const [targetRect, setTargetRect] =
    useState<DOMRect | null>(null)

  const step = guideSteps[stepIndex]

  const isFirstStep = stepIndex === 0

  const isLastStep =
    stepIndex === guideSteps.length - 1

  const openEditForGuide = () => {
  if (cmNumber === undefined) {
    return
  }

  window.dispatchEvent(
    new CustomEvent(
      "uma-tracker:guide-open-cm-edit",
      {
        detail: {
          cmNumber,
        },
      }
    )
  )
}

const closeEditForGuide = () => {
  if (cmNumber === undefined) {
    return
  }

  window.dispatchEvent(
    new CustomEvent(
      "uma-tracker:guide-close-cm-edit",
      {
        detail: {
          cmNumber,
        },
      }
    )
  )
}

const handleComplete = () => {
  closeEditForGuide()
  onComplete()
}


  useEffect(() => {
  let retryTimeoutId: number | null = null
  let positionTimeoutId: number | null = null

  let cleanupPosition:
    | (() => void)
    | null = null

  let attempts = 0

  const findTarget = () => {
    const targetElement =
      document.querySelector<HTMLElement>(
        `[data-guide="${step.target}"]`
      )

    if (!targetElement) {
      attempts += 1

      if (attempts < 20) {
        retryTimeoutId =
          window.setTimeout(
            findTarget,
            100
          )
      }

      return
    }

    const updatePosition = () => {
      setTargetRect(
        targetElement.getBoundingClientRect()
      )
    }

    targetElement.scrollIntoView({
      behavior: "smooth",
      block: "center",
    })

    updatePosition()

    positionTimeoutId =
      window.setTimeout(
        updatePosition,
        350
      )

    window.addEventListener(
      "resize",
      updatePosition
    )

    window.addEventListener(
      "scroll",
      updatePosition,
      true
    )

    cleanupPosition = () => {
      window.removeEventListener(
        "resize",
        updatePosition
      )

      window.removeEventListener(
        "scroll",
        updatePosition,
        true
      )
    }
  }

  setTargetRect(null)
  findTarget()

  return () => {
    if (retryTimeoutId !== null) {
      window.clearTimeout(
        retryTimeoutId
      )
    }

    if (positionTimeoutId !== null) {
      window.clearTimeout(
        positionTimeoutId
      )
    }

    cleanupPosition?.()
  }
}, [step.target])

  return (
    <ModalPortal>
      {targetRect && (
        <div
          className="pointer-events-none fixed z-[301] rounded-2xl ring-2 ring-violet-400"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow:
              "0 0 0 9999px rgba(0, 0, 0, 0.72), 0 0 24px rgba(167, 139, 250, 0.35)",
          }}
        />
      )}

      <div className="pointer-events-auto fixed inset-0 z-[302] flex items-center justify-center px-4">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-violet-400/25 bg-[#050b15] shadow-2xl">

          <div className="border-b border-white/[0.07] px-6 py-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300/60">
              Champions Meeting · {stepIndex + 1} / {guideSteps.length}
            </div>

            <div className="mt-1 text-lg font-black text-white">
              {step.title}
            </div>
          </div>

          <div className="px-6 py-7">
            <p className="text-sm leading-6 text-blue-100/55">
              {step.description}
            </p>
          </div>

          <div className="px-6">
            <div className="flex gap-2">
              {guideSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 flex-1 rounded-full ${
                    index <= stepIndex
                      ? "bg-violet-400"
                      : "bg-white/[0.08]"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-white/[0.07] px-6 py-4">
            <button
              type="button"
              onClick={handleComplete}
              className="text-xs font-bold text-blue-100/35 transition hover:text-white"
            >
              Skip
            </button>

            <div className="flex gap-2">
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={() => {
                    if (stepIndex === 2) {
                        closeEditForGuide()
                    }

                    setStepIndex(
                        (current) => current - 1
                    )
                    }}
                  className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-bold text-blue-100/60 transition hover:bg-white/[0.04] hover:text-white"
                >
                  Back
                </button>
              )}

              {isLastStep ? (
                <button
                  type="button"
                  onClick={handleComplete}
                  className="rounded-lg border border-violet-400/30 bg-violet-500/15 px-5 py-2 text-sm font-black text-violet-100 transition hover:bg-violet-500/25"
                >
                  Got It
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const nextIndex =
                        stepIndex + 1

                    if (nextIndex === 2) {
                        openEditForGuide()
                    }

                    setStepIndex(nextIndex)
                    }}
                  className="rounded-lg border border-violet-400/30 bg-violet-500/15 px-5 py-2 text-sm font-black text-violet-100 transition hover:bg-violet-500/25"
                >
                  Next
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </ModalPortal>
  )
}

export default CMLineupGuide
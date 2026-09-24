import {
  useEffect,
  useState,
} from "react"
import ModalPortal from "../components/ModalPortal"

type GuidePage =
  | "home"
  | "cms"
  | "statistics"
  | "autoRunTimer"
  | "umaDatabase"

type ProfileGuideProps = {
  onNavigate: (page: GuidePage) => void
  onComplete: () => void
}

const guideSteps = [
  {
    section: "Home",
    title: "What's New",
    description:
      "See the latest additions, improvements, and changes made to UmaPCT.",
    page: "home" as const,
    target: "home-whats-new",
  },
  {
    section: "Home",
    title: "Competitive Record",
    description:
      "Your competitive record gives you a quick summary of your Champions Meeting history, including finals, wins, and overall win rate.",
    page: "home" as const,
    target: "home-competitive-record",
  },
  {
    section: "Home",
    title: "Latest Champions Meeting",
    description:
      "Your most recent Champions Meeting appears here with your current team, race conditions, progress, and results.",
    page: "home" as const,
    target: "home-latest-cm",
  },
  {
    section: "Home",
    title: "Favorite Uma",
    description:
      "Choose your Favorite Uma to personalize your profile and track her competitive statistics across your Champions Meetings.",
    page: "home" as const,
    target: "home-favorite-uma",
  },
    {
    section: "Champions Meeting",
    title: "Add a Champions Meeting",
    description:
        "Start here to add a Champions Meeting to your tracker. You'll set up the event, race conditions, and your initial team.",
    page: "cms" as const,
    target: "cm-add",
    },
    {
    section: "Champions Meeting",
    title: "CM Overview",
    description:
        "As you track Champions Meetings, this overview updates with your total events, race wins, final wins, and overall win rate.",
    page: "cms" as const,
    target: "cm-overview-stats",
    },
    {
    section: "Statistics",
    title: "Uma Rankings",
    description:
        "See which Umamusume stand out across your Champions Meeting history, including race wins, appearances, and finals.",
    page: "statistics" as const,
    target: "statistics-showcase",
    },
    {
    section: "Statistics",
    title: "Career Overview",
    description:
        "Track your overall Champions Meeting record, including events, finals, race wins, total races, and win rate.",
    page: "statistics" as const,
    target: "statistics-career-overview",
    },
    {
    section: "Statistics",
    title: "Uma Performance",
    description:
        "Compare the performance of individual Umamusume across your tracked Champions Meetings.",
    page: "statistics" as const,
    target: "statistics-uma-performance",
    },
        {
        section: "AutoRun Timer",
        title: "AutoRun Timer",
        description:
        "Start the timer when you begin Auto Run training. The app will count down the remaining time and can alert you when training is complete. Optional Training Energy tracking can be enabled in Settings.",
        page: "autoRunTimer" as const,
        target: "autorun-timer",
        },
        {
        section: "Uma Database",
        title: "Uma Database",
        description:
            "Browse official and custom Umamusume, search the database, filter active or archived entries, and add custom Uma versions when needed.",
        page: "umaDatabase" as const,
        target: "uma-database-toolbar",
        },
]

function ProfileGuide({
  onNavigate,
  onComplete,
}: ProfileGuideProps) {
  const [stepIndex, setStepIndex] =
    useState(0)
  const [targetRect, setTargetRect] =
     useState<DOMRect | null>(null)

  const step = guideSteps[stepIndex]
  const isFirstStep = stepIndex === 0
  const isLastStep =
    stepIndex === guideSteps.length - 1

  const sectionStepNumber =
  guideSteps
    .slice(0, stepIndex + 1)
    .filter(
      (item) =>
        item.section === step.section
    ).length

const sectionStepCount =
  guideSteps.filter(
    (item) =>
      item.section === step.section
  ).length

const guidePanelStyle = (() => {
  if (!targetRect) {
    return undefined
  }

  const margin = 16
  const panelWidth = Math.min(
    380,
    window.innerWidth - margin * 2
  )

  const estimatedHeight = 340

  const clampLeft = (left: number) =>
    Math.min(
      Math.max(left, margin),
      window.innerWidth -
        panelWidth -
        margin
    )

  const clampTop = (top: number) =>
    Math.min(
      Math.max(top, margin),
      Math.max(
        margin,
        window.innerHeight -
          estimatedHeight -
          margin
      )
    )

  const spaceRight =
    window.innerWidth -
    targetRect.right -
    margin

  const spaceLeft =
    targetRect.left - margin

  const spaceBelow =
    window.innerHeight -
    targetRect.bottom -
    margin

  const spaceAbove =
    targetRect.top - margin

  // RIGHT
  if (spaceRight >= panelWidth) {
    return {
      top: clampTop(
        targetRect.top +
          targetRect.height / 2 -
          estimatedHeight / 2
      ),
      left: targetRect.right + margin,
      width: panelWidth,
    }
  }

  // LEFT
  if (spaceLeft >= panelWidth) {
    return {
      top: clampTop(
        targetRect.top +
          targetRect.height / 2 -
          estimatedHeight / 2
      ),
      left:
        targetRect.left -
        panelWidth -
        margin,
      width: panelWidth,
    }
  }

  // BELOW
  if (spaceBelow >= estimatedHeight) {
    return {
      top: targetRect.bottom + margin,
      left: clampLeft(
        targetRect.left +
          targetRect.width / 2 -
          panelWidth / 2
      ),
      width: panelWidth,
    }
  }

  // ABOVE
  if (spaceAbove >= estimatedHeight) {
    return {
      top:
        targetRect.top -
        estimatedHeight -
        margin,
      left: clampLeft(
        targetRect.left +
          targetRect.width / 2 -
          panelWidth / 2
      ),
      width: panelWidth,
    }
  }

  // Małe okno — wybierz stronę z największą ilością miejsca
  if (spaceLeft > spaceRight) {
    return {
      top: margin,
      left: margin,
      width: panelWidth,
    }
  }

  return {
    top: margin,
    left:
      window.innerWidth -
      panelWidth -
      margin,
    width: panelWidth,
  }
})()

  useEffect(() => {
  if (!step.target) {
    setTargetRect(null)
    return
  }

  const element =
    document.querySelector<HTMLElement>(
      `[data-guide="${step.target}"]`
    )

  if (!element) {
    setTargetRect(null)
    return
  }

  const updatePosition = () => {
    setTargetRect(
      element.getBoundingClientRect()
    )
  }

  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
  })

  updatePosition()

  const timeoutId = window.setTimeout(
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

  return () => {
    window.clearTimeout(timeoutId)

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
}, [step.target])

  return (
    <ModalPortal>
        {targetRect && (
        <div
            className="pointer-events-none fixed z-[201] rounded-2xl ring-2 ring-sky-400"
            style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow:
                "0 0 0 9999px rgba(0, 0, 0, 0.72), 0 0 24px rgba(56, 189, 248, 0.35)",
            }}
        />
        )}
      <div
        className={`fixed inset-0 z-[202] pointer-events-auto ${
            targetRect
            ? ""
            : "flex items-center justify-center bg-black/75 px-4"
        }`}
        >
        <div
            className={`pointer-events-auto overflow-hidden rounded-2xl border border-sky-400/25 bg-[#050b15] shadow-2xl ${
                targetRect
                ? "fixed"
                : "w-full max-w-xl"
            }`}
            style={
                targetRect
                ? guidePanelStyle
                : undefined
            }
            >

          {/* HEADER */}
          <div className="border-b border-white/[0.07] px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300/60">
                {step.section} · {sectionStepNumber} / {sectionStepCount}
                </div>

                <div className="mt-1 text-lg font-black text-white">
                {step.title}
                </div>
              </div>

              <div className="shrink-0 text-xs font-black text-blue-100/35">
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="px-6 py-7">
            <p className="mt-3 text-sm leading-6 text-blue-100/55">
              {step.description}
            </p>

          </div>

          {/* PROGRESS */}
          <div className="px-6">
            <div className="flex gap-2">
              {guideSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 flex-1 rounded-full ${
                    index <= stepIndex
                      ? "bg-sky-400"
                      : "bg-white/[0.08]"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* FOOTER */}
          <div className="mt-6 flex items-center justify-between border-t border-white/[0.07] px-6 py-4">
            <button
              type="button"
              onClick={onComplete}
              className="text-xs font-bold text-blue-100/35 transition hover:text-white"
            >
              Skip Guide
            </button>

            <div className="flex gap-2">
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={() => {
                    const previousIndex = stepIndex - 1

                    setStepIndex(previousIndex)
                    onNavigate(
                        guideSteps[previousIndex].page
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
                  onClick={onComplete}
                  className="rounded-lg border border-sky-400/30 bg-sky-500/15 px-5 py-2 text-sm font-black text-sky-100 transition hover:bg-sky-500/25"
                >
                  Finish
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const nextIndex = stepIndex + 1

                    setStepIndex(nextIndex)
                    onNavigate(
                        guideSteps[nextIndex].page
                    )
                    }}
                  className="rounded-lg border border-sky-400/30 bg-sky-500/15 px-5 py-2 text-sm font-black text-sky-100 transition hover:bg-sky-500/25"
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

export default ProfileGuide
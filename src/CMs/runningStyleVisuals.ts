import type { CSSProperties } from "react"
import type { RunningStyle } from "../types/types"
import { umaStyleClasses } from "../data/cmData"
import { RUNNING_STYLE_LABELS } from "./cmParticipantConfiguration"

type RunningStyleVisual = {
  label: string
  abbreviation: string
  surfaceClassName: string
  style: CSSProperties
}

function visual(style: RunningStyle, abbreviation: string, rgb: string, colorToken: string): RunningStyleVisual {
  return { label: RUNNING_STYLE_LABELS[style], abbreviation,
    surfaceClassName: umaStyleClasses[RUNNING_STYLE_LABELS[style]],
    style: { "--participant-style-rgb": rgb, "--participant-style-color": `var(${colorToken})` } as CSSProperties }
}

/** Shared by historical cards, log cells, and configuration badges. */
export const runningStyleVisuals: Record<RunningStyle, RunningStyleVisual> = {
  runaway: visual("runaway", "RW", "167 139 250", "--color-violet-400"),
  front_runner: visual("front_runner", "FR", "96 165 250", "--color-blue-400"),
  pace_chaser: visual("pace_chaser", "PC", "52 211 153", "--color-emerald-400"),
  late_surger: visual("late_surger", "LS", "251 146 60", "--color-amber-400"),
  end_closer: visual("end_closer", "EC", "248 113 113", "--color-rose-400"),
}

const unknownStyleVisual: RunningStyleVisual = {
  label: "Unknown style", abbreviation: "",
  surfaceClassName: umaStyleClasses[""],
  style: { "--participant-style-rgb": "148 163 184", "--participant-style-color": "var(--color-gray-400)" } as CSSProperties,
}

export function getRunningStyleVisual(style: RunningStyle | null) {
  return style === null ? unknownStyleVisual : runningStyleVisuals[style]
}

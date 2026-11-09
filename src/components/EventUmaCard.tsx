import type { ReactNode } from "react"
import type { CMParticipantConfiguration, UmaVersion } from "../types/types"
import { getRunningStyleVisual } from "../CMs/runningStyleVisuals"
import ParticipantConfigurationBadges from "../CMs/ParticipantConfigurationBadges"
import UmaAvatarImage from "./UmaAvatarImage"

type Props = {
  configuration: CMParticipantConfiguration
  version?: UmaVersion
  name: string
  primaryStat: ReactNode
  secondaryStat?: ReactNode
  supportingText?: ReactNode
  primaryStatKey?: string
  tone?: "cm" | "loh"
  variant?: "compact" | "selection"
  showName?: boolean
  showRunningStyle?: boolean
  current?: boolean
  portraitClassName?: string
  portraitDecoration?: ReactNode
  accessibleSummary?: ReactNode
}

/** CM Umas' compact portrait, roles and stat badge, shared with other events. */
export default function EventUmaCard({ configuration, version, name, primaryStat, secondaryStat, supportingText, primaryStatKey = "win-rate", tone = "cm", variant = "compact", showName = false, showRunningStyle = false, current, portraitClassName = "", portraitDecoration, accessibleSummary }: Props) {
  const visual = getRunningStyleVisual(configuration.runningStyle)
  const hasRoles = configuration.ace === true || configuration.debuffer === true || configuration.entrySource === "autorun"
  return <div className="flex w-28 max-w-full flex-col items-center">
    <div style={visual.style} className={`cm-participant-portrait participant-style-surface relative flex h-22 w-22 max-w-full items-center justify-center overflow-hidden rounded-[10px] border ${visual.surfaceClassName} transition ${portraitClassName}`}>
      {version?.avatar ? <UmaAvatarImage avatar={version.avatar} alt={name} className="h-full w-full object-contain" />
        : <div className="flex h-full w-full items-center justify-center bg-gray-900/70 text-3xl text-gray-500">?</div>}
      {portraitDecoration}
    </div>
    {variant !== "selection" && (hasRoles || showName || showRunningStyle) && <div className="mt-1 flex min-h-4 max-w-full flex-wrap items-center justify-center gap-1">
      <ParticipantConfigurationBadges configuration={configuration} compact showRunningStyle={showRunningStyle} autoRunLabel="Auto" />
    </div>}
    {showName && <p className="mt-2 line-clamp-2 min-h-7 w-full break-words text-center text-[10px] font-bold leading-tight text-white sm:text-[11px]">{name}</p>}
    {current !== undefined && <span className="mt-0.5 min-h-3 text-[8px] font-black uppercase tracking-wider text-rose-300/70">{current ? "Current" : "\u00a0"}</span>}
    {supportingText !== undefined && <p className="mt-2 w-full text-center text-[10px] font-medium leading-snug text-blue-100/55 [overflow-wrap:anywhere]">{supportingText}</p>}
    <div className={`mt-2 max-w-full whitespace-nowrap rounded-md border border-white/[0.06] bg-white/[0.025] py-1 font-black ${variant === "selection" ? "px-2 text-xs" : "px-1 text-[10px] sm:px-2 sm:text-xs"} ${tone === "loh" ? "text-rose-100" : "text-blue-100/75"}`} data-participant-stat={primaryStatKey}>
      {primaryStat}
    </div>
    {secondaryStat !== undefined && <p className="mt-1 text-[10px] font-bold tabular-nums text-slate-400">{secondaryStat}</p>}
    <span className="sr-only">{accessibleSummary ?? name}</span>
  </div>
}

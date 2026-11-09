import type { ReactNode } from "react"
import type { UmaVersion } from "../../types/types"
import { umaStyleClasses } from "../../data/cmData"
import { getRunningStyleLabel } from "../../CMs/cmParticipantConfiguration"
import type { ParticipantConfigurationInput } from "../../CMs/cmParticipantConfiguration"
import UmaAvatarImage from "../UmaAvatarImage"

type Props = {
  theme?: "cm" | "loh"
  participant?: ParticipantConfigurationInput
  version?: UmaVersion
  highlightWinner?: boolean
  decoration?: ReactNode
  size?: "card" | "result"
}

export default function EventUmaTile({ theme = "cm", participant, version, highlightWinner = false, decoration, size = "card" }: Props) {
  const isLoH = theme === "loh"
  const isResult = size === "result"
  const sizeClass = isResult ? "h-[140px] w-full min-w-0 sm:h-[200px]" : isLoH ? "h-20 w-full max-w-[150px] min-w-0 sm:h-[110px] xl:h-[150px] xl:w-[150px] xl:shrink-0" : "h-[150px] w-[150px] shrink-0"
  if (!participant) return <div aria-label="Empty lineup slot" className={`flex items-center justify-center rounded-xl border border-dashed text-2xl font-black ${sizeClass} ${isLoH ? "border-rose-300/15 bg-rose-300/[0.015] text-rose-100/15" : "border-cyan-300/15 bg-cyan-300/[0.015] text-cyan-100/15"}`}>?</div>
  const name = version?.displayName ?? participant.umaId
  return <div data-lineup-participant={participant.umaId} className={`relative flex flex-col overflow-hidden rounded-xl border shadow-md ${sizeClass} ${umaStyleClasses[getRunningStyleLabel(participant.runningStyle)]} ${highlightWinner ? "ring-2 ring-yellow-400 ring-offset-1 ring-offset-gray-950" : ""}`}>
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-red-900/20 via-transparent to-black/20" />
      <div className="absolute inset-0 overflow-hidden">
        {version?.avatar ? <UmaAvatarImage avatar={version.avatar} alt={name} className="absolute inset-0 h-full w-full origin-top scale-[1.65] object-contain object-top" /> : <div className="flex h-full items-center justify-center text-2xl font-black text-gray-600">?</div>}
      </div>
      {decoration}
      {(participant.debuffer || participant.autoRun) && <div className="absolute right-1 top-1 z-30 flex flex-col gap-0.5">
        {participant.debuffer && <span className="flex h-4 w-4 items-center justify-center rounded bg-black/65 text-[9px]" title="Debuffer">🟥</span>}
        {participant.autoRun && <span className="flex h-4 w-4 items-center justify-center rounded bg-black/65 text-[9px]" title="AutoRun">🤖</span>}
      </div>}
    </div>
    <div className={`relative z-20 flex items-center justify-center border-t border-white/10 bg-black/25 px-2 py-1 text-center ${isLoH && !isResult ? "min-h-6 xl:min-h-[38px]" : "min-h-[38px]"}`}>
      <div className={`line-clamp-2 break-words font-black leading-[1.05] text-white ${isResult ? "text-[10px] sm:text-xs" : "text-[11px]"}`} title={name}>
        {participant.ace && <span className="mr-1 text-yellow-300">★</span>}{name}
      </div>
    </div>
  </div>
}

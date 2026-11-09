import { useId, useState } from "react"
import type { MouseEvent, FocusEvent } from "react"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import EventUmaCard from "../components/EventUmaCard"
import UmaAvatarImage from "../components/UmaAvatarImage"
import ParticipantConfigurationBadges from "../CMs/ParticipantConfigurationBadges"
import CMFinalPlacementBadge from "../CMs/CMFinalPlacementBadge"
import { snapshotParticipantConfiguration } from "../CMs/cmParticipantConfiguration"
import { getRunningStyleVisual } from "../CMs/runningStyleVisuals"
import { getLoHConfigurationKey } from "./configurations"
import type { getLoHConfigurationStats } from "./progress"
import type { LoHExtraStagePlacement, LoHLineupMember } from "./types"
import { formatLoHNumber } from "./format"

type Props = {
  uma: LoHLineupMember
  stats?: ReturnType<typeof getLoHConfigurationStats>[number]
  overallStats: { eventNumber: number; races: number; wins: number; rawPoints: number | null }
  placement?: LoHExtraStagePlacement
  selection?: { selected: boolean; locked: boolean; onToggle: () => void }
  showName?: boolean
  showRunningStyle?: boolean
  showPoints?: boolean
}

/** The same compact portrait, badges, WR and bounded preview used by CM Umas. */
export default function LoHParticipantTile({ uma, stats, overallStats, placement, selection, showName = false, showPoints = false, showRunningStyle = selection !== undefined }: Props) {
  const { versions } = useUmaDatabase()
  const version = versions.find(item => item.id === uma.umaId)
  const name = version?.displayName ?? uma.umaId
  const configuration = snapshotParticipantConfiguration(uma)
  const visual = getRunningStyleVisual(configuration.runningStyle)
  const winner = placement === "first" || stats?.extraStagePlacement === "first"
  const key = getLoHConfigurationKey(uma)
  const races = stats?.races ?? 0, wins = stats?.wins ?? 0, winRate = stats?.winRate ?? 0
  const overallWinRate = overallStats.races > 0 ? overallStats.wins / overallStats.races * 100 : null
  const previewId = useId()
  const [preview, setPreview] = useState<{ left: number; top: number; width: number; above: boolean } | null>(null)

  function showPreview(element: HTMLDivElement) {
    if (selection) return
    const bounds = element.getBoundingClientRect()
    const modal = element.closest("dialog")?.getBoundingClientRect()
    const leftEdge = Math.max(12, (modal?.left ?? 0) + 12)
    const rightEdge = Math.min(window.innerWidth - 12, (modal?.right ?? window.innerWidth) - 12)
    const width = Math.min(520, rightEdge - leftEdge)
    const above = window.innerHeight - bounds.bottom < 230
    setPreview({ width, left: Math.max(leftEdge, Math.min(bounds.left + bounds.width / 2 - width / 2, rightEdge - width)), top: above ? bounds.top - 12 : bounds.bottom + 12, above })
  }
  const enter = (change: MouseEvent<HTMLDivElement> | FocusEvent<HTMLDivElement>) => showPreview(change.currentTarget)
  return <div style={visual.style} data-loh-uma={uma.umaId} data-loh-configuration={key} data-loh-candidate-key={selection ? key : undefined}
    data-participant-races={races} data-participant-wins={wins} data-participant-raw-points={stats?.rawPoints ?? ""} data-participant-win-rate={winRate}
    className={`cm-participant-tile group relative w-28 max-w-full min-w-0 pt-5 ${selection?.locked ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
    role="button" tabIndex={0} aria-label={selection ? `Select ${name} [${visual.abbreviation || visual.label}] for Extra Stage` : `${name}, ${visual.label}. View configuration details`}
    aria-pressed={selection?.selected} aria-disabled={selection?.locked} aria-expanded={selection ? undefined : preview !== null} aria-describedby={preview ? previewId : undefined}
    onMouseEnter={enter} onMouseLeave={() => setPreview(null)} onFocus={enter} onBlur={() => setPreview(null)}
    onClick={change => { if (selection) { if (!selection.locked) selection.onToggle() } else showPreview(change.currentTarget) }}
    onKeyDown={change => { if (change.key === "Escape") setPreview(null); if (change.key === "Enter" || change.key === " ") { change.preventDefault(); if (selection) { if (!selection.locked) selection.onToggle() } else if (preview) setPreview(null); else showPreview(change.currentTarget) } }}>
    <CMFinalPlacementBadge placement={placement} location="lineup" />
    {winner && <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2"><svg viewBox="0 0 32 24" className="h-5 w-7 text-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]" fill="currentColor" aria-hidden="true"><path d="M4 19h24l2-12-7 5-7-9-7 9-7-5 2 12Zm2 2h20v2H6v-2Z" /></svg></div>}
    <EventUmaCard configuration={configuration} version={version} name={name} tone="loh" primaryStat={`${winRate.toFixed(2)}% WR`}
      showName={showName} showRunningStyle={showRunningStyle}
      supportingText={showPoints ? <span data-loh-raw-points className="inline-flex max-w-full flex-wrap items-baseline justify-center gap-x-1 rounded-md border border-amber-300/20 bg-amber-300/[0.08] px-1.5 py-1 tabular-nums">
        <span className="min-w-0 text-sm font-black leading-tight text-amber-200">{stats?.rawPoints === null ? "—" : formatLoHNumber(stats?.rawPoints ?? 0)}</span>
        <span className="text-[10px] font-bold text-amber-100/70">PT</span>
      </span> : undefined}
      portraitClassName={winner ? "ring-1 ring-yellow-300/80 shadow-[0_0_12px_rgba(250,204,21,0.16)]" : selection?.selected ? "ring-1 ring-rose-300/80 shadow-[0_0_12px_rgba(251,113,133,0.14)]" : ""}
      portraitDecoration={selection?.selected && <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-rose-200/40 bg-rose-500/90 text-[11px] font-black text-white" aria-hidden="true">✓</span>}
      accessibleSummary={`${name}. ${visual.label}. Races: ${races}. Wins: ${wins}. Raw points: ${stats?.rawPoints ?? "unknown"}.`} />
    {preview && !selection && <div id={previewId} role="tooltip" data-loh-participant-preview className="cm-participant-preview fixed z-300 cursor-default"
      ref={element => {
        if (!element) return
        const bounds = element.getBoundingClientRect()
        const modal = element.closest("dialog")?.getBoundingClientRect()
        const topEdge = Math.max(12, (modal?.top ?? 0) + 12)
        const bottomEdge = Math.min(window.innerHeight - 12, (modal?.bottom ?? window.innerHeight) - 12)
        const top = Math.max(topEdge, Math.min(bounds.top, bottomEdge - bounds.height))
        if (top !== bounds.top) { element.style.top = `${top}px`; element.style.transform = "none" }
      }}
      style={{ left: preview.left, top: preview.top, width: preview.width, transform: preview.above ? "translateY(-100%)" : undefined }}>
      <div className={`participant-style-surface relative overflow-hidden rounded-xl border ${visual.surfaceClassName} shadow-[0_20px_55px_rgba(0,0,0,0.65)] backdrop-blur-xl`}>
        <div className="flex gap-4 p-4 max-sm:gap-3">
          <div style={{ background: "#050D1B" }} className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border max-sm:h-16 max-sm:w-16 ${visual.surfaceClassName}`}><UmaAvatarImage avatar={version?.avatar ?? ""} alt="" className="h-full w-full object-contain" /></div>
          <div className="min-w-0 flex-1"><p className="text-lg font-black leading-tight text-white [overflow-wrap:anywhere]">{name}</p>
            <p className="mt-0.5 text-xs font-bold" style={{ color: "var(--participant-style-color)" }} data-participant-preview-style>{visual.label}</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <div className="min-w-0 max-w-full"><ParticipantConfigurationBadges configuration={configuration} showRunningStyle={false} />
                <p className="mt-2 text-[11px] leading-5 text-blue-100/60">Raw PT: {stats?.rawPoints == null ? "—" : formatLoHNumber(stats.rawPoints)} · Avg place: {stats?.averagePlacement == null ? "—" : stats.averagePlacement.toFixed(2)}</p>
                {stats?.participatedInExtraStage && <p className="mt-1 text-[10px] font-black text-rose-200">SUPER HERO</p>}
              </div>
              <div data-loh-uma-overall className="max-w-full text-[11px] font-medium leading-4 text-blue-100/60 [overflow-wrap:anywhere] sm:ml-auto">
                <p>Overall Stats in LoH{overallStats.eventNumber}:</p>
                <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-3 tabular-nums">
                  <dt>WR:</dt><dd className="text-right">{overallWinRate === null ? "—" : `${overallWinRate.toFixed(2)}%`}</dd>
                  <dt>Wins:</dt><dd className="text-right">{formatLoHNumber(overallStats.wins)}</dd>
                  <dt>Races:</dt><dd className="text-right">{formatLoHNumber(overallStats.races)}</dd>
                  <dt>Raw PT:</dt><dd className="text-right">{overallStats.rawPoints === null ? "—" : formatLoHNumber(overallStats.rawPoints)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-3 border-t border-white/[0.07]">
          {[["Wins", wins], ["Races", races], ["Win Rate", `${winRate.toFixed(2)}%`]].map(([label, value], index) => <div key={label} className={`px-3 py-2.5 text-center ${index === 1 ? "border-x border-white/[0.07]" : ""}`}>
            <dt className="text-[9px] font-black uppercase tracking-[0.12em] text-blue-100/30">{label}</dt>
            <dd className={`mt-0.5 text-sm font-black ${index === 2 ? "text-cyan-100" : "text-white"}`}>{value}</dd>
          </div>)}
        </dl>
      </div>
    </div>}
  </div>
}

import { formatTrackLength } from "../formatting"
import { Fragment } from "react"
import type { KeyboardEvent } from "react"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import { getTrackImage } from "../data/trackData"
import { umaStyleClasses } from "../data/cmData"
import { getRunningStyleLabel } from "../CMs/cmParticipantConfiguration"
import CMFinalPlacementBadge from "../CMs/CMFinalPlacementBadge"
import UmaAvatarImage from "../components/UmaAvatarImage"
import LoHCardActions from "./LoHCardActions"
import LoHRank from "./LoHRank"
import { LOH_EVENT_RANDOM } from "./constants"
import { getLoHExtraStageOutcome } from "./extraStage"
import { formatLoHNumber } from "./format"
import { getLoHCardLineup } from "./overview"
import { getLoHRankFromScore } from "./ranks"
import type { LoH } from "./types"

type Props = { event: LoH; compact?: boolean; onOpen: () => void; onEdit: () => void; onNotes: () => void; onDelete: () => void }

export default function LoHCardMobile({ event, compact = false, onOpen, onEdit, onNotes, onDelete }: Props) {
  const { versions } = useUmaDatabase()
  const lineup = getLoHCardLineup(event)
  const trackImage = getTrackImage(event.racecourse)
  const rank = getLoHRankFromScore(event.leagueScore)
  const outcome = getLoHExtraStageOutcome(event)
  const status = event.completed ? outcome === "winner" ? "Extra Stage Winner" : outcome === "participated" ? "Extra Stage Participant" : "Completed" : "In progress"
  const overall = event.overallRank == null ? "—" : `#${formatLoHNumber(event.overallRank)}`
  const score = <>{formatLoHNumber(event.leagueScore ?? 0)} <span className="text-[9px] text-rose-200/60">PT</span></>
  const cardProps = {
    role: "button", tabIndex: 0, "data-event-card": "loh", "data-loh-mobile": true,
    "data-loh-view": compact ? "compact" : "detailed",
    "aria-label": `Open LOH${event.number}: ${event.name}`,
    onClick: onOpen,
    onKeyDown: (change: KeyboardEvent<HTMLDivElement>) => {
      if (change.target === change.currentTarget && (change.key === "Enter" || change.key === " ")) {
        change.preventDefault()
        onOpen()
      }
    },
  }
  const portraits = Array.from({ length: 3 }, (_, index) => {
    const uma = lineup[index]
    const version = versions.find(item => item.id === uma?.umaId)
    const name = version?.displayName ?? uma?.umaId ?? "Empty lineup slot"
    const placement = uma?.extraStagePlacement
    const points = uma?.rawPoints == null ? "—" : formatLoHNumber(uma.rawPoints)
    const pointsLabel = `${uma?.rawPoints == null ? "Unknown" : points} raw points`
    return <div key={uma?.umaId ?? `empty-${index}`} data-lineup-participant={uma?.umaId} className={compact ? "w-10 shrink-0" : "min-w-0"} title={name}>
      {compact && uma && <p aria-label={pointsLabel} className="mb-1 whitespace-nowrap text-center text-[8px] font-black tabular-nums leading-none text-amber-200">{points} PT</p>}
      <div aria-label={!uma ? name : undefined}
        className={`relative overflow-hidden rounded-lg border ${compact ? "h-10 w-10" : "aspect-square"} ${uma ? umaStyleClasses[getRunningStyleLabel(uma.runningStyle)] : "flex items-center justify-center border-dashed border-rose-300/15 bg-rose-300/[0.015] text-rose-100/15"} ${placement === "first" ? "ring-2 ring-yellow-400" : ""}`}>
        {version?.avatar ? <UmaAvatarImage avatar={version.avatar} alt={name} className="h-full w-full bg-black/20 object-contain" />
          : <div className="flex h-full items-center justify-center font-black text-white/30">?</div>}
        {compact ? <CMFinalPlacementBadge placement={placement} location="compact-card" /> : uma &&
          <div className="loh-card-uma-result absolute left-1 top-1 z-40 flex flex-col items-start gap-1">
            <span aria-label={pointsLabel} className="whitespace-nowrap rounded border border-amber-200/40 bg-gray-950/90 px-1 py-0.5 text-[9px] font-black tabular-nums leading-none text-amber-100 shadow-md">{points} PT</span>
            <CMFinalPlacementBadge placement={placement} location="card" />
          </div>}
        {compact && uma?.ace && <span title="Ace" className="absolute bottom-0 left-0 flex h-4 w-4 items-center justify-center rounded-tr bg-black/70 text-[9px] text-yellow-300">★</span>}
        {(uma?.debuffer || uma?.autoRun) && <div className={`absolute right-1 flex flex-col gap-0.5 ${compact ? "bottom-0.5" : "top-1"}`}>
          {uma.debuffer && <span title="Debuffer" className={`flex items-center justify-center rounded bg-black/70 ${compact ? "h-3 w-3 text-[7px]" : "h-4 w-4 text-[9px]"}`}>🟥</span>}
          {uma.autoRun && <span title="AutoRun" className={`flex items-center justify-center rounded bg-black/70 ${compact ? "h-3 w-3 text-[7px]" : "h-4 w-4 text-[9px]"}`}>🤖</span>}
        </div>}
      </div>
      {!compact && uma && <div className="mt-1 min-h-[2.25rem] text-center"><p className="line-clamp-2 break-words text-[11px] font-bold leading-tight text-white">{uma.ace && <span title="Ace" className="mr-1 text-yellow-300">★</span>}{name}</p></div>}
    </div>
  })
  const actions = <LoHCardActions event={event} onEdit={onEdit} onNotes={onNotes} onDelete={onDelete} compact={compact} />

  if (compact) return <div {...cardProps} className="mb-2 flex cursor-pointer gap-3 rounded-xl border border-rose-900/70 bg-gray-950/90 px-3 py-3 shadow-md transition hover:border-rose-400/50 focus-visible:outline-2 focus-visible:outline-rose-300">
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-400">LoH{event.number}</p><p className="truncate text-base font-black text-white">{event.name || "Unnamed LoH"}</p></div>
        <div className="shrink-0 text-right"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-500">League Score</p><p className="text-sm font-black tabular-nums text-white">{score}</p></div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] font-semibold text-gray-400">
        {[event.racecourse || "—", event.surface ?? "—", event.distance == null ? "—" : `${event.distance}m`, formatTrackLength(event.length ?? "—")].map((value, index) => <Fragment key={index}>{index > 0 && <span aria-hidden="true" className="text-rose-700">•</span>}<span>{value}</span></Fragment>)}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-2">
        <div aria-label="LoH team lineup" className="flex items-start gap-1.5">{portraits}</div>
        <div className="min-w-0 text-right [&_[data-loh-rank]]:items-end [&_[data-loh-rank]>span:first-child]:text-[10px]">
          <p className="mb-1 text-[9px] font-black uppercase tracking-[0.12em] text-gray-500">League Rank</p><LoHRank rank={rank} />
          <p className={`mt-1 text-[9px] font-bold ${outcome === "winner" ? "text-amber-200" : "text-rose-200/60"}`} title={status}>{outcome === "winner" && "🏆 "}{event.overallRank == null ? status : overall}</p>
        </div>
      </div>
    </div>
    <div className="flex shrink-0 flex-col justify-center gap-1.5 border-l border-white/10 pl-2">{actions}</div>
  </div>

  return <div {...cardProps} className="relative mb-3 w-full cursor-pointer overflow-hidden rounded-xl border border-rose-400/50 bg-gray-950 text-left shadow-[0_0_14px_rgba(244,63,94,0.16)] focus-visible:outline-2 focus-visible:outline-rose-300">
    {trackImage ? <img src={trackImage} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-70" /> : <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rose-950 via-rose-950 to-pink-950" />}
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gray-950/20 via-gray-950/45 to-gray-950/90" />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gray-950/65 via-transparent to-gray-950/30" />
    <div className="relative z-10 px-4 pb-4 pt-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-400">League of Heroes</p><p className="mt-1 line-clamp-2 break-words text-2xl font-black leading-tight tracking-tight text-white drop-shadow-lg">{event.name || "Unnamed LoH"}</p></div>
        <div className="shrink-0 rounded-xl border border-rose-400/40 bg-rose-950/80 px-3 py-2 text-center shadow-lg backdrop-blur-sm"><p className="text-[9px] font-black uppercase tracking-[0.12em] text-rose-300/70">LoH</p><p className="mt-0.5 text-2xl font-black leading-none text-rose-300">{event.number}</p></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="max-w-full break-words rounded-lg border border-rose-700/70 bg-gray-950/80 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">{event.racecourse || "—"}</span>
        <span className={`rounded-lg px-3 py-1.5 text-sm font-black ${event.surface === "Turf" ? "bg-emerald-800/90 text-emerald-100" : event.surface === "Dirt" ? "bg-amber-800/90 text-amber-100" : "bg-gray-950/80 text-gray-300"}`}>{event.surface ?? "—"}</span>
        <span className="rounded-lg border border-rose-700/70 bg-gray-950/80 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">{event.distance == null ? "—" : `${event.distance}m`}</span>
        <span className="rounded-lg border border-rose-700/70 bg-gray-950/80 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">{formatTrackLength(event.length ?? "—")}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-gray-200">
        {[event.direction ?? "—", LOH_EVENT_RANDOM, event.season ?? "—", LOH_EVENT_RANDOM].map((value, index) => <Fragment key={index}>{index > 0 && <span aria-hidden="true" className="text-rose-500/60">•</span>}<span>{value}</span></Fragment>)}
      </div>
    </div>
    <div className="relative z-10 mt-1 border-t border-white/15 bg-gray-950/80 px-4 pb-4 pt-3 backdrop-blur-sm">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-300">Team Lineup</p>
      <div aria-label="LoH team lineup" className="grid grid-cols-3 gap-2">{portraits}</div>
    </div>
    <div className="relative z-10 border-t border-white/10 bg-gray-950/90 px-4 py-3">
      <dl className="grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-rose-900/60 bg-rose-950/20">
        <div className="min-w-0 px-2 py-2.5"><dt className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-500">League Score</dt><dd className="mt-1 text-lg font-black tabular-nums text-white min-[400px]:text-xl">{score}</dd><dd className={`mt-0.5 text-[10px] font-bold ${outcome === "winner" ? "text-amber-200" : "text-gray-500"}`}>{status}</dd></div>
        <div className="min-w-0 px-2 py-3 text-center [&_[data-loh-rank]>span:first-child]:text-[10px]"><dt className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-500">League Rank</dt><dd className="mt-2"><LoHRank rank={rank} /></dd></div>
        <div className="min-w-0 px-2 py-3 text-center"><dt className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-500">Overall Rank</dt><dd className="mt-1 text-xl font-black tabular-nums text-rose-100">{overall}</dd></div>
      </dl>
    </div>
    <div className="relative z-10 flex items-center justify-end gap-2 border-t border-white/10 bg-gray-950/95 px-4 py-2.5">{actions}</div>
  </div>
}

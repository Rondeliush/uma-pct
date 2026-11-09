import { formatTrackLength } from "../formatting"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UmaAvatarImage from "../components/UmaAvatarImage"
import ParticipantConfigurationBadges from "../CMs/ParticipantConfigurationBadges"
import CMFinalPlacementBadge from "../CMs/CMFinalPlacementBadge"
import { snapshotParticipantConfiguration } from "../CMs/cmParticipantConfiguration"
import { getRunningStyleVisual } from "../CMs/runningStyleVisuals"
import { getLoHCardLineup } from "./overview"
import { getLoHRankFromScore } from "./ranks"
import { formatLoHNumber } from "./format"
import LoHRank from "./LoHRank"
import LoHCardActions from "./LoHCardActions"
import LoHCardMobile from "./LoHCardMobile"
import type { LoH } from "./types"

type Props = { event: LoH; mobile: boolean; onOpen: () => void; onEdit: () => void; onNotes: () => void; onDelete: () => void }

export default function LoHCompactCard(props: Props) {
  return props.mobile ? <LoHCardMobile {...props} compact /> : <LoHCompactCardDesktop {...props} />
}

function LoHCompactCardDesktop({ event, onOpen, onEdit, onNotes, onDelete }: Props) {
  const { versions } = useUmaDatabase()
  const lineup = getLoHCardLineup(event)
  const avatars = <div className="flex items-start gap-2" aria-label="LoH team lineup">{Array.from({ length: 3 }, (_, index) => {
    const uma = lineup[index], version = versions.find(item => item.id === uma?.umaId)
    const configuration = snapshotParticipantConfiguration(uma)
    const visual = getRunningStyleVisual(configuration.runningStyle)
    const placement = uma?.extraStagePlacement
    return <div key={index} className="flex w-10 shrink-0 flex-col items-center" title={version?.displayName ?? uma?.umaId ?? "Empty lineup slot"}>
      {uma && <p className="mb-1 whitespace-nowrap text-[8px] font-black tabular-nums leading-none text-amber-200"
        aria-label={`${uma.rawPoints === null ? "Unknown" : formatLoHNumber(uma.rawPoints)} raw points`}>
        {uma.rawPoints === null ? "\u2014" : formatLoHNumber(uma.rawPoints)} PT
      </p>}
      <div style={visual.style} className={`participant-style-surface relative flex h-10 w-10 items-center justify-center rounded-md border ${visual.surfaceClassName} ${placement === "first" ? "ring-2 ring-yellow-400" : ""}`}>
        {version?.avatar ? <UmaAvatarImage avatar={version.avatar} alt={version.displayName} className="h-full w-full rounded-md bg-black/20 object-contain" /> : <span className="text-sm font-bold text-white/30">?</span>}
        <CMFinalPlacementBadge placement={placement} location="compact-card" />
      </div>
      <div className="mt-1 flex max-w-full flex-wrap justify-center gap-0.5"><ParticipantConfigurationBadges configuration={configuration} compact showRunningStyle={false} autoRunLabel="Auto" /></div>
    </div>
  })}</div>
  const actions = <div className="flex items-center justify-end gap-1"><LoHCardActions event={event} onEdit={onEdit} onNotes={onNotes} onDelete={onDelete} compact /></div>
  const overall = event.overallRank === null ? "—" : `#${formatLoHNumber(event.overallRank)}`
  return <div data-event-card="loh" data-loh-view="compact" role="button" tabIndex={0} aria-label={`Open LOH${event.number}: ${event.name}`} onClick={onOpen} onKeyDown={change => { if (change.target === change.currentTarget && (change.key === "Enter" || change.key === " ")) { change.preventDefault(); onOpen() } }}
    className="loh-compact-grid mb-2 min-h-20 cursor-pointer rounded-lg border border-rose-900/70 bg-gray-950/90 px-4 py-2 shadow-md transition hover:border-rose-400/50 hover:bg-gray-900/95 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-rose-300">
      <span className="text-sm font-bold text-rose-400">LoH{event.number}</span><span className="truncate text-sm font-semibold text-white">{event.name || "Unnamed LoH"}</span><span className="truncate text-sm text-gray-300">{event.racecourse || "—"}</span><span className="text-sm text-gray-300">{formatTrackLength(event.length ?? "—")}</span>
      <span className="text-sm font-black tabular-nums text-white">{formatLoHNumber(event.leagueScore)} <span className="text-[9px] text-rose-200/60">PT</span></span><LoHRank rank={getLoHRankFromScore(event.leagueScore)} /><span className="text-sm font-bold tabular-nums text-gray-300">{overall}</span>{avatars}{actions}
  </div>
}

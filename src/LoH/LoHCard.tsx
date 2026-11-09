import { useUmaDatabase } from "../context/UmaDatabaseContext"
import type { LoH } from "./types"
import EventCardLayout from "../components/event-card/EventCardLayout"
import EventCardBadge from "../components/event-card/EventCardBadge"
import EventCardInfo from "../components/event-card/EventCardInfo"
import EventCardLineup from "../components/event-card/EventCardLineup"
import EventUmaTile from "../components/event-card/EventUmaTile"
import { formatLoHNumber } from "./lohData"
import LoHRank from "./LoHRank"
import { getLoHRankFromScore } from "./ranks"
import { LOH_EVENT_RANDOM } from "./constants"
import { getLoHExtraStageOutcome } from "./extraStage"
import LoHCardActions from "./LoHCardActions"
import CMFinalPlacementBadge from "../CMs/CMFinalPlacementBadge"
import { getLoHCardLineup } from "./overview"

type Props = { event: LoH; onOpen: () => void; onEdit: () => void; onNotes: () => void; onDelete: () => void }

export default function LoHCard({ event, onOpen, onEdit, onNotes, onDelete }: Props) {
  const { versions } = useUmaDatabase()
  const extraOutcome = getLoHExtraStageOutcome(event)
  const lineup = getLoHCardLineup(event)

  return (
    <div className="group">
      <EventCardLayout theme="loh" onOpen={onOpen}>
        <EventCardBadge theme="loh" number={event.number} leagueLabel="LEAGUE" />
        <EventCardInfo
          theme="loh" name={event.name || `League of Heroes #${event.number}`}
          racecourse={event.racecourse} surface={event.surface} distance={event.distance}
          length={event.length} direction={event.direction} weather={LOH_EVENT_RANDOM}
          season={event.season} condition={LOH_EVENT_RANDOM}
          status={<span className={`font-bold ${event.completed && extraOutcome === "winner" ? "text-amber-200" : "text-rose-300"}`}>{event.completed ? extraOutcome === "winner" ? "EXTRA STAGE WINNER" : extraOutcome === "participated" ? "EXTRA STAGE PARTICIPANT" : "Completed" : "In progress"}</span>}
        />
        <EventCardLineup theme="loh">
          {Array.from({ length: 3 }, (_, index) => {
            const participant = lineup[index]
            const placement = participant?.extraStagePlacement
            const points = participant?.rawPoints == null ? "\u2014" : formatLoHNumber(participant.rawPoints)
            const pointsLabel = `${participant?.rawPoints == null ? "Unknown" : points} raw points`
            return <div key={index} className="w-full min-w-0 max-w-[150px] xl:w-[150px] xl:shrink-0">
              <EventUmaTile theme="loh" participant={participant} version={versions.find(item => item.id === participant?.umaId)}
                highlightWinner={placement === "first"}
                decoration={participant && <div className="loh-card-uma-result absolute left-1 top-1 z-40 flex flex-col items-start gap-1">
                  <span className="whitespace-nowrap rounded border border-amber-200/40 bg-gray-950/90 px-1 py-0.5 text-[10px] font-black tabular-nums leading-none text-amber-100 shadow-md" aria-label={pointsLabel}>
                    {points} PT
                  </span>
                  <CMFinalPlacementBadge placement={placement} location="card" />
                </div>} />
            </div>
          })}
        </EventCardLineup>
        <dl className="relative col-start-2 row-start-3 flex flex-col items-center justify-center gap-2 px-3 py-3 text-center sm:col-start-3 sm:row-start-1 xl:col-start-4 xl:row-start-1">
          <div className="pointer-events-none absolute left-0 top-1/2 h-[68%] w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-rose-400/80 to-transparent shadow-[0_0_8px_rgba(244,63,94,0.65)]" />
          <div>
            <dt className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-200/55">League Score</dt>
            <dd className="mt-1 whitespace-nowrap text-xl font-black tabular-nums text-white">{formatLoHNumber(event.leagueScore ?? 0)} <span className="text-[10px] text-rose-200/70">PT</span></dd>
          </div>
          <div>
            <dt className="sr-only">League Rank</dt>
            <dd><LoHRank rank={getLoHRankFromScore(event.leagueScore)} /></dd>
          </div>
          <div>
            <dt className="text-[9px] font-black uppercase tracking-wider text-gray-500">Overall Rank</dt>
            <dd className="mt-0.5 text-sm font-bold tabular-nums text-gray-300">{event.overallRank == null ? "\u2014" : `#${formatLoHNumber(event.overallRank)}`}</dd>
          </div>
        </dl>
        <div className="relative col-start-3 row-start-1 row-span-3 flex flex-col items-center justify-center gap-2 sm:col-start-4 sm:row-span-2 xl:col-start-5 xl:row-span-1">
          <div className="pointer-events-none absolute left-0 top-1/2 h-[68%] w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-rose-400/80 to-transparent shadow-[0_0_8px_rgba(244,63,94,0.65)]" />
          <LoHCardActions event={event} onEdit={onEdit} onNotes={onNotes} onDelete={onDelete} />
        </div>
      </EventCardLayout>
    </div>
  )
}

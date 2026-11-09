import { formatTrackLength } from "../formatting"
import type { Dispatch, SetStateAction } from "react"
import type { CM, UmaVersion } from "../types/types"
import { getTrackImage } from "../data/trackData"
import UmaAvatarImage from "../components/UmaAvatarImage"
import AddCMButton from "../CMs/AddCMButton"
import { formatUmaWinRate } from "../Statistics/umaStatistics"
import { getLoHRankFromScore } from "../LoH/ranks"
import { getLoHCardLineup } from "../LoH/overview"
import { formatLoHNumber } from "../LoH/lohData"
import { getRunningStyleVisual } from "../CMs/runningStyleVisuals"
import { getCMFinalResults, getParticipantRunningStyle } from "../CMs/cmParticipantConfiguration"
import { getHomeEventLineup, getHomeEventResult, getHomeEventStatus, getHomeEventTitle } from "./homeData"
import type { HomeEvent } from "./homeData"
import HomeIcon from "./HomeIcon"

type Props = { active: HomeEvent | null; lastCompleted: HomeEvent | null; versions: UmaVersion[]; cms: CM[]; setCms: Dispatch<SetStateAction<CM[]>>; onCreateLoH: () => void; onOpen: (event: HomeEvent) => void }

export default function HomeCurrentEvent({ active, lastCompleted, versions, cms, setCms, onCreateLoH, onOpen }: Props) {
  const status = active ? getHomeEventStatus(active) : null
  const track = active ? getTrackImage(active.kind === "cm" ? active.event.track : active.event.racecourse) : null
  const lineup = active ? getHomeEventLineup(active) : []
  const lohLineup = active?.kind === "loh" ? getLoHCardLineup(active.event) : []
  const cm = active?.kind === "cm" ? active.event : null
  const cmFinal = cm && cm.phase !== "attempts" ? getCMFinalResults(cm) : []
  const cmStyles = cmFinal.length ? cmFinal.flatMap(result => result.configuration.umaVersionId ? [result.configuration.runningStyle] : [])
    : cm?.currentLineup.flatMap(id => {
      const participant = cm.participants.find(uma => uma.cmUmaId === id)
      return participant ? [getParticipantRunningStyle(participant)] : []
    }) ?? []
  return <section className="home-panel home-current" data-home-current={active?.kind ?? "none"} data-tone={active?.kind ?? "home"} aria-labelledby="home-current-title" data-guide="home-competitive-record">
    {track && <img className="home-current-track" src={track} alt="" />}
    <h2 id="home-current-title" className="home-panel-heading"><span className="home-heading-slashes">//</span>{active ? "Current Event" : "No Active Event"}</h2>
    {active && status ? <div className="home-current-body">
      <div className="home-event-seal home-event-seal--simple" aria-hidden="true"><HomeIcon name={active.kind === "cm" ? "crown" : "star"} /><strong>{active.kind === "cm" ? "CM" : "LOH"}</strong></div>
      <div className="home-current-identity"><span className="home-eyebrow">{active.kind === "cm" ? "Champions Meeting" : "League of Heroes"}</span><h3>{getHomeEventTitle(active)}</h3><div className="home-course-tags">{[active.kind === "cm" ? active.event.track : active.event.racecourse, active.event.surface, active.event.distance === null ? null : `${active.event.distance.toLocaleString("en-US")} m`, active.event.length === null ? null : formatTrackLength(active.event.length)].filter(Boolean).map((text, index) => <span key={index}>{text}</span>)}</div></div>
      <div className="home-current-status"><span className="home-metric-label">Current Status</span><strong>{status.title}</strong><small>{status.detail}</small></div>
      <div className="home-current-score"><span className="home-metric-label">{active.kind === "cm" ? "Current WR" : "League Score"}</span><strong>{active.kind === "cm" ? formatUmaWinRate(status.winRate) : <>{active.event.leagueScore.toLocaleString("en-US")} <small>PT</small></>}</strong><small>{active.kind === "loh" ? `${getLoHRankFromScore(active.event.leagueScore)}${status.ticketText ? ` · Tickets: ${status.ticketText}` : ""}` : "Recorded rounds & final"}</small></div>
      <div className="home-current-lineup"><span className="home-metric-label">Lineup</span><div>{Array.from({ length: 3 }, (_, index) => {
        const version = versions.find(version => version.id === lineup[index])
        const member = lohLineup[index]
        const runningStyle = member ? member.runningStyle ?? null : cmStyles[index] ?? null
        const visual = member || index < cmStyles.length ? getRunningStyleVisual(runningStyle) : null
        return <span key={index} className={`home-lineup-avatar${visual ? ` ${visual.surfaceClassName}` : ""}`} style={visual?.style} data-running-style={visual ? runningStyle ?? "unknown" : undefined} title={version?.displayName ?? "Lineup not selected"}>
          {version?.avatar ? <UmaAvatarImage avatar={version.avatar} alt={version.displayName} /> : <span aria-label="Empty lineup slot">?</span>}
          {member && <span className="home-lineup-points" aria-label={`${member.rawPoints === null ? "Unknown" : formatLoHNumber(member.rawPoints)} raw points`}>
            {member.rawPoints === null ? "—" : formatLoHNumber(member.rawPoints)} <small>PT</small>
          </span>}
        </span>
      })}</div></div>
      <button type="button" className="home-cta" onClick={() => onOpen(active)}>Open {active.kind === "cm" ? "CM" : "LoH"}<HomeIcon name="arrow" /></button>
    </div> : <div className="home-current-empty"><div><strong>{lastCompleted ? `Last completed: ${getHomeEventTitle(lastCompleted)}` : "Start your competitive story"}</strong><p>{lastCompleted ? getHomeEventResult(lastCompleted) : "Create a Champions Meeting or League of Heroes event to get started."}</p></div><div className="home-create-actions"><AddCMButton cms={cms} setCms={setCms} /><button type="button" data-tone="loh" className="rounded-xl border border-rose-500/70 bg-gradient-to-b from-rose-950/95 to-slate-950/95 px-5 py-3 text-base font-bold text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.10),inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-rose-300 hover:from-rose-900 hover:to-rose-950 hover:text-white hover:shadow-[0_0_18px_rgba(244,63,94,0.22)]" onClick={onCreateLoH}>Add LoH</button>{lastCompleted && <button type="button" className="home-text-link" onClick={() => onOpen(lastCompleted)}>View last event</button>}</div></div>}
  </section>
}

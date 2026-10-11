import type { CM } from "../types/types"
import type { UmaCMHistoryEntry } from "./umaCMHistory"
import { formatUmaWinRate } from "./umaStatistics"
import UmaEventPanelHeader from "./UmaEventPanelHeader"
import ParticipantConfigurationBadges from "../CMs/ParticipantConfigurationBadges"
import { getRunningStyleVisual } from "../CMs/runningStyleVisuals"
import { CM_FINAL_PLACEMENT_LABELS } from "../CMs/cmFinalPlacements"
import RankingBadge from "../components/RankingBadge"
import BadgeTooltip, { BadgeTooltipGroup } from "../components/BadgeTooltip"

type Props = {
  cmHistory: UmaCMHistoryEntry[]
  unresolved: boolean
  onOpenCm: (cmNumber: CM["number"]) => void
}

const formatCount = (value: number) => value.toLocaleString("en")
const ROLE_EXPLANATIONS = {
  ace: { title: "Ace", description: "This Uma was used as an Ace during this Champions Meeting." },
  debuffer: { title: "Debuffer", description: "This Uma was used as a Debuffer during this Champions Meeting." },
  ace_debuffer: { title: "Ace + Debuffer", description: "This Uma was recorded with both Ace and Debuffer roles." },
  no_special_role: { title: "No Role", description: "No Ace or Debuffer role was assigned." },
  mixed: { title: "Mixed Roles", description: "This Uma used more than one role configuration during this Champions Meeting." },
  unknown: { title: "Unrecorded", description: "Historical role information is unavailable." },
}

/** CM-only history. Open the original saved record by its profile-local number. */
export default function UmaChampionsMeetingHistory({ cmHistory, unresolved, onOpenCm }: Props) {
  return (
    <BadgeTooltipGroup><section className="uma-statistics-panel uma-detail-history-panel" aria-labelledby="uma-detail-cm-history-title">
      <UmaEventPanelHeader
        title="Champions Meeting History"
        titleId="uma-detail-cm-history-title"
        subtitle="Competitive history of this Uma in Champions Meeting."
        note="Newest first"
      />
      {cmHistory.length > 0 ? (
        <ol className="uma-detail-events">
          {cmHistory.map((cm) => {
            const name = cm.name?.trim() || `Champions Meeting ${cm.number}`
            const venue = [cm.track, cm.surface, Number.isFinite(cm.distance) && cm.distance > 0 ? `${cm.distance} m` : null].filter(Boolean).join(" · ")
            const compactVenue = [cm.track, Number.isFinite(cm.distance) && cm.distance > 0 ? `${cm.distance}m` : null].filter(Boolean).join(" · ")
            const teamResult = cm.teamFinal ? `${cm.teamFinal.group ?? "Final"} · ${cm.teamFinal.teamPlace}` : "No Final"
            const finishExplanation = cm.umaFinish === "not_in_final"
              ? { title: "Not in Final", description: "This Uma participated in the Champions Meeting but was not selected for the Final Lineup." }
              : cm.umaFinish === "unrecorded"
                ? { title: "Uma Finish — Unrecorded", description: "This Uma participated in the Final, but her individual finishing position was not recorded in the historical data." }
                : { title: "Uma Finish", description: cm.umaFinish ? `This Uma finished ${cm.umaFinish === "fourth_or_lower" ? "4th or lower" : CM_FINAL_PLACEMENT_LABELS[cm.umaFinish]} in the Final.` : "" }
            return (
              <li key={cm.number} className="uma-detail-event uma-detail-cm-entry">
                <button type="button" className="uma-detail-cm-open" data-cm-number={cm.number} aria-label={`Open ${name} (CM ${cm.number})`} onClick={() => onOpenCm(cm.number)}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7" /></svg>
                </button>
                <div className="uma-detail-event-heading">
                  <h3 title={name}>{name}</h3>
                  <p title={venue} aria-label={venue}><span className="uma-detail-history-desktop">{venue}</span><span className="uma-detail-history-mobile">{compactVenue}</span></p>
                </div>
                <dl className="uma-detail-event-configuration">
                  <div><dt>Role</dt><dd data-role={cm.role}>
                    {cm.roleConfiguration && (cm.role === "ace" || cm.role === "debuffer" || cm.role === "ace_debuffer") ? (
                      <ParticipantConfigurationBadges configuration={cm.roleConfiguration} showRunningStyle={false} showAutoRun={false} abbreviateRoles provenanceTitle="" renderBadge={(badge) => <BadgeTooltip {...ROLE_EXPLANATIONS[cm.role]}>{badge}</BadgeTooltip>} />
                    ) : <BadgeTooltip {...ROLE_EXPLANATIONS[cm.role]}><span className="participant-configuration-badge uma-detail-history-neutral">{cm.role === "no_special_role" ? "No Role" : cm.role === "mixed" ? "Mixed" : "Unrecorded"}</span></BadgeTooltip>}
                  </dd></div>
                  <div><dt>Running Styles</dt><dd>
                    {cm.runningStyles.length > 0 ? cm.runningStyles.map(({ style, usedInFinal }) => {
                      const visual = getRunningStyleVisual(style)
                      const meaning = `${visual.label}${usedInFinal ? " · Used in Final" : ""}`
                      return <BadgeTooltip key={style} title={visual.label} description="Used during this Champions Meeting." note={usedInFinal ? "★ This was the Running Style used in the Final." : undefined}><span className="participant-configuration-badge participant-configuration-badge--style" style={visual.style} data-running-style={style} data-final-style={usedInFinal || undefined} aria-label={meaning}>
                        {visual.abbreviation}{usedInFinal && <span className="uma-detail-history-final-marker" aria-hidden="true">★</span>}
                      </span></BadgeTooltip>
                    }) : <BadgeTooltip title="Unrecorded" description="Historical running style information is unavailable."><span className="participant-configuration-badge uma-detail-history-neutral">Unrecorded</span></BadgeTooltip>}
                  </dd></div>
                </dl>
                <dl className="uma-detail-event-values">
                  <div><dt>Races</dt><dd>{formatCount(cm.races)}<span className="uma-detail-history-mobile" aria-hidden="true"> / </span></dd></div>
                  <div><dt>Wins</dt><dd>{formatCount(cm.wins)}</dd></div>
                  <div><dt>Win Rate</dt><dd className="uma-statistics-rate">{formatUmaWinRate(cm.winRate)}</dd></div>
                </dl>
                <dl className="uma-detail-event-final">
                  <div><dt>Team Final</dt><dd>
                    <BadgeTooltip title={cm.teamFinal ? "Team Final" : "No Final"} description={cm.teamFinal ? `${cm.teamFinal.group ?? "Final"} — the team finished ${cm.teamFinal.teamPlace}.${cm.teamFinal.group ? "" : " The Final group was not recorded."}` : "This Champions Meeting ended before reaching the Final."}><span className="uma-detail-result-badge" data-has-final={!!cm.teamFinal} data-final-group={cm.teamFinal?.group ?? undefined} data-place={cm.teamFinal?.teamPlace} aria-label={`Team Final: ${teamResult}`}>
                      <span className="uma-detail-history-desktop">{teamResult}</span><span className="uma-detail-history-mobile">{cm.teamFinal ? `${cm.teamFinal.group?.replace("Final ", "") ?? "Final"} · ${cm.teamFinal.teamPlace}` : "No Final"}</span>
                    </span></BadgeTooltip>
                  </dd></div>
                  {cm.umaFinish && <div><dt>Uma Finish</dt><dd data-uma-finish={cm.umaFinish} aria-label={`Uma Finish: ${cm.umaFinish === "not_in_final" ? "Not in Final" : cm.umaFinish === "unrecorded" ? "Unrecorded" : CM_FINAL_PLACEMENT_LABELS[cm.umaFinish]}`}>
                    <BadgeTooltip {...finishExplanation} label={`Uma Finish: ${cm.umaFinish === "not_in_final" ? "Not in Final" : cm.umaFinish === "unrecorded" ? "Unrecorded" : CM_FINAL_PLACEMENT_LABELS[cm.umaFinish]}`}>
                    {cm.umaFinish === "not_in_final" || cm.umaFinish === "unrecorded" ? (
                      <span className="uma-statistics-muted">{cm.umaFinish === "not_in_final" ? <><span className="uma-detail-history-desktop">Not in Final</span><span className="uma-detail-history-mobile">Not Final</span></> : "Unrecorded"}</span>
                    ) : <RankingBadge medal={cm.umaFinish === "first" ? "gold" : cm.umaFinish === "second" ? "silver" : cm.umaFinish === "third" ? "bronze" : undefined}>{CM_FINAL_PLACEMENT_LABELS[cm.umaFinish]}</RankingBadge>}
                    </BadgeTooltip>
                  </dd></div>}
                </dl>
              </li>
            )
          })}
        </ol>
      ) : <p className="uma-detail-note">No recorded Champions Meeting history for {unresolved ? "this entry" : "this version"} yet.</p>}
    </section></BadgeTooltipGroup>
  )
}

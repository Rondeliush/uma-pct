import { useState } from "react"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import type { LoH, LoHLineupMember } from "./types"
import { getLoHConfigurationStats, getLoHParticipantStats } from "./progress"
import { getLoHParticipantEntries } from "./participantPresentation"
import { getLoHConfigurationKey, isLoHExtraStageCandidateLocked, snapshotLoHConfiguration } from "./configurations"
import { getLoHExtraStageCandidates, getLoHPhase } from "./extraStage"
import { LOH_LINEUP_SIZE } from "./constants"
import LoHExtraStageRegistration from "./LoHExtraStageRegistration"
import LoHParticipantTile from "./LoHParticipantTile"

type Props = { event: LoH; onRegisterExtraStage: (ids: string[]) => void; onAddExtraStageCandidate: () => void }

export default function LoHUmas({ event, onRegisterExtraStage, onAddExtraStageCandidate }: Props) {
  const { versions } = useUmaDatabase()
  const participants = getLoHConfigurationStats(event)
  const historicalParticipants = getLoHParticipantEntries(event, participants)
  const stats = new Map(participants.map(uma => [uma.key, uma]))
  const overallStats = new Map(getLoHParticipantStats(event).map(uma => [uma.umaId, uma]))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<LoHLineupMember[]>([])
  const [error, setError] = useState("")
  const canRegister = getLoHPhase(event) === "EXTRA_STAGE_QUALIFIED"
  const selecting = editing && canRegister
  const showAllConfigurations = canRegister || event.extraStage !== undefined
  const candidates = [...new Map([...getLoHExtraStageCandidates(event), ...draft].map(uma => [getLoHConfigurationKey(uma), uma])).values()]
  const displayedCount = showAllConfigurations ? candidates.length : historicalParticipants.length
  const lineup = selecting ? draft : event.extraStage?.lineupSnapshot ?? []

  function toggle(uma: LoHLineupMember) {
    if (!selecting) return
    setDraft(current => current.some(item => getLoHConfigurationKey(item) === getLoHConfigurationKey(uma))
      ? current.filter(item => getLoHConfigurationKey(item) !== getLoHConfigurationKey(uma))
      : isLoHExtraStageCandidateLocked(uma, current, versions) ? current : [...current, snapshotLoHConfiguration(uma)])
  }
  function save() {
    if (!selecting || draft.length !== LOH_LINEUP_SIZE) return
    try { onRegisterExtraStage(draft.map(getLoHConfigurationKey)); setEditing(false); setError("") }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to register lineup.") }
  }
  function tile(uma: LoHLineupMember, showConfiguration = false, showPoints = false, displayStats?: (typeof participants)[number]) {
    const key = getLoHConfigurationKey(uma)
    return <LoHParticipantTile key={key} uma={uma} stats={displayStats ?? stats.get(key)}
      overallStats={{ eventNumber: event.number, races: overallStats.get(uma.umaId)?.races ?? 0, wins: overallStats.get(uma.umaId)?.wins ?? 0, rawPoints: overallStats.get(uma.umaId)?.totalPoints ?? null }}
      placement={event.extraStage?.result?.placements.find(item => item.umaId === uma.umaId && event.extraStage?.lineupSnapshot.some(member => getLoHConfigurationKey(member) === key))?.placement}
      showRunningStyle={showConfiguration || selecting} showPoints={showPoints} selection={selecting ? { selected: draft.some(item => getLoHConfigurationKey(item) === key), locked: isLoHExtraStageCandidateLocked(uma, draft, versions), onToggle: () => toggle(uma) } : undefined} />
  }
  return <div data-loh-umas className="px-4 py-5 sm:px-5">
    <LoHExtraStageRegistration event={event} editing={selecting} count={draft.length} error={error}
      onStart={() => { setDraft([]); setEditing(true); setError("") }} onCancel={() => { setDraft([]); setEditing(false); setError("") }} onSave={save}>
      {Array.from({ length: LOH_LINEUP_SIZE }, (_, index) => lineup[index] ? tile(lineup[index]) : <div key={index} aria-label="Empty Extra Stage slot" className="mt-5 flex h-22 w-22 min-w-0 items-center justify-center rounded-xl border border-dashed border-rose-300/15 bg-rose-300/[0.015] text-2xl font-black text-rose-100/15">?</div>)}
    </LoHExtraStageRegistration>
    <section aria-label="All participants" className="mx-auto mt-6 max-w-4xl border-t border-white/[0.07] pt-4">
      <div className="mx-auto mb-4 max-w-[760px]"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-black text-white">All Participants</h3>
        {selecting && <button type="button" onClick={onAddExtraStageCandidate} className="h-9 rounded-lg border border-rose-400/30 bg-rose-400/[0.05] px-4 text-xs font-black text-rose-200 hover:bg-rose-400/[0.1]">+ Add Uma</button>}
      </div>
      {selecting && <><p className="mt-1 text-xs font-medium text-blue-100/45">Select 3 Umas for Extra Stage</p><p className="mt-2 inline-flex rounded-md border border-amber-400/10 bg-amber-400/[0.025] px-2.5 py-1 text-[10px] font-semibold text-amber-200/55">Changes are locked after saving the Extra Stage Lineup.</p></>}
      </div>
      <div aria-label={selecting ? "Extra Stage lineup selection" : undefined} className="cm-historical-participant-grid flex flex-wrap items-start justify-center gap-x-3 gap-y-5 max-sm:mx-auto max-sm:max-w-90 sm:gap-x-7">
        {showAllConfigurations
          ? candidates.map(uma => <div key={getLoHConfigurationKey(uma)} className="w-[calc((100%_-_1.5rem)/3)] min-w-0 sm:w-auto">{tile(uma, true, true)}</div>)
          : historicalParticipants.map(uma => <div key={uma.key} className="w-[calc((100%_-_1.5rem)/3)] min-w-0 sm:w-auto">{tile(uma, false, true, uma)}</div>)}
      </div>
      {displayedCount === 0 && !selecting && <p className="py-3 text-sm text-blue-100/40">No recorded participant results yet.</p>}
    </section>
  </div>
}

import { useState } from "react"
import type { LoH } from "./types"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import { getRunningStyleLabel } from "../CMs/cmParticipantConfiguration"
import EventBasicInformation from "../components/event-form/EventBasicInformation"
import EventTrackInformation from "../components/event-form/EventTrackInformation"
import type { EventTrackValues } from "../components/event-form/EventTrackInformation"
import EventTeamLineup from "../components/event-form/EventTeamLineup"
import EventCreationModal from "../components/event-form/EventCreationModal"
import { createEmptyUmaFormData, isValidEventNumber } from "../components/event-form/eventFormData"
import type { UmaFormData } from "../components/event-form/eventFormData"
import type { LoHEventDetails } from "./types"
import { LOH_EVENT_RANDOM } from "./constants"
import { isLoHMainStageLineupLocked } from "./progress"
import { getLoHPhase } from "./extraStage"

function RandomEventCondition({ label }: { label: string }) {
  return <input type="text" aria-label={label} readOnly value={LOH_EVENT_RANDOM}
    className="col-span-2 w-full rounded-lg border border-rose-600/40 bg-[#081426]/85 px-3 py-2 text-sm font-semibold text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none md:col-span-1" />
}

type Props = {
  lohs: readonly LoH[]
  initialEvent?: LoH
  lineupPurpose?: "mainStage" | "extraStageCandidate"
  onCreate: (details: LoHEventDetails) => void
  onClose: () => void
}

export default function LoHEventForm({ lohs, initialEvent, lineupPurpose = "mainStage", onCreate, onClose }: Props) {
  const { versions } = useUmaDatabase()
  const addingExtraStageCandidate = lineupPurpose === "extraStageCandidate" && initialEvent !== undefined && getLoHPhase(initialEvent) === "EXTRA_STAGE_QUALIFIED"
  const lineupLocked = initialEvent ? isLoHMainStageLineupLocked(initialEvent) && !addingExtraStageCandidate : false
  const [number, setNumber] = useState(initialEvent ? String(initialEvent.number) : "")
  const [name, setName] = useState(initialEvent?.name ?? "")
  const [track, setTrack] = useState<EventTrackValues>({
    track: initialEvent?.racecourse ?? "", surface: initialEvent?.surface ?? "Turf",
    distance: initialEvent?.distance == null ? "" : String(initialEvent.distance), length: initialEvent?.length ?? "Short",
    direction: initialEvent?.direction ?? "Left", weather: LOH_EVENT_RANDOM,
    season: initialEvent?.season ?? "Spring", condition: LOH_EVENT_RANDOM,
  })
  const [umas, setUmas] = useState<UmaFormData[]>(() => Array.from({ length: 3 }, (_, index) => {
    const id = initialEvent?.currentLineup[index]
    if (!id) return createEmptyUmaFormData()
    const participant = initialEvent.participants.find(item => item.umaId === id)
    return {
      id, name: versions.find(version => version.id === id)?.displayName ?? id,
      style: getRunningStyleLabel(participant?.runningStyle),
      ace: participant?.ace ?? false, debuffer: participant?.debuffer ?? false, autoRun: participant?.autoRun ?? false,
    }
  }))
  const [savedDraft, setSavedDraft] = useState<string | null>(null)
  const draft = JSON.stringify({ number, name, track, umas })
  const editingCurrentEvent = initialEvent !== undefined && lineupPurpose === "mainStage"
  const numberExists = number !== "" && lohs.some(event => event.id !== initialEvent?.id && event.number === Number(number))
  const canCreate = isValidEventNumber(Number(number)) && !numberExists && name.trim() !== "" &&
    track.track !== "" && Number.isSafeInteger(Number(track.distance)) && Number(track.distance) > 0 &&
    (lineupPurpose !== "extraStageCandidate" || addingExtraStageCandidate)

  function setTrackField(field: keyof EventTrackValues, value: string) {
    setTrack(current => ({ ...current, [field]: value }))
  }

  function handleCreate() {
    if (!canCreate) return
    onCreate({
      number: Number(number), name, racecourse: track.track,
      surface: track.surface as LoHEventDetails["surface"],
      distance: Number(track.distance),
      length: track.length as LoHEventDetails["length"],
      direction: track.direction as LoHEventDetails["direction"],
      weather: LOH_EVENT_RANDOM,
      season: track.season as LoHEventDetails["season"],
      condition: LOH_EVENT_RANDOM,
      ...(lineupLocked ? {} : { lineup: umas }),
    })
    if (editingCurrentEvent) setSavedDraft(draft)
  }

  return (
    <EventCreationModal eventType="LoH" mode={initialEvent ? "edit" : "create"} isSaved={editingCurrentEvent ? savedDraft === draft : undefined} onClose={onClose} onCreate={handleCreate} canCreate={canCreate}>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <EventBasicInformation
            eventType="LoH" eventNumber={number} eventName={name} numberExists={numberExists}
            setEventNumber={setNumber} setEventName={setName}
          />
          <EventTrackInformation
            eventType="LoH" {...track}
            setTrack={value => setTrackField("track", value)}
            setSurface={value => setTrackField("surface", value)}
            setDistance={value => setTrackField("distance", value)}
            setLength={value => setTrackField("length", value)}
            setDirection={value => setTrackField("direction", value)}
            setWeather={value => setTrackField("weather", value)}
            setSeason={value => setTrackField("season", value)}
            setCondition={value => setTrackField("condition", value)}
            weatherField={<RandomEventCondition label="Weather" />}
            conditionField={<RandomEventCondition label="Condition" />}
          />
        </div>
        <div className="relative min-w-0">
          {addingExtraStageCandidate && <p className="mb-3 text-xs leading-5 text-rose-200/75">Save configurations for Extra Stage selection. Your Main Stage lineup and recorded history will stay unchanged.</p>}
          <fieldset disabled={lineupLocked} aria-describedby={lineupLocked ? "loh-lineup-lock" : undefined} data-loh-lineup-locked={lineupLocked} className={`min-w-0 ${lineupLocked ? "pointer-events-none opacity-25" : ""}`}>
            <EventTeamLineup eventType="LoH" umas={umas} setUmas={lineupLocked ? () => {} : setUmas} />
          </fieldset>
          {lineupLocked && <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-5"><div id="loh-lineup-lock" className="w-full max-w-md rounded-xl border border-white/10 bg-[#080e1d]/95 px-5 py-6 text-center shadow-2xl">
            <svg viewBox="0 0 24 24" className="mx-auto mb-3 h-7 w-7 text-rose-200/70" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-200/50">Team Lineup Locked</p>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-300">{initialEvent?.extraStage ? "Team Lineup cannot be changed after saving the Extra Stage Lineup." : "Main Stage lineup is locked after completing Day 6."}</p>
          </div></div>}
        </div>
      </div>
    </EventCreationModal>
  )
}

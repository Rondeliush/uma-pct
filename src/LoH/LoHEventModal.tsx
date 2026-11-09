import { useState } from "react"
import type { ComponentProps, Dispatch, SetStateAction } from "react"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import LoHEventForm from "./LoHEventForm"
import LoHModal from "./LoHModal"
import { getLoHPhase } from "./extraStage"
import { saveLoHExtraStageCandidates } from "./lohData"
import { completeLoHExtraStage, confirmLoHMainStageRank, deleteLoHRaceSet, finishLoHDay, finishLoHEvent, registerLoHExtraStageLineup, saveLoHRaceSet } from "./progress"
import type { LoH, LoHEventDetails, LoHExtraStageResult, LoHRaceSetInput } from "./types"

type Props = {
  event: LoH
  lohs: LoH[]
  setLohs: Dispatch<SetStateAction<LoH[]>>
  onClose: () => void
  initialFocus?: ComponentProps<typeof LoHModal>["initialFocus"]
}

/** Open the saved event in place, from either the LoH page or an Uma record. */
export default function LoHEventModal({ event: selectedEvent, lohs, setLohs, onClose, initialFocus }: Props) {
  const { versions } = useUmaDatabase()
  const [editingCandidates, setEditingCandidates] = useState(false)

  function handleRaceSetSave(input: LoHRaceSetInput) {
    const timestamp = new Date().toISOString()
    setLohs(current => current.map(event => event.id === selectedEvent.id ? saveLoHRaceSet(event, input, timestamp) : event))
  }

  function handleRaceSetDelete(id: string) {
    const timestamp = new Date().toISOString()
    setLohs(current => current.map(event => event.id === selectedEvent.id ? deleteLoHRaceSet(event, id, timestamp) : event))
  }

  function handleFinishDay(day: number) {
    const updated = finishLoHDay(selectedEvent, day)
    setLohs(current => current.map(event => event.id === updated.id ? updated : event))
  }

  function handleEnd() {
    const updated = finishLoHEvent(selectedEvent)
    setLohs(current => current.map(event => event.id === updated.id ? updated : event))
  }

  function handleConfirmRank(rank: number) {
    const updated = confirmLoHMainStageRank(selectedEvent, rank)
    setLohs(current => current.map(event => event.id === updated.id ? updated : event))
  }

  function handleExtraLineup(keys: string[]) {
    const updated = registerLoHExtraStageLineup(selectedEvent, keys, undefined, versions)
    setLohs(current => current.map(event => event.id === updated.id ? updated : event))
  }

  function handleExtraResult(input: LoHExtraStageResult) {
    const updated = completeLoHExtraStage(selectedEvent, input)
    setLohs(current => current.map(event => event.id === updated.id ? updated : event))
  }

  function handleExtraCandidates(details: LoHEventDetails) {
    const updated = saveLoHExtraStageCandidates(selectedEvent, lohs, details)
    setLohs(current => current.map(event => event.id === updated.id ? updated : event))
    setEditingCandidates(false)
  }

  return <>
    <LoHModal event={selectedEvent} initialFocus={initialFocus} onClose={onClose} onSaveRaceSet={handleRaceSetSave} onDeleteRaceSet={handleRaceSetDelete} onFinishDay={handleFinishDay} onEnd={handleEnd} onConfirmRank={handleConfirmRank} onRegisterExtraStage={handleExtraLineup} onSaveExtraStage={handleExtraResult} onAddExtraStageCandidate={() => setEditingCandidates(true)} />
    {editingCandidates && getLoHPhase(selectedEvent) === "EXTRA_STAGE_QUALIFIED" && <LoHEventForm key={`extra-${selectedEvent.id}`} initialEvent={selectedEvent} lohs={lohs} lineupPurpose="extraStageCandidate" onCreate={handleExtraCandidates} onClose={() => setEditingCandidates(false)} />}
  </>
}

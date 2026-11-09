import { useState } from "react"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UmaAvatarImage from "../components/UmaAvatarImage"
import { EventChevronIcon, TrackConditionIcon } from "../components/EventIcons"
import ParticipantConfigurationBadges from "../CMs/ParticipantConfigurationBadges"
import { snapshotParticipantConfiguration } from "../CMs/cmParticipantConfiguration"
import { TRACK_WEATHER } from "../types/types"
import TrackConditionOptions from "../components/TrackConditionOptions"
import type { TrackCondition, TrackWeather } from "../types/types"
import type { LoH, LoHPlacement, LoHRaceSet, LoHRaceSetInput } from "./types"
import { LOH_RACES_PER_SET } from "./constants"
import { calculateLoHSetScore, getLoHPlacementPoints, isCompleteLoHRace, isLoHPlacement, LOH_ENTRY_PLACEMENTS } from "./scoring"
import { getLoHLegacyProgress, getLoHLineupSnapshot, getLoHMainStage, getLoHProgress, recalculateLoHProgress, saveLoHRaceSet } from "./progress"
import { formatLoHNumber, formatLoHPlacement } from "./format"
import LoHUmaName from "./components/LoHUmaName"

type Props = { event: LoH; initialSet?: LoHRaceSet; initialDay?: number; onSave: (input: LoHRaceSetInput) => void; onClose: () => void }

export default function AddLoHResultsModal({ event, initialSet, initialDay, onSave, onClose }: Props) {
  const { versions } = useUmaDatabase()
  const history = getLoHProgress(event)
  const stage = getLoHMainStage(event, history)
  const [source] = useState<LoHRaceSetInput>(() => {
    if (initialSet) return structuredClone(initialSet)
    const day = initialDay ?? stage.activeDay ?? 1
    const daySets = history.raceSets.filter(set => set.day === day)
    return {
      id: crypto.randomUUID(), createdAt: new Date().toISOString(), day,
      order: Math.max(0, ...daySets.map(set => set.order ?? set.setNumber)) + 1,
      lineupSnapshot: getLoHLineupSnapshot(event), weather: null, condition: null,
      races: Array.from({ length: LOH_RACES_PER_SET }, () => ({ id: crypto.randomUUID(), placements: [] })),
    }
  })
  const day = source.day
  const [weather, setWeather] = useState<TrackWeather | null>(source.weather)
  const [condition, setCondition] = useState<TrackCondition | null>(source.condition)
  const [placements, setPlacements] = useState<(LoHPlacement | null)[][]>(() => source.races.map(race => source.lineupSnapshot.map(uma => race.placements.find(item => item.umaId === uma.umaId)?.place ?? null)))
  const [error, setError] = useState("")
  const complete = placements.length === LOH_RACES_PER_SET && placements.every(isCompleteLoHRace)
  const canSave = complete && weather !== null && condition !== null && stage.days[day - 1]?.state === "active" && !event.completed && (!!initialSet || stage.canAddSet)
  const input: LoHRaceSetInput = {
    ...source, day, weather, condition,
    races: source.races.map((race, raceIndex) => ({ id: race.id, placements: source.lineupSnapshot.map((uma, slot) => ({ umaId: uma.umaId, place: placements[raceIndex][slot] as LoHPlacement })) })),
  }
  const previous = history.raceSets.find(set => set.id === source.id)
  const inputs = initialSet ? (event.raceSets ?? []).map(set => set.id === source.id ? input : set) : [...(event.raceSets ?? []), input]
  const preview = complete ? recalculateLoHProgress(inputs, getLoHLegacyProgress(event)) : null
  const previewSet = preview?.raceSets.find(set => set.id === source.id)
  const rawScores = placements.map(row => row.reduce<number>((sum, place) => sum + (isLoHPlacement(place) ? getLoHPlacementPoints(place) : 0), 0))
  const scoring = calculateLoHSetScore(rawScores, previous?.scoreBefore ?? history.leagueScore)
  const setNumber = previewSet?.setNumber ?? previous?.setNumber ?? history.raceSets.filter(set => set.day === day).length + 1
  const selectedCount = placements.flat().filter(isLoHPlacement).length

  function save() {
    if (!canSave) return
    try { saveLoHRaceSet(event, input); onSave(input); onClose() }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save race results.") }
  }

  return <form data-loh-set-editor aria-label={initialSet ? "Edit Race Results" : "Add Race Results"} onSubmit={event => { event.preventDefault(); save() }} className="loh-results-editor loh-set-window relative isolate overflow-hidden rounded-xl border border-rose-400/40">
    <div className="relative isolate border-b border-rose-300/20 px-3 py-2 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-right opacity-50" style={{ backgroundImage: `url("${import.meta.env.BASE_URL}loh-background.png")` }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-rose-950/90 via-slate-950/90 via-45% to-slate-950/35" />
      <header className="flex flex-wrap items-center justify-between gap-3 sm:min-w-0 sm:flex-1">
        <div className="min-w-0"><h3 className="text-xl font-black tracking-tight text-rose-50 drop-shadow-[0_0_12px_rgba(251,113,133,0.18)] sm:text-2xl">{initialSet ? "Edit Race Results" : "Add Race Results"}</h3>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-rose-200 sm:text-sm">Day {day} · Set #{setNumber} <span className="rounded-md border border-violet-200/20 bg-violet-200/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-100/85">{(previewSet ?? scoring).ticketUsed ? "Ticket" : "Free"}</span></p></div>
        {initialSet && <button type="button" onClick={onClose} className="loh-day-action inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-rose-50 focus-visible:outline-2 focus-visible:outline-rose-300"><span aria-hidden="true" className="rotate-180"><EventChevronIcon /></span>Back to Day {day}</button>}
      </header>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:mt-0 sm:flex sm:shrink-0 sm:flex-wrap sm:gap-4">
        <label className="min-w-0 text-xs font-bold text-slate-200 sm:text-sm"><span className="flex items-center gap-2"><TrackConditionIcon kind="weather" className="h-5 w-5 shrink-0 text-rose-300" />Weather</span>
          <select required aria-label="Set Weather" value={weather ?? ""} onChange={event => setWeather(event.target.value as TrackWeather || null)} className="loh-editor-select mt-1 block h-9 w-full min-w-0 rounded-lg border border-rose-400/45 bg-slate-950/90 px-2 text-xs font-semibold text-white outline-none focus:border-rose-300 sm:mt-1.5 sm:h-10 sm:w-40 sm:px-3 sm:text-sm">
            <option value="" disabled>Select</option>{TRACK_WEATHER.map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="min-w-0 text-xs font-bold text-slate-200 sm:text-sm"><span className="flex items-center gap-2"><TrackConditionIcon kind="condition" className="h-5 w-5 shrink-0 text-rose-300" />Condition</span>
          <select required aria-label="Set Condition" value={condition ?? ""} onChange={event => setCondition(event.target.value as TrackCondition || null)} className="loh-editor-select mt-1 block h-9 w-full min-w-0 rounded-lg border border-rose-400/45 bg-slate-950/90 px-2 text-xs font-semibold text-white outline-none focus:border-rose-300 sm:mt-1.5 sm:h-10 sm:w-40 sm:px-3 sm:text-sm">
            <option value="" disabled>Select</option><TrackConditionOptions value={condition} />
          </select>
        </label>
      </div>
    </div>
    <div className="relative z-10 px-3 py-2 sm:px-4">
      <div className="loh-editor-table-frame overflow-hidden rounded-xl border border-rose-400/35 p-1 sm:p-1.5">
        <table className="loh-editor-table w-full table-fixed text-center">
          <colgroup><col className="w-[12%]" /><col className="w-[24%]" /><col className="w-[24%]" /><col className="w-[24%]" /><col className="w-[16%]" /></colgroup>
          <thead className="text-xs text-white"><tr>
            <th scope="col" className="px-0.5 py-2 text-[9px] font-black uppercase tracking-wide text-rose-100 sm:text-[11px]">Race</th>
            {source.lineupSnapshot.map(uma => {
              const version = versions.find(item => item.id === uma.umaId)
              return <th scope="col" key={uma.umaId} className="px-1 py-2">
                {version?.avatar && <UmaAvatarImage avatar={version.avatar} alt="" className="mx-auto mb-1 h-8 w-8 rounded-md object-contain sm:h-9 sm:w-9" />}
                <LoHUmaName name={version?.displayName ?? uma.umaId} className="text-[9px] font-bold leading-3 sm:text-[11px] sm:leading-4" />
                <div data-loh-set-configuration={uma.umaId} className="mt-1 flex flex-wrap justify-center gap-1">
                  <ParticipantConfigurationBadges configuration={snapshotParticipantConfiguration(uma)} compact />
                </div>
              </th>
            })}
            <th scope="col" className="px-0.5 py-2 text-[9px] font-black uppercase tracking-wide text-rose-100 sm:text-[11px]">Score</th>
          </tr></thead>
          <tbody>
            {placements.map((row, raceIndex) => <tr key={source.races[raceIndex].id}>
              <th scope="row" className="px-0.5 py-0.5 text-[10px] font-bold text-slate-200 sm:py-1 sm:text-xs"><span className="hidden sm:inline">Race </span>{raceIndex + 1}</th>
              {source.lineupSnapshot.map((uma, slot) => <td key={uma.umaId} className="px-1 py-0.5 sm:py-1">
                <select aria-label={`Race ${raceIndex + 1}, ${versions.find(item => item.id === uma.umaId)?.displayName ?? uma.umaId} placement`} value={typeof row[slot] === "number" && row[slot]! > 5 ? "6+" : row[slot] ?? ""} onChange={event => {
                  const place = event.target.value === "" ? null : event.target.value === "6+" ? "6+" : Number(event.target.value) as LoHPlacement
                  setPlacements(current => {
                    if (place !== null && place !== "6+" && current[raceIndex].some((value, column) => column !== slot && value === place)) return current
                    return current.map((values, index) => index === raceIndex ? values.map((value, column) => column === slot ? place : value) : values)
                  })
                  setError("")
                }} className="loh-editor-select mx-auto block h-9 w-full max-w-24 rounded-lg border border-rose-400/45 bg-slate-950/90 px-0 text-[10px] font-bold text-white outline-none focus:border-rose-300 sm:px-2 sm:text-sm">
                  <option value="">Place</option>
                  {LOH_ENTRY_PLACEMENTS.map(place => <option key={place} value={place} disabled={place !== "6+" && row.some((value, column) => column !== slot && value === place)}>{formatLoHPlacement(place)}</option>)}
                </select>
              </td>)}
              <td className="loh-editor-race-score px-0.5 py-0.5 text-sm leading-5 font-black tabular-nums text-rose-50 sm:py-1 sm:text-lg sm:leading-5">{formatLoHNumber(rawScores[raceIndex])}
                {scoring.awardedScores[raceIndex] !== rawScores[raceIndex] && <span className="mt-0.5 block text-[9px] leading-[10px] font-semibold text-rose-300">+{formatLoHNumber(scoring.awardedScores[raceIndex])} awarded</span>}
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-right text-[10px] text-slate-400">{selectedCount} / {LOH_RACES_PER_SET * source.lineupSnapshot.length} results selected</p>
      <dl className="loh-editor-summary mt-2 grid grid-cols-1 gap-0.5 rounded-xl border border-rose-300/25 px-3 py-2.5 text-xs sm:grid-cols-3 sm:gap-3">
        <div className="flex items-center justify-between gap-3 sm:block"><dt className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-rose-200"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 text-rose-300" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3h8v5a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 5 4M16 5h4v2a4 4 0 0 1-5 4M12 12v6M8 21h8M9 18h6v3" /></svg>Set Total</dt><dd data-loh-set-total className="shrink-0 text-xl font-black tabular-nums text-white sm:mt-1 sm:text-2xl">{formatLoHNumber(scoring.rawScore)} PT</dd></div>
        <div className="flex items-center justify-between gap-3 sm:block sm:border-l sm:border-rose-300/25 sm:pl-3"><dt className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-rose-200"><svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 shrink-0 text-rose-300" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 15V8M10 15V4M16 15v-5" /></svg>Current League Score</dt><dd className="shrink-0 text-xl font-black tabular-nums text-white sm:mt-1 sm:text-2xl">{formatLoHNumber(history.leagueScore)}</dd></div>
        <div className="flex items-center justify-between gap-3 sm:block sm:border-l sm:border-rose-300/25 sm:pl-3"><dt className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-rose-200"><svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 shrink-0 text-rose-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h13m-5-5 5 5-5 5" /></svg>After saving</dt><dd data-loh-score-preview className="shrink-0 text-xl font-black tabular-nums text-white sm:mt-1 sm:text-2xl">{preview ? formatLoHNumber(preview.leagueScore) : "\u2014"}</dd></div>
        {scoring.rawScore !== scoring.awardedScore && <div className="flex justify-between gap-3 text-rose-200 sm:col-span-3"><dt>Awarded League Points</dt><dd className="font-bold tabular-nums">+{formatLoHNumber(scoring.awardedScore)} PT</dd></div>}
      </dl>
      {scoring.rawScore !== scoring.awardedScore && <p className="mt-2 text-[10px] leading-3 text-rose-200/70 sm:leading-4">This free set stops awarding League Points at Silver I. All placements and raw points are preserved.</p>}
      {error && <p role="alert" className="mt-2 text-xs text-rose-300">{error}</p>}
      <div className="mt-2 flex justify-end gap-3 border-t border-rose-200/10 pt-2">
        <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-rose-200/35 bg-slate-950/50 px-4 text-sm font-bold text-slate-200 transition hover:border-rose-200/70 hover:bg-white/5">Cancel</button>
        <button type="submit" disabled={!canSave} className="loh-day-action min-h-11 rounded-xl px-5 text-sm font-black text-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-40">Save Results</button>
      </div>
    </div>
    </form>
}

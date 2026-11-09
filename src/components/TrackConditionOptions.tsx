import { SELECTABLE_TRACK_CONDITIONS } from "../types/types"

export default function TrackConditionOptions({ value }: { value: string | null }) {
  return <>
    {value === "Yielding" && <option value={value} disabled hidden>Previously recorded</option>}
    {SELECTABLE_TRACK_CONDITIONS.map(condition => <option key={condition} value={condition}>{condition}</option>)}
  </>
}

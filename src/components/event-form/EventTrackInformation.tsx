import { formatTrackLength } from "../../formatting"
import TrackConditionOptions from "../TrackConditionOptions"
import { TrackConditionIcon } from "../EventIcons"
import { TRACK_SURFACES, TRACK_LENGTHS, TRACK_DIRECTIONS, TRACK_WEATHER, TRACK_SEASONS } from "../../types/types"
import { getTrackImage, trackImages } from "../../data/trackData"
import type { ReactNode } from "react"

export type EventTrackValues = {
  track: string
  surface: string
  distance: string
  length: string
  direction: string
  weather: string
  season: string
  condition: string
}

type Props = EventTrackValues & {
  eventType?: "CM" | "LoH"
  setTrack: (value: string) => void
  setSurface: (value: string) => void
  setDistance: (value: string) => void
  setLength: (value: string) => void
  setDirection: (value: string) => void
  setWeather: (value: string) => void
  setSeason: (value: string) => void
  setCondition: (value: string) => void
  weatherField?: ReactNode
  conditionField?: ReactNode
}

export default function EventTrackInformation({ eventType = "CM", track, setTrack, surface, setSurface, distance, setDistance, length, setLength, direction, setDirection, weather, setWeather, season, setSeason, condition, setCondition, weatherField, conditionField }: Props) {
  const trackImage = getTrackImage(track)
  return (
    <section className={`relative overflow-hidden rounded-2xl border bg-[#071426]/85 p-5 backdrop-blur-sm ${eventType === "LoH" ? "border-rose-500/55 shadow-[0_0_18px_rgba(244,63,94,0.20),0_0_38px_rgba(244,63,94,0.09),inset_0_0_18px_rgba(244,63,94,0.035)]" : "border-blue-500/55 shadow-[0_0_18px_rgba(59,130,246,0.20),0_0_38px_rgba(14,165,233,0.09),inset_0_0_18px_rgba(59,130,246,0.035)]"}`}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${eventType === "LoH" ? "via-rose-400/70" : "via-sky-400/70"}`} />

      {/* ======================================= */}
      {/* HEADER */}
      {/* ======================================= */}

      <div className="mb-5 flex items-start gap-3">
        {/* HEADER ICON */}
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center ${eventType === "LoH" ? "text-rose-300 drop-shadow-[0_0_7px_rgba(244,63,94,0.55)]" : "text-cyan-300 drop-shadow-[0_0_7px_rgba(34,211,238,0.55)]"}`}>
          <svg
            viewBox="0 0 64 64"
            className="h-16 w-16"
            aria-hidden="true"
          >
            {/* POLE */}
            <path
              d="M14 8v48"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* FLAG OUTLINE */}
            <path
              d="M17 12c11-5 22 6 34 0v24c-12 6-23-5-34 0V12Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* CHECKER CELLS */}
            <path
              d="M18 12c4-1.6 8-1.1 12 .3v10.5c-4-1.4-8-1.9-12-.4V12Z"
              fill="currentColor"
            />

            <path
              d="M40 14.5c3.5.3 7.1-.2 10-1.5v10.5c-3 1.3-6.5 1.8-10 1.4V14.5Z"
              fill="currentColor"
            />

            <path
              d="M29 23c3.7 1.3 7.4 2 11 1.9v10.4c-3.7.1-7.4-.6-11-1.9V23Z"
              fill="currentColor"
            />

            <path
              d="M18 22.4c3.7-1.5 7.4-1 11 .6v10.4c-3.6-1.6-7.3-2.1-11-.6V22.4Z"
              fill="currentColor"
              opacity="0.35"
            />
          </svg>
        </div>

        <div>
          <div className="text-xl font-black text-white">
            Track Information
          </div>

          <div className={`mt-1 text-xs font-medium ${eventType === "LoH" ? "text-rose-200/45" : "text-blue-200/45"}`}>
            Configure the race conditions for this event.
          </div>
        </div>
      </div>

      {/* ======================================= */}
      {/* TRACK PREVIEW */}
      {/* ======================================= */}

      <div className={`relative h-[230px] overflow-hidden rounded-xl border bg-[#050b16] ${eventType === "LoH" ? "border-rose-500/65 shadow-[0_0_14px_rgba(244,63,94,0.22),inset_0_0_18px_rgba(244,63,94,0.05)]" : "border-sky-500/65 shadow-[0_0_14px_rgba(56,189,248,0.22),inset_0_0_18px_rgba(14,165,233,0.05)]"}`}>
        {trackImage ? (
          <>
            <img
              src={trackImage}
              alt={track}
              className="absolute inset-0 h-full w-full object-cover"
            />

            {/* IMAGE SHADING */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#020611]/90 via-transparent to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#020611]/45 via-transparent to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">

            {/* EMPTY TRACK ICON */}
            <div className={`mb-3 flex h-14 w-20 items-center justify-center rounded-2xl border ${eventType === "LoH" ? "border-rose-400/15 bg-rose-400/[0.03] text-rose-300/35 shadow-[0_0_20px_rgba(244,63,94,0.05)]" : "border-cyan-400/15 bg-cyan-400/[0.03] text-cyan-300/35 shadow-[0_0_20px_rgba(34,211,238,0.05)]"}`}>
              <TrackConditionIcon kind="racecourse" className="h-10 w-16" />
            </div>

            <div className={`text-sm font-bold ${eventType === "LoH" ? "text-rose-100/45" : "text-blue-100/45"}`}>
              Track Preview
            </div>

            <div className={`mt-1 text-xs font-medium ${eventType === "LoH" ? "text-rose-200/25" : "text-blue-200/25"}`}>
              Select a racecourse to preview the track
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* GLASS RACECOURSE SELECT */}
        {/* ======================================= */}

        <div className="absolute right-3 top-3 z-20 w-[205px]">
          <select
            aria-label="Racecourse"
            value={track}
            onChange={(e) =>
              setTrack(e.target.value)
            }
            className={`w-full rounded-xl border bg-[#071426]/55 px-4 py-2.5 text-sm font-bold text-white outline-none backdrop-blur-xl transition hover:bg-[#071426]/65 ${eventType === "LoH" ? "border-rose-300/45 shadow-[0_0_14px_rgba(244,63,94,0.15),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-rose-300/70 focus:border-rose-200" : "border-cyan-300/45 shadow-[0_0_14px_rgba(34,211,238,0.15),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-cyan-300/70 focus:border-cyan-200"}`}
          >
            <option value="">Select racecourse</option>
            {trackImages.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
        </div>

        {/* ======================================= */}
        {/* PREVIEW BOTTOM INFO */}
        {/* ======================================= */}

        <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-4">
          <div>
            <div className={`text-[10px] font-black uppercase tracking-[0.25em] ${eventType === "LoH" ? "text-rose-300/80" : "text-cyan-300/80"}`}>
              Racecourse
            </div>

            <div className="mt-1 text-2xl font-black uppercase text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
              {track || "—"}
            </div>
          </div>

          <div
            className={`rounded-lg border px-3 py-1.5 text-xs font-black ${surface === "Turf"
                ? "border-emerald-400/60 bg-emerald-950/80 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.20)]"
                : "border-amber-400/60 bg-amber-950/80 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.20)]"
              }`}
          >
            {surface}
          </div>
        </div>
      </div>

      {/* ======================================= */}
      {/* SETTINGS */}
      {/* ======================================= */}

      <div className="mt-5 grid grid-cols-2 gap-3 md:gap-x-8">

        {/* ======================================= */}
        {/* LEFT COLUMN */}
        {/* ======================================= */}

        <div className="space-y-1">

          {/* SURFACE */}
          <div className="grid min-h-[58px] grid-cols-[28px_minmax(0,1fr)] gap-x-2 gap-y-1.5 md:grid-cols-[38px_78px_minmax(0,1fr)] md:items-center md:gap-2">
            <div className={`flex items-center justify-center ${eventType === "LoH" ? "text-rose-300 drop-shadow-[0_0_5px_rgba(244,63,94,0.4)]" : "text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]"}`}>
              <TrackConditionIcon kind="surface" />
            </div>

            <span className={`text-xs font-semibold ${eventType === "LoH" ? "text-rose-100/80" : "text-blue-100/80"}`}>
              Surface
            </span>

            <select
              aria-label="Surface"
              value={surface}
              onChange={(e) =>
                setSurface(e.target.value)
              }
              className={`col-span-2 w-full rounded-lg border bg-[#081426]/85 px-3 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition md:col-span-1 ${eventType === "LoH" ? "border-rose-600/70 hover:border-rose-400/80 focus:border-rose-400" : "border-blue-600/70 hover:border-blue-400/80 focus:border-cyan-400"}`}
            >
              {TRACK_SURFACES.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          {/* DISTANCE */}
          <div className="grid min-h-[58px] grid-cols-[28px_minmax(0,1fr)] gap-x-2 gap-y-1.5 md:grid-cols-[38px_78px_minmax(0,1fr)] md:items-center md:gap-2">
            <div className={`flex items-center justify-center ${eventType === "LoH" ? "text-rose-300 drop-shadow-[0_0_5px_rgba(244,63,94,0.4)]" : "text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]"}`}>
              <TrackConditionIcon kind="distance" />
            </div>

            <span className={`text-xs font-semibold ${eventType === "LoH" ? "text-rose-100/80" : "text-blue-100/80"}`}>
              Distance
            </span>

            <input
              type="text"
              aria-label="Distance"
              value={distance}
              onChange={(e) =>
                setDistance(e.target.value)
              }
              placeholder="1600m"
              className={`col-span-2 w-full rounded-lg border bg-[#081426]/85 px-3 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition placeholder:text-gray-600 md:col-span-1 ${eventType === "LoH" ? "border-rose-600/70 hover:border-rose-400/80 focus:border-rose-400" : "border-blue-600/70 hover:border-blue-400/80 focus:border-cyan-400"}`}
            />
          </div>

          {/* LENGTH */}
          <div className="grid min-h-[58px] grid-cols-[28px_minmax(0,1fr)] gap-x-2 gap-y-1.5 md:grid-cols-[38px_78px_minmax(0,1fr)] md:items-center md:gap-2">
            <div className={`flex items-center justify-center ${eventType === "LoH" ? "text-rose-300 drop-shadow-[0_0_5px_rgba(244,63,94,0.4)]" : "text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]"}`}>
              <TrackConditionIcon kind="length" />
            </div>

            <span className={`text-xs font-semibold ${eventType === "LoH" ? "text-rose-100/80" : "text-blue-100/80"}`}>
              Length
            </span>

            <select
              aria-label="Length"
              value={length}
              onChange={(e) =>
                setLength(e.target.value)
              }
              className={`col-span-2 w-full rounded-lg border bg-[#081426]/85 px-3 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition md:col-span-1 ${eventType === "LoH" ? "border-rose-600/70 hover:border-rose-400/80 focus:border-rose-400" : "border-blue-600/70 hover:border-blue-400/80 focus:border-cyan-400"}`}
            >
              {TRACK_LENGTHS.map(value => <option key={value} value={value}>{formatTrackLength(value)}</option>)}
            </select>
          </div>

        </div>

        {/* ======================================= */}
        {/* RIGHT COLUMN */}
        {/* ======================================= */}

        <div className="space-y-1">

          {/* DIRECTION */}
          <div className="grid min-h-[42px] grid-cols-[28px_minmax(0,1fr)] gap-x-2 gap-y-1.5 md:grid-cols-[38px_78px_minmax(0,1fr)] md:items-center md:gap-2">
            <div className={`flex items-center justify-center ${eventType === "LoH" ? "text-rose-300 drop-shadow-[0_0_5px_rgba(244,63,94,0.4)]" : "text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]"}`}>
              <TrackConditionIcon kind="direction" />
            </div>

            <span className={`text-xs font-semibold ${eventType === "LoH" ? "text-rose-100/80" : "text-blue-100/80"}`}>
              Direction
            </span>

            <select
              aria-label="Direction"
              value={direction}
              onChange={(e) =>
                setDirection(e.target.value)
              }
              className={`col-span-2 w-full rounded-lg border bg-[#081426]/85 px-3 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition md:col-span-1 ${eventType === "LoH" ? "border-rose-600/70 hover:border-rose-400/80 focus:border-rose-400" : "border-blue-600/70 hover:border-blue-400/80 focus:border-cyan-400"}`}
            >
              {TRACK_DIRECTIONS.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          {/* WEATHER */}
          <div className="grid min-h-[42px] grid-cols-[28px_minmax(0,1fr)] gap-x-2 gap-y-1.5 md:grid-cols-[38px_78px_minmax(0,1fr)] md:items-center md:gap-2">
            <div className={`flex items-center justify-center ${eventType === "LoH" ? "text-rose-300 drop-shadow-[0_0_5px_rgba(244,63,94,0.4)]" : "text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]"}`}>
              <TrackConditionIcon kind="weather" />
            </div>

            <span className={`text-xs font-semibold ${eventType === "LoH" ? "text-rose-100/80" : "text-blue-100/80"}`}>
              Weather
            </span>

            {weatherField ?? <select
              aria-label="Weather"
              value={weather}
              onChange={(e) =>
                setWeather(e.target.value)
              }
              className={`col-span-2 w-full rounded-lg border bg-[#081426]/85 px-3 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition md:col-span-1 ${eventType === "LoH" ? "border-rose-600/70 hover:border-rose-400/80 focus:border-rose-400" : "border-blue-600/70 hover:border-blue-400/80 focus:border-cyan-400"}`}
            >
              {TRACK_WEATHER.map(value => <option key={value} value={value}>{value}</option>)}
            </select>}
          </div>

          {/* SEASON */}
          <div className="grid min-h-[42px] grid-cols-[28px_minmax(0,1fr)] gap-x-2 gap-y-1.5 md:grid-cols-[38px_78px_minmax(0,1fr)] md:items-center md:gap-2">
            <div className={`flex items-center justify-center ${eventType === "LoH" ? "text-rose-300 drop-shadow-[0_0_5px_rgba(244,63,94,0.4)]" : "text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]"}`}>
              <TrackConditionIcon kind="season" />
            </div>

            <span className={`text-xs font-semibold ${eventType === "LoH" ? "text-rose-100/80" : "text-blue-100/80"}`}>
              Season
            </span>

            <select
              aria-label="Season"
              value={season}
              onChange={(e) =>
                setSeason(e.target.value)
              }
              className={`col-span-2 w-full rounded-lg border bg-[#081426]/85 px-3 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition md:col-span-1 ${eventType === "LoH" ? "border-rose-600/70 hover:border-rose-400/80 focus:border-rose-400" : "border-blue-600/70 hover:border-blue-400/80 focus:border-cyan-400"}`}
            >
              {TRACK_SEASONS.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          {/* CONDITION */}
          <div className="grid min-h-[42px] grid-cols-[28px_minmax(0,1fr)] gap-x-2 gap-y-1.5 md:grid-cols-[38px_78px_minmax(0,1fr)] md:items-center md:gap-2">
            <div className={`flex items-center justify-center ${eventType === "LoH" ? "text-rose-300 drop-shadow-[0_0_5px_rgba(244,63,94,0.4)]" : "text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]"}`}>
              <TrackConditionIcon kind="condition" />
            </div>

            <span className={`text-xs font-semibold ${eventType === "LoH" ? "text-rose-100/80" : "text-blue-100/80"}`}>
              Condition
            </span>

            {conditionField ?? <select
              aria-label="Condition"
              value={condition}
              onChange={(e) =>
                setCondition(e.target.value)
              }
              className={`col-span-2 w-full rounded-lg border bg-[#081426]/85 px-3 py-2 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition md:col-span-1 ${eventType === "LoH" ? "border-rose-600/70 hover:border-rose-400/80 focus:border-rose-400" : "border-blue-600/70 hover:border-blue-400/80 focus:border-cyan-400"}`}
            >
              <TrackConditionOptions value={condition} />
            </select>}
          </div>

        </div>
      </div>
    </section>
  )
}

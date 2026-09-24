import { useEffect, useState } from "react"
import type { CM, CMUma, UmaStyle } from "../types/types"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UmaForm from "./UmaForm"
import ModalPortal from "../components/ModalPortal"
import { getTrackImage } from "../data/trackData"

type EditCMModalProps = {
  cm: CM
  setCms: React.Dispatch<React.SetStateAction<CM[]>>
  onClose: () => void
}

type UmaFormData = {
  id: string
  name: string
  style: UmaStyle | ""
  ace: boolean
  debuffer: boolean
  autoRun: boolean
}

function EditCMModal({ cm, setCms, onClose }: EditCMModalProps) {
  const { characters, versions } = useUmaDatabase()
    const [umas, setUmas] = useState<UmaFormData[]>(
  (cm.currentLineup ?? []).map((cmUmaId) => {
    const cmUma = (cm.participants ?? []).find(
      (participant) =>
        participant.cmUmaId === cmUmaId
    )

    const umaVersion = versions.find(
      (item) => item.id === cmUma?.umaId
    )

    const umaCharacter = characters.find(
      (item) =>
        item.id === umaVersion?.characterId
    )

    return {
      id: cmUma?.umaId ?? "",
      name: umaCharacter?.name ?? "",
      style: cmUma?.style ?? "Runaway",
      ace: cmUma?.ace ?? false,
      debuffer: cmUma?.debuffer ?? false,
      autoRun: cmUma?.autoRun ?? false,
    }
  })
)

    const [cmName, setCmName] = useState(cm.name)
    const [league, setLeague] = useState<CM["league"]>(cm.league ?? "Graded League")
    const [track, setTrack] = useState(cm.track)
    const [surface, setSurface] = useState(cm.surface)
    const [distance, setDistance] = useState(String(cm.distance))
    const [length, setLength] = useState(cm.length)
    const [direction, setDirection] = useState(cm.direction)
    const [weather, setWeather] = useState(cm.weather)
    const [season, setSeason] = useState(cm.season)
    const [condition, setCondition] = useState(cm.condition)
    const isLineupLocked = cm.phase !== "attempts"
    const [isSaved, setIsSaved] = useState(false)

    useEffect(() => {
      setIsSaved(false)
    }, [
      cmName,
      league,
      track,
      surface,
      distance,
      length,
      direction,
      weather,
      season,
      condition,
      umas,
    ])

    const handleSave = () => {
  setCms((current) =>
    current.map((item) => {
      if (item.number !== cm.number) {
        return item
      }

      const existingParticipants =
        item.participants ?? []

      let updatedParticipants = [
        ...existingParticipants,
      ]

      // Szukamy następnego wolnego numeru cmUmaId.
      let nextParticipantNumber =
        existingParticipants.reduce(
          (highest, participant) => {
            const match =
              participant.cmUmaId.match(
                /-uma-(\d+)$/
              )

            if (!match) {
              return highest
            }

            return Math.max(
              highest,
              Number(match[1])
            )
          },
          0
        ) + 1

      const newCurrentLineup = umas.map(
        (selectedUma) => {
          // Czy ta Uma brała już udział w tym CM?
          const existingParticipant =
            updatedParticipants.find(
              (participant) =>
                participant.umaId ===
                selectedUma.id
            )

          // Jeśli tak, używamy starego cmUmaId.
          if (existingParticipant) {
            updatedParticipants =
              updatedParticipants.map(
                (participant) =>
                  participant.cmUmaId ===
                  existingParticipant.cmUmaId
                    ? {
                        ...participant,
                        style:
                          selectedUma.style as UmaStyle,
                        ace: selectedUma.ace,
                        debuffer:
                          selectedUma.debuffer,
                        autoRun:
                          selectedUma.autoRun,
                      }
                    : participant
              )

            return existingParticipant.cmUmaId
          }

          // Jeśli Uma pojawia się pierwszy raz,
          // tworzymy nowego participant.
          const newParticipant: CMUma = {
            cmUmaId: `cm${item.number}-uma-${nextParticipantNumber}`,
            umaId: selectedUma.id,
            style:
              selectedUma.style as UmaStyle,
            ace: selectedUma.ace,
            debuffer:
              selectedUma.debuffer,
            won: false,
            autoRun:
              selectedUma.autoRun,
            finalParticipant: false,
          }

          nextParticipantNumber += 1

          updatedParticipants = [
            ...updatedParticipants,
            newParticipant,
          ]

          return newParticipant.cmUmaId
        }
      )

      const oldLineupUmaIds = item.currentLineup
  .map((cmUmaId) =>
    existingParticipants.find(
      (participant) =>
        participant.cmUmaId === cmUmaId
    )?.umaId
  )
  .filter(
    (umaId): umaId is string =>
      umaId !== undefined
  )

const newLineupUmaIds = umas.map(
  (uma) => uma.id
)

const lineupChanged =
  oldLineupUmaIds.length !==
    newLineupUmaIds.length ||
  oldLineupUmaIds.some(
    (umaId, index) =>
      umaId !== newLineupUmaIds[index]
  )

const getUmaName = (umaId: string) =>
  versions.find(
    (version) => version.id === umaId
  )?.displayName ?? umaId

const removedUmas =
  oldLineupUmaIds.filter(
    (umaId) =>
      !newLineupUmaIds.includes(umaId)
  )

const addedUmas =
  newLineupUmaIds.filter(
    (umaId) =>
      !oldLineupUmaIds.includes(umaId)
  )

const lineupLogDetails = [
  ...removedUmas.map(
    (umaId) =>
      `Removed: ${getUmaName(umaId)}`
  ),
  ...addedUmas.map(
    (umaId) =>
      `Added: ${getUmaName(umaId)}`
  ),
]

if (
  lineupChanged &&
  lineupLogDetails.length === 0
) {
  lineupLogDetails.push(
    "Lineup order changed."
  )
}
const trackLogDetails = [
  ...(item.name !== cmName
    ? [
        `Name: ${item.name || "Unnamed CM"} → ${
          cmName || "Unnamed CM"
        }`,
      ]
    : []),

  ...(item.league !== league
    ? [
        `League: ${item.league ?? "—"} → ${
          league ?? "—"
        }`,
      ]
    : []),
  ...(item.track !== track
    ? [
        `Racecourse: ${item.track || "—"} → ${
          track || "—"
        }`,
      ]
    : []),

  ...(item.surface !== surface
    ? [`Surface: ${item.surface} → ${surface}`]
    : []),

  ...(item.distance !== Number(distance)
    ? [
        `Distance: ${item.distance}m → ${Number(
          distance
        )}m`,
      ]
    : []),

  ...(item.length !== length
    ? [`Length: ${item.length} → ${length}`]
    : []),

  ...(item.direction !== direction
    ? [
        `Direction: ${item.direction} → ${direction}`,
      ]
    : []),

  ...(item.weather !== weather
    ? [`Weather: ${item.weather} → ${weather}`]
    : []),

  ...(item.season !== season
    ? [`Season: ${item.season} → ${season}`]
    : []),

  ...(item.condition !== condition
    ? [
        `Condition: ${item.condition} → ${condition}`,
      ]
    : []),
]

const trackChanged =
  trackLogDetails.length > 0

const updatedLog = [...(item.log ?? [])]

if (trackChanged) {
  updatedLog.push({
    id: `cm${item.number}-track-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "trackUpdated",
    message: "CM information updated.",
    details: trackLogDetails,
  })
}

if (lineupChanged) {
  updatedLog.push({
    id: `cm${item.number}-lineup-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "lineupUpdated",
    message: "Lineup updated.",
    details: lineupLogDetails,
  })
}

umas.forEach((selectedUma) => {
  const oldParticipant =
    existingParticipants.find(
      (participant) =>
        participant.umaId === selectedUma.id &&
        item.currentLineup.includes(
          participant.cmUmaId
        )
    )

  if (!oldParticipant) {
    return
  }

  const umaLogDetails: string[] = []

  if (
    oldParticipant.style !== selectedUma.style
  ) {
    umaLogDetails.push(
      `Style: ${oldParticipant.style} → ${selectedUma.style}`
    )
  }

  if (
    oldParticipant.ace !== selectedUma.ace
  ) {
    umaLogDetails.push(
      `Ace: ${
        oldParticipant.ace ? "Yes" : "No"
      } → ${
        selectedUma.ace ? "Yes" : "No"
      }`
    )
  }

  if (
    oldParticipant.debuffer !==
    selectedUma.debuffer
  ) {
    umaLogDetails.push(
      `Debuffer: ${
        oldParticipant.debuffer ? "Yes" : "No"
      } → ${
        selectedUma.debuffer ? "Yes" : "No"
      }`
    )
  }

  if (
    oldParticipant.autoRun !==
    selectedUma.autoRun
  ) {
    umaLogDetails.push(
      `AutoRun: ${
        oldParticipant.autoRun ? "Yes" : "No"
      } → ${
        selectedUma.autoRun ? "Yes" : "No"
      }`
    )
  }

  if (umaLogDetails.length === 0) {
    return
  }

  const umaName =
    versions.find(
      (version) =>
        version.id === selectedUma.id
    )?.displayName ?? selectedUma.id

  updatedLog.push({
    id: `cm${item.number}-uma-${selectedUma.id}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "umaUpdated",
    message: `Uma updated: ${umaName}`,
    details: umaLogDetails,
  })
})

      return {
        ...item,

        name: cmName,
        league,
        track,
        surface,
        distance: Number(distance),
        length,
        direction,
        weather,
        season,
        condition,

        participants: updatedParticipants,
        currentLineup: newCurrentLineup,

        log: updatedLog,
      }
    })
  )

  setIsSaved(true)
}

const trackImage = getTrackImage(track)

  return (
  <ModalPortal>
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">

      <div className="relative flex max-h-[94vh] w-full max-w-[1480px] flex-col overflow-hidden rounded-[24px] border border-violet-500/55 bg-[#06101f] shadow-[0_0_30px_rgba(139,92,246,0.18),0_30px_90px_rgba(0,0,0,0.65)]">


        {/* ======================================= */}
        {/* MODAL BACKGROUND */}
        {/* ======================================= */}

        <div className="pointer-events-none absolute inset-0 z-0">

          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(2,8,23,0.98)_0%,rgba(5,18,42,0.96)_48%,rgba(13,15,45,0.96)_100%)]" />

          <div className="absolute -left-32 top-1/3 h-[520px] w-[420px] rounded-full bg-blue-700/15 blur-[110px]" />

          <div className="absolute -right-28 top-1/4 h-[520px] w-[420px] rounded-full bg-violet-700/12 blur-[120px]" />

          <div className="absolute inset-x-[15%] bottom-[-100px] h-[220px] rounded-full bg-blue-700/12 blur-[90px]" />

          <div className="absolute right-20 top-0 h-48 w-96 skew-x-[-28deg] bg-blue-500/[0.035]" />

          <div className="absolute right-44 top-0 h-48 w-40 skew-x-[-28deg] bg-violet-500/[0.035]" />

        </div>

        {/* ======================================= */}
        {/* HEADER */}
        {/* ======================================= */}

        <div className="relative z-10 shrink-0 border-b border-blue-900/60 px-8 py-5">
        <div className="pointer-events-none absolute inset-x-[28%] bottom-0 h-px bg-gradient-to-r from-transparent via-violet-400/80 to-transparent" />

          <div className="grid grid-cols-[1fr_auto_1fr] items-center">

            {/* LEFT */}
            <div>

            </div>

            {/* CENTER */}
            <div className="text-center">
            <div className="bg-gradient-to-r from-violet-300 via-white to-blue-200 bg-clip-text text-4xl font-black tracking-tight text-transparent">
              Edit CM {cm.number}
            </div>

            <div className="mt-1 text-sm font-medium text-blue-200/60">
              Update Champions Meeting card details
            </div>
          </div>

            {/* RIGHT */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="
                  flex h-11 w-11 items-center justify-center
                  rounded-xl
                  border border-blue-600/60
                  bg-[#081426]/70
                  text-xl text-white/55
                  transition-all duration-200
                  hover:border-sky-400/70
                  hover:bg-[#0b1b31]
                  hover:text-white
                  hover:shadow-[0_0_14px_rgba(56,189,248,0.12)]
                "
                aria-label="Close Edit CM"
              >
                ×
              </button>
            </div>

          </div>
        </div>

        {/* ======================================= */}
        {/* CONTENT */}
        {/* ======================================= */}

        <div className="add-cm-scrollbar relative z-10 flex-1 overflow-y-auto px-7 pb-3 pt-6">

          <div className="grid grid-cols-[0.95fr_1.05fr] items-start gap-5">

            {/* ======================================= */}
            {/* LEFT COLUMN */}
            {/* ======================================= */}

            <div className="space-y-5">

              {/* ======================================= */}
              {/* BASIC INFORMATION */}
              {/* ======================================= */}

              <section className="relative overflow-hidden rounded-2xl border border-sky-500/55 bg-[#071426]/85 p-5 shadow-[0_0_18px_rgba(14,165,233,0.20),0_0_38px_rgba(37,99,235,0.10),inset_0_0_18px_rgba(14,165,233,0.035)] backdrop-blur-sm">

                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/70 to-transparent" />

                {/* HEADER */}
                <div className="mb-5 flex items-start gap-3">

                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-7 w-7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="4" y="3" width="16" height="18" rx="2.5" />
                      <path d="M8 8h8" />
                      <path d="M8 12h8" />
                      <path d="M8 16h5" />
                    </svg>
                  </div>

                  <div>
                    <div className="text-xl font-black text-white">
                      Basic Information
                    </div>

                    <div className="mt-1 text-xs font-medium text-blue-200/45">
                      Update the basic details for this Champions Meeting.
                    </div>
                  </div>

                </div>

                <div className="space-y-4">

                  {/* CM NUMBER + LEAGUE */}
                  <div className="grid grid-cols-[1fr_220px] gap-4">

                    {/* CM NUMBER */}
                    <div>
                      <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-blue-100/80">

                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4 text-cyan-300"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                          aria-hidden="true"
                        >
                          <path d="M10 3 8 21" />
                          <path d="M16 3 14 21" />
                          <path d="M4 9h16" />
                          <path d="M3 15h16" />
                        </svg>

                        CM Number
                      </label>

                      <input
                        type="text"
                        value={cm.number}
                        disabled
                        className="
                          w-full rounded-lg
                          border border-white/10
                          bg-black/20
                          px-4 py-2.5
                          text-sm font-semibold text-white/35
                          outline-none
                          disabled:cursor-not-allowed
                        "
                      />
                    </div>

                    {/* LEAGUE */}
                    <div>
                      <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-blue-100/80">

                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4 text-cyan-300"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M8 4h8v4c0 4-1.8 6-4 6s-4-2-4-6V4Z" />
                          <path d="M8 6H5v2c0 2.2 1.2 3.5 3.1 4" />
                          <path d="M16 6h3v2c0 2.2-1.2 3.5-3.1 4" />
                          <path d="M12 14v4" />
                          <path d="M9 18h6" />
                          <path d="M8 21h8" />
                        </svg>

                        League
                      </label>

                      <select
                        value={league}
                        onChange={(e) =>
                          setLeague(e.target.value as CM["league"])
                        }
                        className="
                          w-full rounded-lg
                          border border-blue-600/70
                          bg-[#081426]/85
                          px-4 py-2.5
                          text-sm font-semibold text-white
                          outline-none
                          transition-all duration-200
                          hover:border-blue-400/80
                          focus:border-cyan-400
                          focus:shadow-[0_0_12px_rgba(34,211,238,0.10)]
                        "
                      >
                        <option value="Graded League">
                          Graded League
                        </option>

                        <option value="Open League">
                          Open League
                        </option>
                      </select>
                    </div>

                  </div>

                  {/* CM NAME */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-blue-100/80">

                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4 text-cyan-300"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M4 5h7l9 9-6 6-9-9V5Z" />
                        <circle cx="8.5" cy="8.5" r="1.3" />
                      </svg>

                      CM Name
                    </label>

                    <input
                      type="text"
                      value={cmName}
                      onChange={(e) =>
                        setCmName(e.target.value)
                      }
                      className="
                        w-full rounded-lg
                        border border-blue-600/70
                        bg-[#081426]/85
                        px-4 py-2.5
                        text-sm font-semibold text-white
                        outline-none
                        transition-all duration-200
                        hover:border-blue-400/80
                        focus:border-cyan-400
                        focus:shadow-[0_0_12px_rgba(34,211,238,0.10)]
                      "
                    />
                  </div>

                </div>
              </section>

              {/* ======================================= */}
              {/* TRACK INFORMATION */}
              {/* ======================================= */}

              <section className="relative overflow-hidden rounded-2xl border border-sky-500/55 bg-[#071426]/85 p-5 shadow-[0_0_18px_rgba(14,165,233,0.20),0_0_38px_rgba(37,99,235,0.10),inset_0_0_18px_rgba(14,165,233,0.035)] backdrop-blur-sm">

                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/70 to-transparent" />

                {/* HEADER */}
                <div className="mb-5 flex items-start gap-3">

                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]">
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

                    <div className="mt-1 text-xs font-medium text-blue-200/45">
                      Update the race conditions for this event.
                    </div>
                  </div>

                </div>

                {/* ======================================= */}
                {/* TRACK PREVIEW */}
                {/* ======================================= */}

                <div className="relative h-[230px] overflow-hidden rounded-xl border border-sky-500/65 bg-[#050b16] shadow-[0_0_14px_rgba(56,189,248,0.22),inset_0_0_18px_rgba(14,165,233,0.05)]">

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
                      <div className="mb-3 flex h-14 w-20 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.03] text-cyan-300/35 shadow-[0_0_20px_rgba(34,211,238,0.05)]">
                        <svg
                          viewBox="0 0 64 40"
                          className="h-10 w-16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          {/* OUTER TRACK */}
                          <path d="
                            M16 6
                            H48
                            C55 6 60 11.5 60 20
                            C60 28.5 55 34 48 34
                            H16
                            C9 34 4 28.5 4 20
                            C4 11.5 9 6 16 6
                            Z
                          " />

                          {/* INNER TRACK */}
                          <path d="
                            M18 13
                            H46
                            C50.8 13 54 15.8 54 20
                            C54 24.2 50.8 27 46 27
                            H18
                            C13.2 27 10 24.2 10 20
                            C10 15.8 13.2 13 18 13
                            Z
                          " />

                          {/* START / FINISH LINE */}
                          <path d="M47 6v7" />
                          <path d="M47 27v7" />
                        </svg>
                      </div>

                      <div className="text-sm font-bold text-blue-100/45">
                        Track Preview
                      </div>

                      <div className="mt-1 text-xs font-medium text-blue-200/25">
                        Select a racecourse to preview the track
                      </div>
                    </div>
                  )}

                  {/* ======================================= */}
                  {/* GLASS RACECOURSE SELECT */}
                  {/* ======================================= */}

                  <div className="absolute right-3 top-3 z-20 w-[205px]">
                    <select
                      value={track}
                      onChange={(e) =>
                        setTrack(e.target.value)
                      }
                      className="
                        w-full
                        rounded-xl
                        border border-cyan-300/45
                        bg-[#071426]/55
                        px-4 py-2.5
                        text-sm font-bold text-white
                        shadow-[0_0_14px_rgba(34,211,238,0.15),inset_0_1px_0_rgba(255,255,255,0.08)]
                        outline-none
                        backdrop-blur-xl
                        transition
                        hover:border-cyan-300/70
                        hover:bg-[#071426]/65
                        focus:border-cyan-200
                      "
                    >
                      <option value="">
                        Select racecourse
                      </option>

                      <option value="Sapporo">Sapporo</option>
                      <option value="Hakodate">Hakodate</option>
                      <option value="Niigata">Niigata</option>
                      <option value="Fukushima">Fukushima</option>
                      <option value="Nakayama">Nakayama</option>
                      <option value="Tokyo">Tokyo</option>
                      <option value="Chukyo">Chukyo</option>
                      <option value="Kyoto">Kyoto</option>
                      <option value="Hanshin">Hanshin</option>
                      <option value="Kokura">Kokura</option>
                      <option value="Ooi">Ooi</option>
                      <option value="Kawasaki">Kawasaki</option>
                      <option value="Funabashi">Funabashi</option>
                      <option value="Morioka">Morioka</option>
                      <option value="Longchamp">Longchamp</option>

                      <option value="Santa Anita Park">
                        Santa Anita Park
                      </option>

                      <option value="Del Mar">
                        Del Mar
                      </option>
                    </select>
                  </div>

                  {/* ======================================= */}
                  {/* PREVIEW BOTTOM INFO */}
                  {/* ======================================= */}

                  <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-4">

                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300/80">
                        Racecourse
                      </div>

                      <div className="mt-1 text-2xl font-black uppercase text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                        {track || "—"}
                      </div>
                    </div>

                    <div
                      className={`rounded-lg border px-3 py-1.5 text-xs font-black ${
                        surface === "Turf"
                          ? "border-emerald-400/60 bg-emerald-950/80 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.20)]"
                          : "border-amber-400/60 bg-amber-950/80 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.20)]"
                      }`}
                    >
                      {surface}
                    </div>

                  </div>

                </div>

                <div className="mt-5 grid grid-cols-2 gap-x-8">

                  {/* LEFT */}
                  <div className="space-y-1">

                    {/* SURFACE */}
                    <div className="grid min-h-[58px] grid-cols-[38px_78px_minmax(0,1fr)] items-center gap-2">

                      <div className="flex items-center justify-center text-cyan-300">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-7 w-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m3 7 9 5 9-5-9-5-9 5Z" />
                          <path d="m3 12 9 5 9-5" />
                          <path d="m3 17 9 5 9-5" />
                        </svg>
                      </div>

                      <span className="text-xs font-semibold text-blue-100/80">
                        Surface
                      </span>

                      <select
                        value={surface}
                        onChange={(e) =>
                          setSurface(e.target.value as typeof surface)
                        }
                        className="w-full rounded-lg border border-blue-600/70 bg-[#081426]/85 px-3 py-2 text-sm font-semibold text-white outline-none hover:border-blue-400/80 focus:border-cyan-400"
                      >
                        <option value="Turf">Turf</option>
                        <option value="Dirt">Dirt</option>
                      </select>

                    </div>

                    {/* DISTANCE */}
                    <div className="grid min-h-[58px] grid-cols-[38px_78px_minmax(0,1fr)] items-center gap-2">

                      <div className="flex items-center justify-center text-cyan-300">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-7 w-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M8 3 5 21" />
                          <path d="M16 3 19 21" />
                          <path d="M12 4v3" />
                          <path d="M12 10v4" />
                          <path d="M12 17v3" />
                        </svg>
                      </div>

                      <span className="text-xs font-semibold text-blue-100/80">
                        Distance
                      </span>

                      <input
                        type="number"
                        value={distance}
                        onChange={(e) =>
                          setDistance(e.target.value)
                        }
                        className="w-full rounded-lg border border-blue-600/70 bg-[#081426]/85 px-3 py-2 text-sm font-semibold text-white outline-none hover:border-blue-400/80 focus:border-cyan-400"
                      />

                    </div>

                    {/* LENGTH */}
                    <div className="grid min-h-[58px] grid-cols-[38px_78px_minmax(0,1fr)] items-center gap-2">

                      <div className="flex items-center justify-center text-cyan-300">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-7 w-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 12h18" />
                          <path d="m7 8-4 4 4 4" />
                          <path d="m17 8 4 4-4 4" />
                        </svg>
                      </div>

                      <span className="text-xs font-semibold text-blue-100/80">
                        Length
                      </span>

                      <select
                        value={length}
                        onChange={(e) =>
                          setLength(e.target.value as typeof length)
                        }
                        className="w-full rounded-lg border border-blue-600/70 bg-[#081426]/85 px-3 py-2 text-sm font-semibold text-white outline-none hover:border-blue-400/80 focus:border-cyan-400"
                      >
                        <option value="Short">Short</option>
                        <option value="Mile">Mile</option>
                        <option value="Medium">Medium</option>
                        <option value="Long">Long</option>
                      </select>

                    </div>

                  </div>

                  {/* RIGHT */}
                  <div className="space-y-1">

                    {/* DIRECTION */}
                    <div className="grid min-h-[42px] grid-cols-[38px_78px_minmax(0,1fr)] items-center gap-2">

                      <div className="flex items-center justify-center text-cyan-300">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-7 w-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 18c0-6 3-10 10-10h4" />
                          <path d="m15 4 4 4-4 4" />
                        </svg>
                      </div>

                      <span className="text-xs font-semibold text-blue-100/80">
                        Direction
                      </span>

                      <select
                        value={direction}
                        onChange={(e) =>
                          setDirection(e.target.value as typeof direction)
                        }
                        className="w-full rounded-lg border border-blue-600/70 bg-[#081426]/85 px-3 py-2 text-sm font-semibold text-white outline-none hover:border-blue-400/80 focus:border-cyan-400"
                      >
                        <option value="Left">Left</option>
                        <option value="Right">Right</option>
                        <option value="Straight">Straight</option>
                      </select>

                    </div>

                    {/* WEATHER */}
                    <div className="grid min-h-[42px] grid-cols-[38px_78px_minmax(0,1fr)] items-center gap-2">

                      <div className="flex items-center justify-center text-cyan-300">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-7 w-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="4" />
                          <path d="M12 2v2" />
                          <path d="M12 20v2" />
                          <path d="M2 12h2" />
                          <path d="M20 12h2" />
                          <path d="m4.9 4.9 1.5 1.5" />
                          <path d="m17.6 17.6 1.5 1.5" />
                          <path d="m19.1 4.9-1.5 1.5" />
                          <path d="m6.4 17.6-1.5 1.5" />
                        </svg>
                      </div>

                      <span className="text-xs font-semibold text-blue-100/80">
                        Weather
                      </span>

                      <select
                        value={weather}
                        onChange={(e) =>
                          setWeather(e.target.value as typeof weather)
                        }
                        className="w-full rounded-lg border border-blue-600/70 bg-[#081426]/85 px-3 py-2 text-sm font-semibold text-white outline-none hover:border-blue-400/80 focus:border-cyan-400"
                      >
                        <option value="Sunny">Sunny</option>
                        <option value="Cloudy">Cloudy</option>
                        <option value="Rainy">Rainy</option>
                        <option value="Snowy">Snowy</option>
                      </select>

                    </div>

                    {/* SEASON */}
                    <div className="grid min-h-[42px] grid-cols-[38px_78px_minmax(0,1fr)] items-center gap-2">

                      <div className="flex items-center justify-center text-cyan-300">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-7 w-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
                          <path d="M3.5 9h17" />
                          <path d="M8 3v4" />
                          <path d="M16 3v4" />
                        </svg>
                      </div>

                      <span className="text-xs font-semibold text-blue-100/80">
                        Season
                      </span>

                      <select
                        value={season}
                        onChange={(e) =>
                          setSeason(e.target.value as typeof season)
                        }
                        className="w-full rounded-lg border border-blue-600/70 bg-[#081426]/85 px-3 py-2 text-sm font-semibold text-white outline-none hover:border-blue-400/80 focus:border-cyan-400"
                      >
                        <option value="Spring">Spring</option>
                        <option value="Summer">Summer</option>
                        <option value="Autumn">Autumn</option>
                        <option value="Winter">Winter</option>
                      </select>

                    </div>

                    {/* CONDITION */}
                    <div className="grid min-h-[42px] grid-cols-[38px_78px_minmax(0,1fr)] items-center gap-2">

                      <div className="flex items-center justify-center text-cyan-300">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-7 w-7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 18h18" />
                          <path d="m5 18 4-7 3 4 3-6 4 9" />
                        </svg>
                      </div>

                      <span className="text-xs font-semibold text-blue-100/80">
                        Condition
                      </span>

                      <select
                        value={condition}
                        onChange={(e) =>
                          setCondition(e.target.value as typeof condition)
                        }
                        className="w-full rounded-lg border border-blue-600/70 bg-[#081426]/85 px-3 py-2 text-sm font-semibold text-white outline-none hover:border-blue-400/80 focus:border-cyan-400"
                      >
                        <option value="Firm">Firm</option>
                        <option value="Good">Good</option>
                        <option value="Yielding">Yielding</option>
                        <option value="Soft">Soft</option>
                        <option value="Heavy">Heavy</option>
                      </select>

                    </div>

                  </div>
                </div>

              </section>

            </div>

            {/* ======================================= */}
            {/* RIGHT COLUMN - UMAMUSUME */}
            {/* ======================================= */}

            <section
              data-guide="cm-team-lineup"
              className="relative overflow-hidden rounded-2xl border border-violet-500/55 bg-[#080d21]/85 p-5 shadow-[0_0_18px_rgba(139,92,246,0.20),0_0_38px_rgba(124,58,237,0.10),inset_0_0_18px_rgba(139,92,246,0.035)] backdrop-blur-sm"
            >

              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/70 to-transparent" />

              {/* HEADER */}
              <div className="mb-5 flex items-start justify-between">

                <div className="flex items-start gap-3">

                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-[44px] leading-none text-violet-300 drop-shadow-[0_0_5px_rgba(167,139,250,0.4)]">
                    ♞
                  </div>

                  <div>
                    <div className="text-xl font-black text-white">
                      Umamusume Team Lineup
                    </div>

                    <div className="mt-1 text-xs font-medium text-violet-200/45">
                      Update the runners for this Champions Meeting.
                    </div>
                  </div>

                </div>

                <div className="pt-1 text-[10px] font-black uppercase tracking-[0.2em] text-violet-200/50">
                  {umas.filter((uma) => uma.id !== "").length} / 3 Selected
                </div>

              </div>

              {/* LINEUP */}
              <div className="relative">

                <div
                  className={
                    isLineupLocked
                      ? "pointer-events-none select-none opacity-15"
                      : ""
                  }
                >
                  <div className="space-y-4">
                    {umas.map((uma, index) => (
                      <UmaForm
                        key={index}
                        number={index + 1}
                        value={uma}
                        selectedUmas={umas}
                        onChange={(updatedUma) => {
                          setUmas((current) =>
                            current.map((item, i) =>
                              i === index
                                ? updatedUma
                                : item
                            )
                          )
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* LOCKED LINEUP OVERLAY */}
                {isLineupLocked && (
                <div className="absolute inset-0 z-40 flex items-center justify-center">
                  <div
                    className="
                      flex min-w-[460px] max-w-[90%]
                      flex-col items-center justify-center
                      rounded-xl
                      border border-violet-300/15
                      bg-[#07101f]/94
                      px-7 py-5
                      text-center
                      shadow-[0_18px_50px_rgba(0,0,0,0.60),0_0_28px_rgba(139,92,246,0.10)]
                      backdrop-blur-md
                    "
                  >
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-violet-300/15 bg-violet-400/[0.05] text-violet-200/75">
                      {cm.phase === "eliminated" ? (
                        <svg
                          viewBox="0 0 24 24"
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="9" />
                          <path d="M8 8l8 8" />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect x="5" y="10" width="14" height="10" rx="2" />
                          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                        </svg>
                      )}
                    </div>

                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-200/45">
                      Team Lineup Locked
                    </div>

                    <div className="mt-1.5 text-sm font-semibold text-white/80">
                      {cm.phase === "eliminated"
                        ? "Team Lineup cannot be changed after elimination."
                        : "Team Lineup cannot be changed after proceeding to the Final."}
                    </div>
                  </div>
                </div>
              )}

              </div>

            </section>

          </div>

          {/* ======================================= */}
          {/* FOOTER */}
          {/* ======================================= */}

          <div className="-mt-5 flex items-center justify-end gap-2.5">

            {/* SAVE STATUS */}
            <div className="mr-2 min-w-[80px] text-right text-xs font-bold text-emerald-300/80">
              {isSaved && (
              <div className="mr-1 flex h-8 items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3 text-xs font-bold text-emerald-300">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>

                Saved
              </div>
            )}
            </div>

            {/* CANCEL */}
            <button
              type="button"
              onClick={onClose}
              className="
                flex h-10 min-w-[100px]
                items-center justify-center
                rounded-lg
                border border-white/10
                bg-[#081426]/70
                px-5
                text-sm font-bold text-white/55
                transition-all duration-200
                hover:border-white/20
                hover:bg-white/[0.04]
                hover:text-white/85
                active:scale-[0.98]
              "
            >
              Cancel
            </button>

            {/* SAVE */}
            <button
              type="button"
              onClick={handleSave}
              className="
                flex h-10 min-w-[140px]
                items-center justify-center gap-2
                rounded-lg
                border border-cyan-300/45
                bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600
                px-5
                text-sm font-extrabold text-white
                shadow-[0_0_16px_rgba(34,211,238,0.16),0_0_24px_rgba(124,58,237,0.12),inset_0_1px_0_rgba(255,255,255,0.14)]
                transition-all duration-200
                hover:border-cyan-200/70
                hover:brightness-110
                hover:shadow-[0_0_20px_rgba(34,211,238,0.24),0_0_30px_rgba(124,58,237,0.18),inset_0_1px_0_rgba(255,255,255,0.16)]
                active:scale-[0.98]
              "
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 4h12l2 2v14H5V4Z" />
                <path d="M8 4v6h8V4" />
                <path d="M8 20v-6h8v6" />
              </svg>

              Save Changes
            </button>

          </div>

        </div>

      </div>
    </div>
  </ModalPortal>
)
}

export default EditCMModal
import { useState } from "react"
import type { CM, CMUma } from "../types/types"
import EventBasicInformation from "../components/event-form/EventBasicInformation"
import EventTrackInformation from "../components/event-form/EventTrackInformation"
import EventTeamLineup from "../components/event-form/EventTeamLineup"
import EventCreationModal from "../components/event-form/EventCreationModal"
import { createEmptyUmaFormData } from "../components/event-form/eventFormData"
import type { UmaFormData } from "../components/event-form/eventFormData"
import { normalizeRunningStyle } from "./cmParticipantConfiguration"

type AddCMButtonProps = {
  cms: CM[]
  setCms: React.Dispatch<React.SetStateAction<CM[]>>
  onCreated?: () => void
}

function AddCMButton({
  cms,
  setCms,
  onCreated,
}: AddCMButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [cmNumber, setCmNumber] = useState("")
  const [cmName, setCmName] = useState("")
  const [league, setLeague] =
    useState<CM["league"]>("Graded League")

  const cmNumberExists =
    cmNumber !== "" &&
    cms.some((cm) => cm.number === Number(cmNumber))

  const [track, setTrack] = useState("")
  const [surface, setSurface] = useState("Turf")
  const [distance, setDistance] = useState("")
  const [length, setLength] = useState("Short")
  const [direction, setDirection] = useState("Left")
  const [weather, setWeather] = useState("Sunny")
  const [season, setSeason] = useState("Spring")
  const [condition, setCondition] = useState("Firm")

  const [umas, setUmas] = useState<UmaFormData[]>([
    createEmptyUmaFormData(),
    createEmptyUmaFormData(),
    createEmptyUmaFormData(),
  ])

  const canCreateCM =
    cmNumber !== "" && !cmNumberExists && track !== "" &&
    Number.isFinite(Number(distance)) && Number(distance) > 0

  const resetForm = () => {
    setCmNumber("")
    setCmName("")
    setLeague("Graded League")

    setTrack("")
    setSurface("Turf")
    setDistance("")
    setLength("Short")
    setDirection("Left")
    setWeather("Sunny")
    setSeason("Spring")
    setCondition("Firm")

    setUmas([
      createEmptyUmaFormData(),
      createEmptyUmaFormData(),
      createEmptyUmaFormData(),
    ])
  }

  const handleCreateCM = () => {
    if (cmNumber === "") {
      return
    }

    if (cmNumberExists) {
      return
    }

    if (!canCreateCM) {
      return
    }

    const newParticipants: CMUma[] = umas.filter((uma) => uma.id !== "").map(
      (uma, index) => ({
        cmUmaId: `cm${cmNumber}-uma-${index + 1}`,
        umaId: uma.id,
        runningStyle: normalizeRunningStyle(uma.style),
        ace: uma.ace,
        debuffer: uma.debuffer,
        won: false,
        autoRun: uma.autoRun,
        finalParticipant: false,
      })
    )

    const newCM: CM = {
      number: Number(cmNumber),
      name: cmName,
      league,
      track,
      surface: surface as CM["surface"],
      distance: Number(distance),
      length: length as CM["length"],
      direction: direction as CM["direction"],
      weather: weather as CM["weather"],
      season: season as CM["season"],
      condition: condition as CM["condition"],

      participants: newParticipants,

      currentLineup: newParticipants.map(
        (participant) => participant.cmUmaId
      ),

      attempts: [],

      log: [
        {
          id: `cm${cmNumber}-created-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: "created",
          message: "CM created.",
        },
      ],

      phase: "attempts",

      finalPlace: "",
    }

    setCms((current) => [...current, newCM])
    onCreated?.()

    resetForm()
    setLeague("Graded League")
    setIsOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="
        rounded-xl
        border border-sky-500/70
        bg-gradient-to-b from-blue-950/95 to-slate-950/95
        px-5 py-3
        text-base font-bold text-sky-200
        shadow-[0_0_12px_rgba(56,189,248,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]
        transition
        hover:border-sky-300
        hover:from-blue-900
        hover:to-blue-950
        hover:text-white
        hover:shadow-[0_0_18px_rgba(56,189,248,0.22)]
      "
      >
        Add CM
      </button>

      {isOpen &&
        <EventCreationModal onClose={() => { resetForm(); setLeague("Graded League"); setIsOpen(false) }} onCreate={handleCreateCM} canCreate={canCreateCM}>
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[0.95fr_1.05fr]">

            {/* ======================================= */}
            {/* LEFT COLUMN */}
            {/* ======================================= */}

            <div className="space-y-5">

              {/* BASIC INFORMATION */}
              <EventBasicInformation
                eventNumber={cmNumber} eventName={cmName} numberExists={cmNumberExists}
                setEventNumber={setCmNumber} setEventName={setCmName}
                league={league} onLeagueChange={setLeague}
              />
              {/* ======================================= */}
              {/* TRACK INFORMATION */}
              {/* ======================================= */}

              <EventTrackInformation
                track={track} setTrack={setTrack}
                surface={surface} setSurface={setSurface}
                distance={distance} setDistance={setDistance}
                length={length} setLength={setLength}
                direction={direction} setDirection={setDirection}
                weather={weather} setWeather={setWeather}
                season={season} setSeason={setSeason}
                condition={condition} setCondition={setCondition}
              />
            </div>

            {/* ======================================= */}
            {/* RIGHT COLUMN - UMAS */}
            {/* ======================================= */}

            <EventTeamLineup umas={umas} setUmas={setUmas} />

          </div>
        </EventCreationModal>}
    </>
  )
}

export default AddCMButton

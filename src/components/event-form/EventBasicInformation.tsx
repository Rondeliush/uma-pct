import type { CM } from "../../types/types"

type Props = {
  eventType?: "CM" | "LoH"
  eventNumber: string
  eventName: string
  numberExists: boolean
  setEventNumber: (value: string) => void
  setEventName: (value: string) => void
  league?: CM["league"]
  onLeagueChange?: (value: CM["league"]) => void
}

export default function EventBasicInformation({ eventType = "CM", eventNumber, eventName, numberExists, setEventNumber, setEventName, league, onLeagueChange }: Props) {
  const isLoH = eventType === "LoH"
  const setLeague = (value: CM["league"]) => onLeagueChange?.(value)
  return (
    <section className={`relative overflow-hidden rounded-2xl border bg-[#071426]/85 p-4 md:p-5 backdrop-blur-sm ${isLoH ? "border-rose-500/55 shadow-[0_0_18px_rgba(244,63,94,0.20),0_0_38px_rgba(244,63,94,0.10),inset_0_0_18px_rgba(244,63,94,0.035)]" : "border-sky-500/55 shadow-[0_0_18px_rgba(14,165,233,0.20),0_0_38px_rgba(37,99,235,0.10),inset_0_0_18px_rgba(14,165,233,0.035)]"}`}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${isLoH ? "via-rose-400/70" : "via-sky-400/70"}`} />

      {/* HEADER */}
      <div className="mb-5 flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center ${isLoH ? "text-rose-300 drop-shadow-[0_0_5px_rgba(244,63,94,0.4)]" : "text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]"}`}>
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

          <div className={`mt-1 text-xs font-medium ${isLoH ? "text-rose-200/45" : "text-blue-200/45"}`}>
            Set the basic details for this {eventType === "CM" ? "Champions Meeting" : "League of Heroes"}.
          </div>
        </div>
      </div>

      <div className="space-y-4">

        {/* CM NUMBER + LEAGUE */}
        <div className={eventType === "CM" ? "grid grid-cols-[110px_minmax(0,1fr)] gap-3 md:grid-cols-[1fr_220px] md:gap-4" : "grid grid-cols-1"}>

          {/* CM NUMBER */}
          <div>
            <label className={`mb-1.5 flex items-center gap-2 text-sm font-semibold ${isLoH ? "text-rose-100/80" : "text-blue-100/80"}`}>
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 ${isLoH ? "text-rose-300" : "text-cyan-300"}`}
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

              {eventType} Number
            </label>

            <input
              type="text"
              inputMode="numeric"
              value={eventNumber}
              onChange={(e) => {
                const value = e.target.value

                if (
                  value === "" ||
                  /^[1-9]\d*$/.test(value)
                ) {
                  setEventNumber(value)
                }
              }}
              aria-label={`${eventType} Number`}
              placeholder={eventType === "CM" ? "e.g. 18" : "e.g. 1"}
              className={isLoH ? (`
                w-full
                rounded-lg
                border
                bg-[#081426]/85
                px-4 py-2.5
                text-sm font-semibold text-white
                shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]
                outline-none
                transition-all duration-200
                placeholder:text-rose-200/30
                ${numberExists
                  ? "border-red-500/70 shadow-[0_0_12px_rgba(239,68,68,0.10)] focus:border-red-400"
                  : "border-rose-600/70 hover:border-rose-400/80 focus:border-rose-400 focus:shadow-[0_0_12px_rgba(244,63,94,0.10)]"
                }
              `) : (`
                w-full
                rounded-lg
                border
                bg-[#081426]/85
                px-4 py-2.5
                text-sm font-semibold text-white
                shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]
                outline-none
                transition-all duration-200
                placeholder:text-blue-200/30
                ${numberExists
                  ? "border-red-500/70 shadow-[0_0_12px_rgba(239,68,68,0.10)] focus:border-red-400"
                  : "border-blue-600/70 hover:border-blue-400/80 focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(34,211,238,0.10)]"
                }
              `)}
            />

            {/* RESERVED ERROR SPACE */}
            <div className="mt-1 min-h-[20px]">
              {numberExists && (
                <div className="flex items-center gap-1.5 text-sm leading-5 text-red-400">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v6" />
                    <path d="M12 17h.01" />
                  </svg>

                  {eventType} {eventNumber} already exists.
                </div>
              )}
            </div>
          </div>

          {/* LEAGUE */}
          {eventType === "CM" && (<div>
            <label className={`mb-1.5 flex items-center gap-2 text-sm font-semibold ${isLoH ? "text-rose-100/80" : "text-blue-100/80"}`}>
              <svg
                viewBox="0 0 24 24"
                className={`h-4 w-4 ${isLoH ? "text-rose-300" : "text-cyan-300"}`}
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
                setLeague(
                  e.target.value as CM["league"]
                )
              }
              className={`w-full rounded-lg border bg-[#081426]/85 px-4 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition-all duration-200 ${isLoH ? "border-rose-600/70 hover:border-rose-400/80 focus:border-rose-400 focus:shadow-[0_0_12px_rgba(244,63,94,0.10)]" : "border-blue-600/70 hover:border-blue-400/80 focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(34,211,238,0.10)]"}`}
            >
              <option value="Graded League">
                Graded League
              </option>

              <option value="Open League">
                Open League
              </option>
            </select>
          </div>)}
        </div>

        {/* CM NAME */}
        <div>
          <label className={`mb-1.5 flex items-center gap-2 text-sm font-semibold ${isLoH ? "text-rose-100/80" : "text-blue-100/80"}`}>
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 ${isLoH ? "text-rose-300" : "text-cyan-300"}`}
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

            {eventType} Name
          </label>

          <input
            type="text"
            value={eventName}
            onChange={(e) =>
              setEventName(e.target.value)
            }
            aria-label={`${eventType} Name`}
            placeholder={eventType === "CM" ? "e.g. Scorpio Cup" : "e.g. League of Heroes #1"}
            className={`w-full rounded-lg border bg-[#081426]/85 px-4 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition-all duration-200 ${isLoH ? "border-rose-600/70 placeholder:text-rose-200/30 hover:border-rose-400/80 focus:border-rose-400 focus:shadow-[0_0_12px_rgba(244,63,94,0.10)]" : "border-blue-600/70 placeholder:text-blue-200/30 hover:border-blue-400/80 focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(34,211,238,0.10)]"}`}
          />
        </div>

      </div>
    </section>
  )
}

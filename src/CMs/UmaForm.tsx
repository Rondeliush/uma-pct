import { useEffect, useState } from "react"
import type { UmaStyle } from "../types/types"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UmaAvatarImage from "../components/UmaAvatarImage"

type UmaFormData = {
  id: string
  name: string
  style: UmaStyle | ""
  ace: boolean
  debuffer: boolean
  autoRun: boolean
}

type UmaFormProps = {
  number: number
  value: UmaFormData
  selectedUmas: UmaFormData[]
  onChange: (value: UmaFormData) => void
}

function UmaForm({
  number,
  value,
  selectedUmas,
  onChange,
}: UmaFormProps) {
  const {
    characters: umaCharacters,
    versions: umaVersions,
  } = useUmaDatabase()

  const [searchText, setSearchText] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const selectedVersion = umaVersions.find(
    (version) => version.id === value.id
  )

  /* ======================================= */
  /* STYLE VISUALS */
  /* ======================================= */

  const umaCardClasses: Record<UmaStyle, string> = {
    Runaway:
      "border-violet-400/85 bg-gradient-to-r from-violet-950/95 via-purple-950/85 to-gray-950 shadow-[0_0_18px_rgba(168,85,247,0.38),0_0_38px_rgba(168,85,247,0.16),inset_0_0_18px_rgba(168,85,247,0.08)]",

    "Front Runner":
      "border-blue-400/85 bg-gradient-to-r from-blue-950/95 via-blue-950/85 to-gray-950 shadow-[0_0_18px_rgba(59,130,246,0.38),0_0_38px_rgba(59,130,246,0.16),inset_0_0_18px_rgba(59,130,246,0.08)]",

    "Pace Chaser":
      "border-emerald-400/85 bg-gradient-to-r from-emerald-950/95 via-emerald-950/85 to-gray-950 shadow-[0_0_18px_rgba(16,185,129,0.38),0_0_38px_rgba(16,185,129,0.16),inset_0_0_18px_rgba(16,185,129,0.08)]",

    "Late Surger":
      "border-amber-400/85 bg-gradient-to-r from-amber-950/95 via-amber-950/85 to-gray-950 shadow-[0_0_18px_rgba(245,158,11,0.38),0_0_38px_rgba(245,158,11,0.16),inset_0_0_18px_rgba(245,158,11,0.08)]",

    "End Closer":
      "border-rose-400/85 bg-gradient-to-r from-rose-950/95 via-red-950/85 to-gray-950 shadow-[0_0_18px_rgba(244,63,94,0.38),0_0_38px_rgba(244,63,94,0.16),inset_0_0_18px_rgba(244,63,94,0.08)]",
  }

  const styleBadgeClasses: Record<UmaStyle, string> = {
    Runaway:
      "border-violet-300/90 bg-gradient-to-r from-violet-500/25 to-violet-950/55 text-violet-100 shadow-[0_0_12px_rgba(168,85,247,0.55),inset_0_0_12px_rgba(168,85,247,0.12)]",

    "Front Runner":
      "border-blue-300/90 bg-gradient-to-r from-blue-500/25 to-blue-950/55 text-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.55),inset_0_0_12px_rgba(59,130,246,0.12)]",

    "Pace Chaser":
      "border-emerald-300/90 bg-gradient-to-r from-emerald-500/25 to-emerald-950/55 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.55),inset_0_0_12px_rgba(16,185,129,0.12)]",

    "Late Surger":
      "border-amber-300/90 bg-gradient-to-r from-amber-500/25 to-amber-950/55 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.55),inset_0_0_12px_rgba(245,158,11,0.12)]",

    "End Closer":
      "border-rose-300/90 bg-gradient-to-r from-rose-500/25 to-rose-950/55 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.55),inset_0_0_12px_rgba(244,63,94,0.12)]",
  }

  const styleArrowGlowClasses: Record<
    UmaStyle,
    string
  > = {
    Runaway:
      "text-violet-100 drop-shadow-[0_0_7px_rgba(196,181,253,1)]",

    "Front Runner":
      "text-blue-100 drop-shadow-[0_0_7px_rgba(147,197,253,1)]",

    "Pace Chaser":
      "text-emerald-100 drop-shadow-[0_0_7px_rgba(110,231,183,1)]",

    "Late Surger":
      "text-amber-100 drop-shadow-[0_0_7px_rgba(252,211,77,1)]",

    "End Closer":
      "text-rose-100 drop-shadow-[0_0_7px_rgba(253,164,175,1)]",
  }

  const cardClasses =
    value.style !== ""
      ? umaCardClasses[value.style]
      : "border-gray-700 bg-gray-950/90"

  const badgeClasses =
    value.style !== ""
      ? styleBadgeClasses[value.style]
      : "border-gray-600 bg-gray-800/60 text-gray-300"

  /* ======================================= */
  /* SEARCH */
  /* ======================================= */

  useEffect(() => {
    const selectedVersion = umaVersions.find(
      (version) => version.id === value.id
    )

    setSearchText(
      selectedVersion?.displayName ?? ""
    )
  }, [value.id, umaVersions])

  const availableUmaVersions =
    umaVersions.filter((version) => {
      if (
        version.archived &&
        version.id !== value.id
      ) {
        return false
      }

      return !selectedUmas.some(
        (selectedUma) => {
          if (selectedUma.id === "") {
            return false
          }

          if (selectedUma.id === value.id) {
            return false
          }

          const selectedVersion =
            umaVersions.find(
              (item) =>
                item.id === selectedUma.id
            )

          if (!selectedVersion) {
            return false
          }

          return (
            selectedVersion.characterId ===
            version.characterId
          )
        }
      )
    })

  const suggestedUmaVersions =
    searchText.trim() === ""
      ? []
      : availableUmaVersions.filter(
          (version) =>
            version.displayName
              .toLowerCase()
              .includes(
                searchText
                  .toLowerCase()
                  .trim()
              )
        )

  const selectUma = (
    versionId: string
  ) => {
    const selectedVersion =
      umaVersions.find(
        (version) =>
          version.id === versionId
      )

    if (!selectedVersion) {
      return
    }

    const selectedCharacter =
      umaCharacters.find(
        (character) =>
          character.id ===
          selectedVersion.characterId
      )

    if (!selectedCharacter) {
      return
    }

    onChange({
      ...value,
      id: selectedVersion.id,
      name: selectedCharacter.name,
    })

    setSearchText(
      selectedVersion.displayName
    )

    setIsSearching(false)
  }

  const restoreSelectedUma = () => {
    const selectedVersion =
      umaVersions.find(
        (version) =>
          version.id === value.id
      )

    setSearchText(
      selectedVersion?.displayName ?? ""
    )

    setIsSearching(false)
  }

  return (
    <div
  className={`relative min-h-[170px] rounded-xl border transition-[border-color,box-shadow,background-color] duration-300 ${
    isSearching ? "z-50" : "z-0"
  } ${cardClasses}`}
>
      {/* ======================================= */}
      {/* CHARACTER ART - CLIPPED TO CARD */}
      {/* ======================================= */}

      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-xl">
        <div className="absolute bottom-0 left-0 h-full w-[245px]">
          {/* SLOT NUMBER */}
          <div className="absolute left-3 top-3 z-30 text-3xl font-black italic text-white/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            {String(number).padStart(
              2,
              "0"
            )}
          </div>

          {selectedVersion?.avatar ? (
            <div
              className="absolute bottom-0 left-[8px] h-[235px] w-[255px]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, black 0%, black 78%, rgba(0,0,0,0.95) 84%, rgba(0,0,0,0.55) 92%, transparent 100%)",
                maskImage:
                  "linear-gradient(to right, black 0%, black 78%, rgba(0,0,0,0.95) 84%, rgba(0,0,0,0.55) 92%, transparent 100%)",
              }}
            >
              <UmaAvatarImage
                avatar={selectedVersion.avatar}
                alt={selectedVersion.displayName}
                className="h-full w-full object-contain object-bottom drop-shadow-[0_8px_14px_rgba(0,0,0,0.7)]"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">

              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-violet-400/5 blur-xl" />

                <div className="relative text-[52px] leading-none text-violet-200/15 drop-shadow-[0_0_10px_rgba(167,139,250,0.12)]">
                  ♞
                </div>
              </div>

              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-violet-100/25">
                Select Umamusume
              </div>

              <div className="mt-1 text-[9px] font-semibold text-violet-200/15">
                Search by name
              </div>

            </div>
            
          )}
        </div>
      </div>

      {/* ======================================= */}
      {/* CONTENT */}
      {/* ======================================= */}

      <div className="relative min-h-[190px] pl-[255px] pr-4 py-3">
        <div className="relative z-20 flex min-h-[146px] min-w-0 flex-col">

          {/* ======================================= */}
          {/* UMA NAME / SEARCH */}
          {/* ======================================= */}

          <div className="relative">
            <div className="group relative">

              {/* SEARCH ICON - ONLY WHEN EMPTY */}
              {!selectedVersion && (
                <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-violet-200/35">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="m16 16 4 4" />
                  </svg>
                </div>
              )}

              <input
                type="text"
                value={searchText}
                placeholder="Search"
                onFocus={() => {
                  setIsSearching(true)
                  setSearchText("")
                }}
                onChange={(e) => {
                  setSearchText(e.target.value)
                  setIsSearching(true)
                }}
                onBlur={restoreSelectedUma}
                className={`
                  h-[42px]
                  rounded-lg
                  px-3
                  outline-none
                  transition-all duration-200

                  ${
                    selectedVersion
                      ? `
                        w-full
                        border border-transparent
                        bg-transparent
                        text-[17px] font-extrabold
                        tracking-[-0.01em]
                        text-white/95

                        hover:bg-white/[0.04]

                        focus:border-white/10
                        focus:bg-black/20
                      `
                      : `
                        ml-auto w-[300px]
                        border border-white/10
                        bg-black/10
                        pl-10
                        text-sm font-semibold
                        text-white/80
                        placeholder:text-white/30

                        hover:border-violet-300/25
                        hover:bg-white/[0.03]

                        focus:border-violet-300/45
                        focus:bg-black/20
                      `
                  }
                `}
              />

              {/* HOVER HINT - ONLY WHEN UMA IS SELECTED */}
              {selectedVersion && (
                <div
                  className="
                    pointer-events-none
                    absolute right-3 top-1/2
                    -translate-y-1/2
                    text-white/0
                    transition-all duration-200
                    group-hover:text-white/25
                  "
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="m16 16 4 4" />
                  </svg>
                </div>
              )}

            </div>

            {/* SEARCH RESULTS */}
            {isSearching &&
              searchText.trim() !== "" && (
                <div
                  className="
                    absolute left-0 right-0 top-full
                    z-[100]
                    mt-1
                    max-h-60
                    overflow-y-auto
                    rounded-xl
                    border border-white/10
                    bg-[#050d1a]/98
                    p-1
                    shadow-[0_18px_45px_rgba(0,0,0,0.85)]
                    backdrop-blur-xl
                  "
                >
                  {suggestedUmaVersions.length > 0 ? (
                    suggestedUmaVersions.map((version) => (
                      <button
                        key={version.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          selectUma(version.id)
                        }}
                        className="
                          group/result
                          flex w-full
                          items-center gap-3
                          rounded-lg
                          px-2.5 py-2
                          text-left text-sm
                          text-gray-300
                          transition
                          hover:bg-white/[0.06]
                          hover:text-white
                        "
                      >
                        {version.avatar ? (
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30">
                            <UmaAvatarImage
                              avatar={version.avatar}
                              alt=""
                              className="h-full w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-xl text-white/15">
                            ♞
                          </div>
                        )}

                        <span className="min-w-0 truncate font-semibold">
                          {version.displayName}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-sm text-white/30">
                      No matching Umamusume
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* ======================================= */}
          {/* STYLE */}
          {/* ======================================= */}

          <div className="mt-1 flex items-center gap-2 pl-3">
              {/* STYLE NAME */}
              <div className="w-[112px] shrink-0">
                <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
                  Running Style
                </div>

                <div className="mt-0.5 whitespace-nowrap text-[13px] font-extrabold uppercase tracking-[0.025em] text-white/85">
                {value.style}
              </div>
              </div>

              {/* STYLE SELECTOR */}
              <div
                className={`
                  flex h-[32px] w-[112px]
                  shrink-0
                  items-center justify-center
                  rounded-xl
                  border
                  px-1.5
                  ${badgeClasses}
                `}
              >
              <div className="flex items-center gap-0">
                {(
                  [
                    "End Closer",
                    "Late Surger",
                    "Pace Chaser",
                    "Front Runner",
                    "Runaway",
                  ] as UmaStyle[]
                ).map((style) => {
                  const isActive =
                    value.style === style

                  const arrowClass =
                    isActive
                      ? styleArrowGlowClasses[style]
                      : "text-white/12 hover:text-white/30"

                  return (
                    <button
                      key={style}
                      type="button"
                      title={style}
                      onClick={() =>
                        onChange({
                          ...value,
                          style,
                        })
                      }
                      className={`
                        flex shrink-0 items-center justify-center
                        rounded-md
                        transition-all duration-200
                        ${
                          isActive
                            ? "h-7 w-7 bg-white/[0.10] shadow-[0_0_10px_rgba(255,255,255,0.12)]"
                            : "h-5 w-[14px] hover:bg-white/[0.04]"
                        }
                      `}
                    >
                      <svg
                        viewBox="0 0 10 18"
                        className={`
                        shrink-0
                        transition-all duration-200
                        ${arrowClass}
                        ${
                          isActive
                            ? "h-5 w-3"
                            : "h-3.5 w-[7px]"
                        }
                      `}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={
                          isActive ? 3.4 : 2
                        }
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m2 2 5.5 7-5.5 7" />
                      </svg>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ======================================= */}
          {/* OPTIONS */}
          {/* ======================================= */}

          <div className="mt-3 flex justify-start pl-3">
            <div className="flex items-center gap-2">

              {/* ACE */}
              <button
                type="button"
                aria-pressed={value.ace}
                onClick={() =>
                  onChange({
                    ...value,
                    ace: !value.ace,
                  })
                }
                className={`
                  group flex h-9 items-center gap-2
                  rounded-lg border px-3.5
                  text-xs font-bold
                  transition-all duration-200
                  ${
                    value.ace
                      ? "border-yellow-400/60 bg-yellow-400/15 text-yellow-100 shadow-[0_0_12px_rgba(250,204,21,0.14),inset_0_1px_0_rgba(255,255,255,0.05)]"
                      : "border-white/10 bg-black/25 text-white/70 hover:border-yellow-300/30 hover:bg-yellow-400/[0.06] hover:text-white/85"
                  }
                `}
              >
                <span
                  className={`text-sm transition-all duration-200 ${
                    value.ace
                      ? "text-yellow-300 drop-shadow-[0_0_5px_rgba(250,204,21,0.65)]"
                      : "text-white/20 group-hover:text-yellow-300/50"
                  }`}
                >
                  ★
                </span>

                <span>Ace</span>
              </button>

              {/* DEBUFFER */}
              <button
                type="button"
                aria-pressed={value.debuffer}
                onClick={() =>
                  onChange({
                    ...value,
                    debuffer: !value.debuffer,
                  })
                }
                className={`
                  group flex h-9 items-center gap-2
                  rounded-lg border px-3.5
                  text-xs font-bold
                  transition-all duration-200
                  ${
                    value.debuffer
                      ? "border-rose-400/60 bg-rose-400/15 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.14),inset_0_1px_0_rgba(255,255,255,0.05)]"
                      : "border-white/10 bg-black/25 text-white/70 hover:border-rose-300/30 hover:bg-rose-400/[0.06] hover:text-white/85"
                  }
                `}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 transition-all duration-200 ${
                    value.debuffer
                      ? "text-rose-300 drop-shadow-[0_0_5px_rgba(251,113,133,0.55)]"
                      : "text-white/20 group-hover:text-rose-300/50"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="8" />
                  <path d="M8.5 12h7" />
                </svg>

                <span>Debuffer</span>
              </button>

              {/* AUTO RUN */}
              <button
                type="button"
                aria-pressed={value.autoRun}
                onClick={() =>
                  onChange({
                    ...value,
                    autoRun: !value.autoRun,
                  })
                }
                className={`
                  group flex h-9 items-center gap-2
                  rounded-lg border px-3.5
                  text-xs font-bold
                  transition-all duration-200
                  ${
                    value.autoRun
                      ? "border-sky-400/60 bg-sky-400/15 text-sky-100 shadow-[0_0_12px_rgba(56,189,248,0.14),inset_0_1px_0_rgba(255,255,255,0.05)]"
                      : "border-white/10 bg-black/25 text-white/70 hover:border-sky-300/30 hover:bg-sky-400/[0.06] hover:text-white/85"
                  }
                `}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 transition-all duration-200 ${
                    value.autoRun
                      ? "text-sky-300 drop-shadow-[0_0_5px_rgba(56,189,248,0.55)]"
                      : "text-white/20 group-hover:text-sky-300/50"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 4V2" />
                  <path d="M9.5 2h5" />
                  <rect x="5" y="6" width="14" height="12" rx="3" />
                  <circle cx="9" cy="11" r="1" fill="currentColor" stroke="none" />
                  <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
                  <path d="M9 15h6" />
                </svg>

                <span>Auto Run</span>
              </button>

            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default UmaForm
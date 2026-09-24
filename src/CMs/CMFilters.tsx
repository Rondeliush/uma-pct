import { useEffect, useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { CM } from "../types/types"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UmaAvatarImage from "../components/UmaAvatarImage"

export type CMFinalFilter =
  | "Final A"
  | "Final B"
  | "Eliminated"

export type CMPlaceFilter =
  | "1st"
  | "2nd"
  | "3rd"

type CMFiltersProps = {
  isOpen: boolean
  selectedLengths: CM["length"][]
  setSelectedLengths: Dispatch<
    SetStateAction<CM["length"][]>
  >
  selectedSurfaces: CM["surface"][]
setSelectedSurfaces: Dispatch<
  SetStateAction<CM["surface"][]>
>

selectedRacecourses: string[]
setSelectedRacecourses: Dispatch<
  SetStateAction<string[]>
>
racecourseOptions: string[]

selectedUmaIds: string[]
setSelectedUmaIds: Dispatch<
  SetStateAction<string[]>
>
umaIdsInCms: string[]

selectedFinals: CMFinalFilter[]
  setSelectedFinals: Dispatch<
    SetStateAction<CMFinalFilter[]>
  >
  selectedPlaces: CMPlaceFilter[]
  setSelectedPlaces: Dispatch<
    SetStateAction<CMPlaceFilter[]>
  >
  filteredCount: number
  totalCount: number
}

function CMFilters({
  isOpen,
  selectedLengths,
  setSelectedLengths,
  selectedSurfaces,
  setSelectedSurfaces,
  selectedRacecourses,
  setSelectedRacecourses,
  racecourseOptions,
  selectedUmaIds,
  setSelectedUmaIds,
  umaIdsInCms,
  selectedFinals,
  setSelectedFinals,
  selectedPlaces,
  setSelectedPlaces,
  filteredCount,
  totalCount,
}: CMFiltersProps) {
const { versions } = useUmaDatabase()

const [umaSearch, setUmaSearch] =
  useState("")

const filtersRef =
  useRef<HTMLDivElement | null>(null)

const [openFilter, setOpenFilter] =
  useState<
    | "length"
    | "surface"
    | "racecourse"
    | "uma"
    | "final"
    | "place"
    | null
  >(null)

useEffect(() => {
  if (!isOpen) {
    setOpenFilter(null)
  }
}, [isOpen])

useEffect(() => {
  const handleClickOutside = (
    event: PointerEvent
  ) => {
    if (
      openFilter !== null &&
      filtersRef.current &&
      !filtersRef.current.contains(
        event.target as Node
      )
    ) {
      setOpenFilter(null)

      if (openFilter === "uma") {
        setUmaSearch("")
      }
    }
  }

  document.addEventListener(
    "pointerdown",
    handleClickOutside
  )

  return () => {
    document.removeEventListener(
      "pointerdown",
      handleClickOutside
    )
  }
}, [openFilter])

const umaOptions = versions
  .filter((version) =>
    umaIdsInCms.includes(version.id)
  )
  .sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  )

const normalizedUmaSearch =
  umaSearch.toLowerCase().trim()

const selectedUmaOptions = umaOptions.filter(
  (version) =>
    selectedUmaIds.includes(version.id)
)

const unselectedUmaOptions = umaOptions.filter(
  (version) =>
    !selectedUmaIds.includes(version.id)
)

const searchUmaOptions =
  normalizedUmaSearch === ""
    ? []
    : umaOptions.filter((version) =>
        version.displayName
          .toLowerCase()
          .includes(normalizedUmaSearch)
      )

const visibleUmaOptions =
  normalizedUmaSearch === ""
    ? [
        ...selectedUmaOptions,
        ...unselectedUmaOptions,
      ]
    : [
        ...searchUmaOptions,
        ...selectedUmaOptions.filter(
          (version) =>
            !searchUmaOptions.some(
              (result) =>
                result.id === version.id
            )
        ),
      ]

const selectedUmaName =
  selectedUmaIds.length === 1
    ? versions.find(
        (version) =>
          version.id === selectedUmaIds[0]
      )?.displayName
    : null
  return (
    <div
    ref={filtersRef}
      className={`grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out ${
        isOpen
          ? "mb-4 grid-rows-[1fr] opacity-100"
          : "mb-0 grid-rows-[0fr] opacity-0"
      }`}
    >
      <div
        className={
          isOpen
            ? "overflow-visible"
            : "overflow-hidden"
        }
      >
        <div className="relative z-40 rounded-xl border border-gray-700 bg-gray-950/70 p-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-start gap-3">

              {/* LENGTH */}
              <div className="relative w-56">
                <button
                  type="button"
                  onClick={() =>
                    setOpenFilter((current) =>
                        current === "length"
                        ? null
                        : "length"
                    )
}
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                    selectedLengths.length > 0
                      ? "border-sky-500 bg-sky-600/20 text-sky-300"
                      : "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span>
                    Length:{" "}
                    {selectedLengths.length === 0
                      ? "All"
                      : selectedLengths.length <= 2
                        ? selectedLengths.join(", ")
                        : `${selectedLengths.length} selected`}
                  </span>

                  <span className="ml-3 text-xs">
                    {openFilter === "length" ? "▲" : "▼"}
                  </span>
                </button>
            {selectedLengths.length > 0 && (
            <button
                type="button"
                onClick={() => {
                setSelectedLengths([])
                if (openFilter === "length") {
                    setOpenFilter(null)
                }
                }}
                className="absolute right-7 top-1/2 z-10 -translate-y-1/2 text-lg font-bold text-red-500 transition hover:text-red-300"
                title="Clear Length filter"
            >
                ×
            </button>
            )}
                {openFilter === "length" && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 p-2 shadow-xl">
                    {(
                      [
                        "Short",
                        "Mile",
                        "Medium",
                        "Long",
                      ] as CM["length"][]
                    ).map((length) => {
                      const checked =
                        selectedLengths.includes(length)

                      return (
                        <label
                          key={length}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-gray-300 transition hover:bg-gray-800 hover:text-white"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedLengths(
                                (current) =>
                                  current.includes(length)
                                    ? current.filter(
                                        (item) =>
                                          item !== length
                                      )
                                    : [
                                        ...current,
                                        length,
                                      ]
                              )
                            }}
                            className="accent-sky-500"
                          />

                          {length}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* SURFACE */}
              <div className="relative w-48">
                <button
                  type="button"
                  onClick={() =>
                    setOpenFilter((current) =>
                        current === "surface"
                        ? null
                        : "surface"
                    )
                    }
                  className={`flex w-full items-center justify-between rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                    selectedSurfaces.length > 0
                      ? "border-sky-500 bg-sky-600/20 text-sky-300"
                      : "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span>
                    Surface:{" "}
                    {selectedSurfaces.length === 0
                      ? "All"
                      : selectedSurfaces.join(", ")}
                  </span>

                  <span className="ml-3 text-xs">
                    {openFilter === "surface" ? "▲" : "▼"}
                  </span>
                </button>

                 {selectedSurfaces.length > 0 && (
                    <button
                        type="button"
                        onClick={() => {
                        setSelectedSurfaces([])
                        if (openFilter === "surface") {
                            setOpenFilter(null)
                        }
                        }}
                        className="absolute right-7 top-1/2 z-10 -translate-y-1/2 text-lg font-bold text-red-500 transition hover:text-red-300"
                        title="Clear Surface filter"
                    >
                        ×
                    </button>
                    )}
                {openFilter === "surface" && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 p-2 shadow-xl">
                    {(
                      ["Turf", "Dirt"] as CM["surface"][]
                    ).map((surface) => {
                      const checked =
                        selectedSurfaces.includes(surface)

                      return (
                        <label
                          key={surface}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-gray-300 transition hover:bg-gray-800 hover:text-white"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedSurfaces(
                                (current) =>
                                  current.includes(surface)
                                    ? current.filter(
                                        (item) =>
                                          item !== surface
                                      )
                                    : [
                                        ...current,
                                        surface,
                                      ]
                              )
                            }}
                            className="accent-sky-500"
                          />

                          {surface}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>


                {/* RACECOURSE */}
<div className="relative w-60">
  <button
    type="button"
    onClick={() =>
      setOpenFilter((current) =>
        current === "racecourse"
          ? null
          : "racecourse"
      )
    }
    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold transition ${
      selectedRacecourses.length > 0
        ? "border-sky-500 bg-sky-600/20 text-sky-300"
        : "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white"
    }`}
  >
    <span className="truncate">
      Racecourse:{" "}
      {selectedRacecourses.length === 0
        ? "All"
        : selectedRacecourses.length === 1
          ? selectedRacecourses[0]
          : `${selectedRacecourses.length} selected`}
    </span>

    <span className="ml-2 shrink-0 text-xs">
      {openFilter === "racecourse" ? "▲" : "▼"}
    </span>
  </button>

        {selectedRacecourses.length > 0 && (
  <button
    type="button"
    onClick={() => {
      setSelectedRacecourses([])
      if (openFilter === "racecourse") {
        setOpenFilter(null)
      }
    }}
    className="absolute right-7 top-1/2 z-10 -translate-y-1/2 text-lg font-bold text-red-500 transition hover:text-red-300"
    title="Clear Racecourse filter"
  >
    ×
  </button>
)}

  {openFilter === "racecourse" && (
    <div className="cm-scrollbar absolute left-0 top-full z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 p-2 shadow-xl">
      {racecourseOptions.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-500">
          No racecourses
        </div>
      ) : (
        racecourseOptions.map((racecourse) => {
          const checked =
            selectedRacecourses.includes(racecourse)

          return (
            <label
              key={racecourse}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-gray-300 transition hover:bg-gray-800 hover:text-white"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  setSelectedRacecourses((current) =>
                    current.includes(racecourse)
                      ? current.filter(
                          (item) => item !== racecourse
                        )
                      : [...current, racecourse]
                  )
                }}
                className="accent-sky-500"
              />

              <span className="truncate">
                {racecourse}
              </span>
            </label>
          )
        })
      )}
    </div>
  )}
</div>
              {/* FINAL */}
              <div className="relative w-40">
                <button
                  type="button"
                 onClick={() =>
                    setOpenFilter((current) =>
                        current === "final"
                        ? null
                        : "final"
                    )
                    }
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    selectedFinals.length > 0
                      ? "border-sky-500 bg-sky-600/20 text-sky-300"
                      : "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span>
                    Final:{" "}
                    {selectedFinals.length === 0
                      ? "All"
                      : selectedFinals.length === 1
                        ? selectedFinals[0]
                        : `${selectedFinals.length} selected`}
                  </span>

                  <span className="ml-2 text-xs">
                    {openFilter === "final" ? "▲" : "▼"}
                  </span>
                </button>

                 {selectedFinals.length > 0 && (
                    <button
                        type="button"
                        onClick={() => {
                        setSelectedFinals([])
                        if (openFilter === "final") {
                            setOpenFilter(null)
                        }
                        }}
                        className="absolute right-7 top-1/2 z-10 -translate-y-1/2 text-lg font-bold text-red-500 transition hover:text-red-300"
                        title="Clear Final filter"
                    >
                        ×
                    </button>
                    )}
                {openFilter === "final" && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 p-2 shadow-xl">
                    {(
                      [
                        "Final A",
                        "Final B",
                        "Eliminated",
                      ] as CMFinalFilter[]
                    ).map((final) => {
                      const checked =
                        selectedFinals.includes(final)

                      return (
                        <label
                          key={final}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-gray-300 transition hover:bg-gray-800 hover:text-white"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedFinals(
                                (current) =>
                                  current.includes(final)
                                    ? current.filter(
                                        (item) =>
                                          item !== final
                                      )
                                    : [
                                        ...current,
                                        final,
                                      ]
                              )
                            }}
                            className="accent-sky-500"
                          />

                          {final}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* PLACE */}
              <div className="relative w-36">
                <button
                  type="button"
                 onClick={() =>
                    setOpenFilter((current) =>
                        current === "place"
                        ? null
                        : "place"
                    )
                    }
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    selectedPlaces.length > 0
                      ? "border-sky-500 bg-sky-600/20 text-sky-300"
                      : "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span>
                    Place:{" "}
                    {selectedPlaces.length === 0
                      ? "All"
                      : selectedPlaces.length <= 2
                        ? selectedPlaces.join(", ")
                        : `${selectedPlaces.length} selected`}
                  </span>

                  <span className="ml-2 text-xs">
                    {openFilter === "place" ? "▲" : "▼"}
                  </span>
                </button>

                 {selectedPlaces.length > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                            setSelectedPlaces([])
                            if (openFilter === "place") {
                                setOpenFilter(null)
                            }
                            }}
                            className="absolute right-7 top-1/2 z-10 -translate-y-1/2 text-lg font-bold text-red-500 transition hover:text-red-300"
                            title="Clear Place filter"
                        >
                            ×
                        </button>
                        )}
                {openFilter === "place" && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 p-2 shadow-xl">
                    {(
                      [
                        "1st",
                        "2nd",
                        "3rd",
                      ] as CMPlaceFilter[]
                    ).map((place) => {
                      const checked =
                        selectedPlaces.includes(place)

                      return (
                        <label
                          key={place}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-gray-300 transition hover:bg-gray-800 hover:text-white"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              setSelectedPlaces(
                                (current) =>
                                  current.includes(place)
                                    ? current.filter(
                                        (item) =>
                                          item !== place
                                      )
                                    : [
                                        ...current,
                                        place,
                                      ]
                              )
                            }}
                            className="accent-sky-500"
                          />

                          {place}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

            </div>

            <div className="flex items-start justify-between gap-4">
                {/* UMA */}
<div className="relative w-80">
  <button
    type="button"
    onClick={() =>
      setOpenFilter((current) =>
        current === "uma"
          ? null
          : "uma"
      )
    }
    className={`relative flex w-full items-center justify-between pr-14 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
      selectedUmaIds.length > 0
        ? "border-sky-500 bg-sky-600/20 text-sky-300"
        : "border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white"
    }`}
  >
    <span className="truncate">
      Uma:{" "}
      {selectedUmaIds.length === 0
        ? "All"
        : selectedUmaIds.length === 1
          ? selectedUmaName ?? "1 selected"
          : `${selectedUmaIds.length} selected`}
    </span>

        <span className="absolute right-3 text-xs">
        {openFilter === "uma" ? "▲" : "▼"}
        </span>
  </button>

  {selectedUmaIds.length > 0 && (
  <button
    type="button"
    onClick={() => {
      setSelectedUmaIds([])
      setUmaSearch("")
    }}
    className="absolute right-7 top-1/2 z-10 -translate-y-1/2 text-lg font-bold text-red-500 transition hover:text-red-300"
    title="Clear Uma filter"
  >
    ×
  </button>
)}



  {openFilter === "uma" && (
    <div className="absolute left-0 top-full z-50 mt-2 w-full rounded-lg border border-gray-700 bg-gray-900 p-2 shadow-xl">

      {/* SEARCH UMA */}
      <input
        type="text"
        value={umaSearch}
        onChange={(event) =>
          setUmaSearch(event.target.value)
        }
        placeholder="Search Uma..."
        className="mb-2 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-sky-500"
      />

      {/* UMA LIST */}
      <div className="cm-scrollbar max-h-72 overflow-y-auto">
        {visibleUmaOptions.length === 0 ? (
          <div className="px-3 py-3 text-center text-sm text-gray-500">
            No Uma found
          </div>
        ) : (
          visibleUmaOptions.map((version) => {
            const checked =
              selectedUmaIds.includes(version.id)

            return (
              <label
                key={version.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-gray-300 transition hover:bg-gray-800 hover:text-white"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setSelectedUmaIds((current) =>
                      current.includes(version.id)
                        ? current.filter(
                            (id) =>
                              id !== version.id
                          )
                        : [
                            ...current,
                            version.id,
                          ]
                    )
                  }}
                  className="accent-sky-500"
                />

                {version.avatar ? (
                  <UmaAvatarImage
                    avatar={version.avatar}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-800 text-xs text-gray-500">
                    ?
                  </div>
                )}

                <span className="truncate">
                  {version.displayName}
                </span>
              </label>
            )
          })
        )}
      </div>

    </div>
  )}
</div>
                <div className="flex items-center gap-4">
              {/* RESULTS COUNT */}
              
              <div className="flex h-9 items-center gap-1 whitespace-nowrap text-sm font-semibold">
                <span className="text-gray-500">
                  Showing
                </span>

                <span className="text-sky-400">
                  {filteredCount}
                </span>

                <span className="text-gray-500">
                  of
                </span>

                <span className="text-gray-300">
                  {totalCount}
                </span>

                <span className="text-gray-500">
                  CMs
                </span>
              </div>

              {/* RESET FILTERS */}
              {(
                selectedLengths.length > 0 ||
                selectedSurfaces.length > 0 ||
                selectedRacecourses.length > 0 ||
                selectedUmaIds.length > 0 ||
                selectedFinals.length > 0 ||
                selectedPlaces.length > 0
              ) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLengths([])
                    setSelectedSurfaces([])
                    setSelectedRacecourses([])
                    setSelectedUmaIds([])
                    setSelectedFinals([])
                    setSelectedPlaces([])
                    setUmaSearch("")
                    setOpenFilter(null)
                  }}
                  className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-400 transition hover:border-red-500/50 hover:bg-red-950/30 hover:text-red-300"
                >
                  Reset Filters
                </button>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CMFilters
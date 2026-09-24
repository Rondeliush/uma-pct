import type { CM, UmaVersion } from "../types/types"
import ModalPortal from "./ModalPortal"
import { useUmaDatabase } from "../context/UmaDatabaseContext"

type UpdateReviewModalProps = {
  versions: UmaVersion[]
  setCms: React.Dispatch<React.SetStateAction<CM[]>>
  onClose: () => void
}

const normalizeName = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

const getLevenshteinDistance = (
  first: string,
  second: string
) => {
  const matrix = Array.from(
    { length: first.length + 1 },
    () => Array(second.length + 1).fill(0)
  )

  for (let i = 0; i <= first.length; i++) {
    matrix[i][0] = i
  }

  for (let j = 0; j <= second.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= first.length; i++) {
    for (let j = 1; j <= second.length; j++) {
      const cost =
        first[i - 1] === second[j - 1] ? 0 : 1

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[first.length][second.length]
}


function UpdateReviewModal({
  versions,
  setCms,
  onClose,
}: UpdateReviewModalProps) {
  const {
  customVersions,
  setCustomVersions,
  setCustomCharacters,
  unarchiveVersion,
  markOfficialVersionsAsSeen,
} = useUmaDatabase()

 const handleMarkAsReviewed = () => {
  markOfficialVersionsAsSeen(
    versions.map((version) => version.id)
  )

  onClose()
}

const handlePossibleMerge = (
  officialVersion: UmaVersion,
  customVersion: UmaVersion
) => {
  const oldCustomVersionId = customVersion.id
  const officialVersionId = officialVersion.id
  const oldCustomCharacterId = customVersion.characterId
  const officialCharacterId = officialVersion.characterId

  // 1. Przepinamy wszystkie CM ze starego Custom ID na Official ID.
  setCms((current) =>
  current.map((cm) => ({
    ...cm,
    participants: (cm.participants ?? []).map(
      (participant) =>
        participant.umaId === oldCustomVersionId
          ? {
              ...participant,
              umaId: officialVersionId,
            }
          : participant
    ),
  }))
)

  // 2. Usuwamy customową wersję, która została połączona.
  setCustomVersions((current) =>
    current.filter(
      (version) =>
        version.id !== oldCustomVersionId
    )
  )

  // 3. Jeśli Custom Character miał inne ID niż Official,
  // jego pozostałe customowe alty przepinamy do Official Character.
  if (oldCustomCharacterId !== officialCharacterId) {
    setCustomVersions((current) =>
      current.map((version) =>
        version.characterId === oldCustomCharacterId
          ? {
              ...version,
              characterId: officialCharacterId,
            }
          : version
      )
    )
  }

  // 4. Usuwamy stary Custom Character,
  // jeśli już nie jest potrzebny.
  setCustomCharacters((current) =>
    current.filter(
      (character) =>
        character.id !== oldCustomCharacterId
    )
  )

  // 5. Czyścimy ewentualny archived status starej wersji.
  unarchiveVersion(oldCustomVersionId)
}

const handleExactMerge = (officialVersion: UmaVersion) => {
  const exactCustomMatch = customVersions.find(
    (customVersion) =>
      customVersion.id === officialVersion.id
  )

  if (!exactCustomMatch) {
    return
  }

  // Usuwamy tylko customową kopię wersji.
  // Official ma to samo ID, więc powiązania CM pozostają bez zmian.
  setCustomVersions((current) =>
    current.filter(
      (version) => version.id !== officialVersion.id
    )
  )

  // Jeśli Custom Character miał to samo ID co Official,
  // usuwamy customową kopię postaci.
  // Custom alty nadal mogą korzystać z Official Character.
  setCustomCharacters((current) =>
    current.filter(
      (character) =>
        character.id !== officialVersion.characterId
    )
  )

  unarchiveVersion(officialVersion.id)

 
}


  return (
  <ModalPortal>
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-sky-400/15 bg-[#081321] shadow-[0_24px_70px_rgba(0,0,0,0.65)]">

        {/* HEADER */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-sky-300/45">
              Uma Database
            </div>

            <h2 className="mt-0.5 text-lg font-black text-white">
              Database Update
            </h2>

            <p className="mt-1 text-xs font-medium text-blue-100/40">
              New official Uma versions are available.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] text-blue-100/35 transition hover:bg-white/[0.04] hover:text-white"
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* NEW OFFICIAL UMAS */}
        <div className="cm-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-2.5">
            {versions.map((version) => {
              const exactCustomMatch =
                customVersions.find(
                  (customVersion) =>
                    customVersion.id === version.id
                )

              const possibleCustomMatch =
                !exactCustomMatch
                  ? customVersions.find(
                      (customVersion) => {
                        const officialName =
                          normalizeName(
                            version.displayName
                          )

                        const customName =
                          normalizeName(
                            customVersion.displayName
                          )

                        if (
                          officialName.length < 5 ||
                          customName.length < 5
                        ) {
                          return false
                        }

                        return (
                          getLevenshteinDistance(
                            officialName,
                            customName
                          ) <= 2
                        )
                      }
                    )
                  : undefined

              return (
                <div
                  key={version.id}
                  className="overflow-hidden rounded-lg border border-white/[0.07] bg-black/15"
                >
                  {/* OFFICIAL VERSION */}
                  <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200/50">
                        New Official Version
                      </div>

                      <div className="mt-0.5 truncate text-sm font-bold text-white/90">
                        {version.displayName}
                      </div>
                    </div>

                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-emerald-300/20 bg-emerald-400/[0.06] text-emerald-200/70"
                      title="Official Uma"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 3 19 6v5c0 4.6-2.8 8-7 10-4.2-2-7-5.4-7-10V6Z" />
                      </svg>
                    </div>
                  </div>

                  {/* EXACT MATCH */}
                  {exactCustomMatch && (
                    <div className="border-t border-emerald-300/10 bg-emerald-400/[0.025] px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-200/80">
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                            </svg>

                            Exact Custom Match
                          </div>

                          <div className="mt-0.5 truncate text-xs text-blue-100/45">
                            {exactCustomMatch.displayName}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleExactMerge(version)
                          }
                          className="shrink-0 rounded-md border border-emerald-300/25 bg-emerald-400/[0.06] px-3 py-1.5 text-[10px] font-bold text-emerald-200 transition hover:border-emerald-300/45 hover:bg-emerald-400/[0.12] hover:text-white"
                        >
                          Merge to Official
                        </button>
                      </div>
                    </div>
                  )}

                  {/* POSSIBLE MATCH */}
                  {possibleCustomMatch && (
                    <div className="border-t border-amber-300/10 bg-amber-400/[0.025] px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200/80">
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                            </svg>

                            Possible Custom Match
                          </div>

                          <div className="mt-0.5 truncate text-xs text-blue-100/55">
                            {possibleCustomMatch.displayName}
                          </div>

                          <div className="mt-1 text-[10px] font-medium text-blue-100/30">
                            Existing CM history and results will be preserved.
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handlePossibleMerge(
                              version,
                              possibleCustomMatch
                            )
                          }
                          className="shrink-0 rounded-md border border-amber-300/25 bg-amber-400/[0.06] px-3 py-1.5 text-[10px] font-bold text-amber-200 transition hover:border-amber-300/45 hover:bg-amber-400/[0.12] hover:text-white"
                        >
                          Merge to Official
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex shrink-0 items-center justify-between border-t border-white/[0.06] px-5 py-3">
          <div className="text-[10px] font-medium text-blue-100/30">
            {versions.length} new{" "}
            {versions.length === 1
              ? "version"
              : "versions"}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/[0.08] px-4 py-2 text-xs font-bold text-blue-100/55 transition hover:bg-white/[0.04] hover:text-white"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleMarkAsReviewed}
              className="flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-400/[0.07] px-4 py-2 text-xs font-bold text-sky-200 transition hover:border-sky-300/50 hover:bg-sky-400/[0.12] hover:text-white"
            >
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
                <path d="m6 12 4 4 8-8" />
              </svg>

              Mark as Reviewed
            </button>
          </div>
        </div>

      </div>
    </div>
  </ModalPortal>
)
}

export default UpdateReviewModal
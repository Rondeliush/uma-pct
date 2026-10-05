import { useRef, useState } from "react"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import { useIsMobile } from "../responsive/useIsMobile"
import type { CM, UmaVersion } from "../types/types"
import AddUmaModal from "./AddUmaModal"
import DeleteUmaVersionDialog from "./DeleteUmaVersionDialog"
import UmaCharacterBrowser from "./UmaCharacterBrowser"
import type { CharacterEntry } from "./UmaCharacterBrowser"
import UmaDatabaseToolbar from "./UmaDatabaseToolbar"
import type { SortOrder, StatusFilter, ViewMode } from "./UmaDatabaseToolbar"
import UmaVersionPanel from "./UmaVersionPanel"
import UmaDatabaseIcon from "./UmaDatabaseIcon"

type UmaDatabaseProps = {
  cms: CM[]
  hasUpdateNotification: boolean
}

function UmaDatabase({ cms, hasUpdateNotification }: UmaDatabaseProps) {
  const {
    characters,
    versions,
    customVersions,
    setCustomCharacters,
    setCustomVersions,
    isCustomCharacter,
    isCustomVersion,
    hasOfficialCharacterMatch,
    archiveVersion,
    unarchiveVersion,
  } = useUmaDatabase()
  const isMobile = useIsMobile()

  const [searchText, setSearchText] = useState("")
  const [isAddUmaOpen, setIsAddUmaOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active")
  const [showOfficial, setShowOfficial] = useState(true)
  const [showCustom, setShowCustom] = useState(true)
  const [mobileViewMode, setMobileViewMode] = useState<ViewMode>("grid")
  const viewMode = isMobile ? mobileViewMode : "grid"
  const [sortOrder, setSortOrder] = useState<SortOrder>("name-az")
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null
  )
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UmaVersion | null>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const listScrollPosition = useRef(0)
  const search = searchText.toLowerCase().trim()

  const isVersionUsed = (versionId: string) =>
    cms.some((cm) =>
      (cm.participants ?? []).some(
        (participant) => participant.umaId === versionId
      )
    )

  const deleteCustomVersion = (versionId: string, characterId: string) => {
    if (!isCustomVersion(versionId) || isVersionUsed(versionId)) return

    const remainingCustomVersions = customVersions.filter(
      (version) => version.id !== versionId
    )
    setCustomVersions(remainingCustomVersions)
    unarchiveVersion(versionId)

    const hasOtherCustomVersions = remainingCustomVersions.some(
      (version) => version.characterId === characterId
    )
    if (!hasOtherCustomVersions && isCustomCharacter(characterId)) {
      setCustomCharacters((current) =>
        current.filter((character) => character.id !== characterId)
      )
    }
    setDeleteTarget(null)
  }

  const getFilteredVersions = (characterId: string, status: StatusFilter) =>
    versions.filter((version) => {
      if (version.characterId !== characterId) return false
      if (status === "active") {
        if (version.archived) return false
        const custom = isCustomVersion(version.id)
        if (custom && !showCustom) return false
        if (!custom && !showOfficial) return false
        return true
      }
      if (status === "archived") return version.archived
      return true
    })

  const getCharacterEntries = (status: StatusFilter): CharacterEntry[] =>
    characters
      .map((character) => ({
        character,
        versions: getFilteredVersions(character.id, status),
        custom: isCustomCharacter(character.id),
      }))
      .filter(
        ({ character, versions: characterVersions }) =>
          characterVersions.length > 0 &&
          (search === "" ||
            character.name.toLowerCase().includes(search) ||
            characterVersions.some((version) =>
              version.displayName.toLowerCase().includes(search)
            ))
      )

  const entries = getCharacterEntries(statusFilter).sort((a, b) => {
    const nameOrder = a.character.name.localeCompare(b.character.name, "en", {
      sensitivity: "base",
    })
    switch (sortOrder) {
      case "name-za":
        return -nameOrder
      case "most-versions":
        return b.versions.length - a.versions.length || nameOrder
      case "fewest-versions":
        return a.versions.length - b.versions.length || nameOrder
      default:
        return nameOrder
    }
  })
  const statusCounts = {
    active:
      statusFilter === "active"
        ? entries.length
        : getCharacterEntries("active").length,
    archived:
      statusFilter === "archived"
        ? entries.length
        : getCharacterEntries("archived").length,
    all:
      statusFilter === "all"
        ? entries.length
        : getCharacterEntries("all").length,
  }
  // Derive a valid selection after filtering, archiving or deleting a version.
  const explicitlySelectedEntry = entries.find(
    ({ character }) => character.id === selectedCharacterId
  )
  const selectedEntry = explicitlySelectedEntry ?? entries[0]
  const showMobileDetails = mobileDetailsOpen && !!explicitlySelectedEntry

  const selectCharacter = (id: string) => {
    setSelectedCharacterId(id)
    listScrollPosition.current = window.scrollY
    setMobileDetailsOpen(true)
    if (window.matchMedia("(max-width: 1023px)").matches) {
      pageRef.current?.scrollIntoView({ block: "start" })
    }
  }

  const backToList = () => {
    setMobileDetailsOpen(false)
    requestAnimationFrame(() => {
      window.scrollTo({ top: listScrollPosition.current })
      const selectedCard = pageRef.current?.querySelector<HTMLButtonElement>(
        '[aria-label="Uma characters"] button[aria-pressed="true"]'
      )
      selectedCard?.focus({ preventScroll: true })
    })
  }

  const stickyTop = hasUpdateNotification ? "top-[96px]" : "top-[60px]"
  const panelHeight = hasUpdateNotification
    ? "lg:max-h-[calc(100dvh-112px)]"
    : "lg:max-h-[calc(100dvh-76px)]"

  return (
    <div
      ref={pageRef}
      className={`grid items-start gap-4 scroll-mt-24 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] ${hasUpdateNotification ? "lg:scroll-mt-24" : "lg:scroll-mt-16"}`}
    >
      <section
        aria-label="Uma character browser"
        className={`min-w-0 ${showMobileDetails ? "hidden lg:block" : ""}`}
      >
        <UmaDatabaseToolbar
          searchText={searchText}
          onSearchChange={setSearchText}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          statusCounts={statusCounts}
          showOfficial={showOfficial}
          showCustom={showCustom}
          onToggleOfficial={() => setShowOfficial((current) => !current)}
          onToggleCustom={() => setShowCustom((current) => !current)}
          characterCount={entries.length}
          versionCount={entries.reduce(
            (count, entry) => count + entry.versions.length,
            0
          )}
          viewMode={viewMode}
          onViewChange={setMobileViewMode}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          onAddUma={() => setIsAddUmaOpen(true)}
        />
        <UmaCharacterBrowser
          entries={entries}
          selectedCharacterId={selectedEntry?.character.id ?? null}
          viewMode={viewMode}
          onSelect={selectCharacter}
          onResetFilters={() => {
            setSearchText("")
            setStatusFilter("active")
            setShowOfficial(true)
            setShowCustom(true)
          }}
        />
      </section>

      <aside
        className={`cm-scrollbar min-w-0 rounded-xl border border-sky-300/15 bg-[#071321]/65 shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-md lg:sticky lg:overflow-y-auto ${stickyTop} ${panelHeight} ${showMobileDetails ? "block" : "hidden lg:block"}`}
      >
        {selectedEntry ? (
          <UmaVersionPanel
            key={selectedEntry.character.id}
            entry={selectedEntry}
            hasOfficialMatch={hasOfficialCharacterMatch(
              selectedEntry.character.id
            )}
            isCustomVersion={isCustomVersion}
            isVersionUsed={isVersionUsed}
            onArchive={archiveVersion}
            onUnarchive={unarchiveVersion}
            onDelete={setDeleteTarget}
            onBack={backToList}
            mobileDetailsOpen={showMobileDetails}
          />
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-blue-100/45">
            <UmaDatabaseIcon name="book" className="h-8 w-8 text-sky-200/25" />
            <p>Select an Uma to view versions.</p>
          </div>
        )}
      </aside>

      {deleteTarget && (
        <DeleteUmaVersionDialog
          displayName={deleteTarget.displayName}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() =>
            deleteCustomVersion(deleteTarget.id, deleteTarget.characterId)
          }
        />
      )}
      {isAddUmaOpen && <AddUmaModal onClose={() => setIsAddUmaOpen(false)} />}
    </div>
  )
}

export default UmaDatabase

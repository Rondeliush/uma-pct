import type { ProfileData } from "./profileDataStore"
import { createProfileId, type Profile } from "./profileStore"
import { openDatabase, STORE_NAME } from "../storage/indexedDB"
import { notifyStorageChanged } from "../storage/storageChanges"
import { migrateProfileData, PROFILE_DATA_VERSION } from "./profileDataMigration"
import { RUNNING_STYLE_LABELS } from "../CMs/cmParticipantConfiguration"
import { getCMFinalValidationErrors, isCMFinalPlacement, normalizeCMFinalResults } from "../CMs/cmFinalPlacements"
import type { CM } from "../types/types"

export type ImportedProfileFile = {
  format: "uma-tracker-profile"
  version: 1
  profile: { sourceProfileId: string; name: string }
  data: ProfileData
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasFields(value: unknown, strings: string[], numbers: string[] = [], booleans: string[] = []): value is Record<string, unknown> {
  return isRecord(value) &&
    strings.every((key) => typeof value[key] === "string") &&
    numbers.every((key) => typeof value[key] === "number" && Number.isFinite(value[key])) &&
    booleans.every((key) => typeof value[key] === "boolean")
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isRunningStyle(value: unknown): boolean {
  return value === null || (typeof value === "string" && Object.hasOwn(RUNNING_STYLE_LABELS, value))
}

function isConfiguration(value: unknown): boolean {
  return isRecord(value) &&
    (value.umaVersionId === null || typeof value.umaVersionId === "string") &&
    isRunningStyle(value.runningStyle) &&
    ["ace", "debuffer"].every((key) => value[key] === null || typeof value[key] === "boolean") &&
    (value.entrySource === null || value.entrySource === "manual" || value.entrySource === "autorun") &&
    (value.configurationSource === "recorded" || value.configurationSource === "legacy_inferred")
}

function isCM(value: unknown, current: boolean, currentPlacements: boolean): boolean {
  if (!(hasFields(value, ["name", "track", "surface", "length", "direction", "weather", "season", "condition", "phase", "finalPlace"], ["number", "distance"]) &&
    isStringArray(value.currentLineup) &&
    Array.isArray(value.participants) && value.participants.every((item) =>
      hasFields(item, ["cmUmaId", "umaId"], [], ["won", "finalParticipant"]) &&
      ["ace", "debuffer", "autoRun"].every((key) => item[key] === undefined || typeof item[key] === "boolean") &&
      (isRunningStyle(item.runningStyle) || (!current && typeof item.style === "string"))
    ) &&
    Array.isArray(value.attempts) && value.attempts.every((item) =>
      hasFields(item, [], ["day", "attempt", "racesPlayed"], ["retired"]) &&
      Array.isArray(item.umaWins) && item.umaWins.every((win) => hasFields(win, ["cmUmaId"], ["wins"]) &&
        ((!current && win.configuration === undefined) || isConfiguration(win.configuration)))
    ) &&
    (value.finalResults === undefined || (Array.isArray(value.finalResults) && value.finalResults.every((result) =>
      hasFields(result, ["cmUmaId"], [], ["won"]) && isConfiguration(result.configuration) &&
      ((!currentPlacements && result.placement === undefined) || isCMFinalPlacement(result.placement)) &&
      ((!currentPlacements && result.placementSource === undefined) || result.placementSource === "recorded" || result.placementSource === "legacy_inferred")))) &&
    Array.isArray(value.log) && value.log.every((item) =>
      hasFields(item, ["id", "timestamp", "type", "message"]) &&
      (item.details === undefined || isStringArray(item.details))
    ) &&
    (value.notes === undefined || typeof value.notes === "string") &&
    (value.league === undefined || typeof value.league === "string"))) return false
  // The shape above has been checked; older files normalize only missing placement metadata.
  const cm = value as unknown as CM
  const normalized = currentPlacements ? cm : { ...cm, finalResults: cm.finalResults ? normalizeCMFinalResults(cm.finalResults, cm.finalPlace) : undefined }
  return getCMFinalValidationErrors(normalized, {
    requireWinner: currentPlacements && cm.phase === "completed" && (cm.finalResults?.length ?? 0) > 0,
    allowLegacyUnknown: true,
  }).length === 0
}

function isLoH(value: unknown): boolean {
  return hasFields(value, ["name", "track", "rank"], ["number", "score", "racesPlayed", "firstPlaces", "top3Finishes"], ["completed"]) &&
    Array.isArray(value.participants) && value.participants.every((item) =>
      hasFields(item, ["umaId"], ["races", "wins", "top3Finishes"])
    )
}

export function isProfileData(value: unknown): value is ProfileData {
  if (!isRecord(value) || !isRecord(value.customUmaDatabase)) return false
  const custom = value.customUmaDatabase
  return (
    (value.dataVersion === undefined || (Number.isInteger(value.dataVersion) && Number(value.dataVersion) >= 0 && Number(value.dataVersion) <= PROFILE_DATA_VERSION)) &&
    Array.isArray(value.cms) && value.cms.every((cm) => isCM(cm, Number(value.dataVersion) >= 1, value.dataVersion === PROFILE_DATA_VERSION)) &&
    Array.isArray(value.lohs) && value.lohs.every(isLoH) &&
    Array.isArray(custom.customCharacters) && custom.customCharacters.every((item) => hasFields(item, ["id", "name"])) &&
    Array.isArray(custom.customVersions) && custom.customVersions.every((item) =>
      hasFields(item, ["id", "characterId", "displayName", "versionName"], [], ["archived"]) &&
      (item.avatar === undefined || typeof item.avatar === "string")
    ) &&
    Array.isArray(custom.archivedVersionIds) &&
    custom.archivedVersionIds.every((id) => typeof id === "string") &&
    typeof value.favoriteUmaId === "string" &&
    (value.cmViewMode === "detailed" || value.cmViewMode === "compact") &&
    Array.isArray(value.seenOfficialVersionIds) &&
    value.seenOfficialVersionIds.every((id) => typeof id === "string") &&
    (value.onboardingCompleted === undefined || typeof value.onboardingCompleted === "boolean") &&
    (value.cmLineupGuideCompleted === undefined || typeof value.cmLineupGuideCompleted === "boolean") &&
    (value.umaComparisonSlots === undefined || (Array.isArray(value.umaComparisonSlots) &&
      value.umaComparisonSlots.length <= 5 && value.umaComparisonSlots.every((id) => id === null || typeof id === "string")))
  )
}

export function isImportedProfileFile(value: unknown): value is ImportedProfileFile {
  return isRecord(value) &&
    value.format === "uma-tracker-profile" && value.version === 1 &&
    isRecord(value.profile) &&
    typeof value.profile.sourceProfileId === "string" &&
    value.profile.sourceProfileId.trim() !== "" &&
    typeof value.profile.name === "string" && value.profile.name.trim() !== "" &&
    isProfileData(value.data)
}

// Keep the duplicate check, profile list and profile data in one transaction.
// Concurrent imports cannot overwrite a profile or leave a partial import.
export async function importProfileToDevice(file: ImportedProfileFile, asCopy = false): Promise<Profile> {
  if (!isImportedProfileFile(file)) {
    throw new Error("This is not a valid UmaPCT profile.")
  }

  const data = migrateProfileData(file.data)
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    let failure: Error | undefined
    const profile: Profile = {
      id: createProfileId(),
      name: file.profile.name.trim() + (asCopy ? " (restored)" : ""),
      sourceProfileId: asCopy ? createProfileId() : file.profile.sourceProfileId,
      createdAt: new Date().toISOString(),
    }

    transaction.oncomplete = () => {
      database.close()
      notifyStorageChanged("profiles")
      resolve(profile)
    }
    transaction.onabort = () => {
      database.close()
      reject(failure ?? transaction.error ?? new Error("Could not save the profile."))
    }

    const request = store.get("profiles")
    request.onsuccess = () => {
      try {
        const profiles: Profile[] = request.result ?? []
        if (!Array.isArray(profiles)) {
          throw new Error("The local profile list could not be read. Nothing was overwritten.")
        }
        if (profiles.some((existing) =>
          (existing.sourceProfileId ?? existing.id) === profile.sourceProfileId
        )) {
          throw new Error("This profile already exists on this device. Nothing was overwritten.")
        }
        store.add(data, `profile:${profile.id}:data`)
        store.put([...profiles, profile], "profiles")
      } catch (error) {
        failure = error instanceof Error ? error : new Error("Could not save the profile.")
        transaction.abort()
      }
    }
  })
}

import { calculateAttemptRaces } from "../CMs/CMCalculations"
import { getResultConfiguration } from "../CMs/cmParticipantConfiguration"
import type { CM, CMParticipantConfiguration } from "../types/types"
import type { RaceStatistics } from "./umaStatistics"

const roleLabels = {
  no_special_role: "No Role",
  ace: "Ace",
  debuffer: "Debuffer",
  ace_debuffer: "Ace + Debuffer",
  unknown: "Unknown",
} as const
export type UmaRole = keyof typeof roleLabels
const knownRoles: UmaRole[] = ["no_special_role", "ace", "debuffer", "ace_debuffer"]
export type UmaRoleRow = RaceStatistics & { role: UmaRole; label: string; usage: number | null }

export function getRole(configuration: CMParticipantConfiguration): UmaRole {
  const { ace, debuffer } = configuration
  if (typeof ace !== "boolean" || typeof debuffer !== "boolean") return "unknown"
  return ace ? debuffer ? "ace_debuffer" : "ace" : debuffer ? "debuffer" : "no_special_role"
}

/** Omit versionId to aggregate all saved Uma participations, with known-role Usage. */
export function calculateUmaRoleStatistics(cms: CM[], versionId?: string) {
  const global = versionId === undefined
  const totals = new Map<UmaRole, { races: number; wins: number }>()
  let totalRaces = 0
  for (const cm of cms) {
    for (const attempt of cm.attempts ?? []) {
      const races = calculateAttemptRaces(attempt)
      if (!Number.isFinite(races) || races <= 0) continue
      const resultsByVersion = new Map<string, { role: UmaRole; wins: number }[]>()
      for (const result of attempt.umaWins ?? []) {
        // Global statistics never infer missing snapshots from the mutable lineup.
        const configuration = global ? result.configuration : getResultConfiguration(cm, result)
        if (!global && configuration?.umaVersionId !== versionId) continue
        const key = configuration?.umaVersionId !== null && configuration?.umaVersionId !== undefined
          ? `version:${configuration.umaVersionId}` : `participant:${result.cmUmaId}`
        const results = resultsByVersion.get(key) ?? []
        results.push({ role: configuration ? getRole(configuration) : "unknown", wins: result.wins })
        resultsByVersion.set(key, results)
      }
      for (const results of resultsByVersion.values()) {
        totalRaces += races
        const roles = new Set(results.map((result) => result.role))
        // Count a version's races once; conflicting roles in one batch cannot be split safely.
        const role = roles.size === 1 ? roles.values().next().value ?? "unknown" : "unknown"
        const row = totals.get(role) ?? { races: 0, wins: 0 }
        row.races += races
        row.wins += results.reduce((sum, result) => sum + result.wins, 0)
        totals.set(role, row)
      }
    }
  }
  const unknownRoleRaces = totals.get("unknown")?.races ?? 0
  const usageRaces = global ? totalRaces - unknownRoleRaces : totalRaces
  const roles: UmaRole[] = global ? knownRoles : [...knownRoles, ...(totals.has("unknown") ? ["unknown" as const] : [])]
  const rows: UmaRoleRow[] = roles.map((role) => {
    const row = totals.get(role) ?? { races: 0, wins: 0 }
    return { ...row, role, label: roleLabels[role], winRate: row.races > 0 ? row.wins / row.races * 100 : null,
      usage: usageRaces > 0 ? row.races / usageRaces * 100 : global ? 0 : null }
  })
  return { rows, totalRaces, unknownRoleRaces }
}

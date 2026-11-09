import type { OverviewUma } from "./umaOverviewTypes"
import { rankUmaOverview } from "./umaRankingStatistics"
import type { UmaRankingEntry, UmaRankingMetric } from "./umaRankingStatistics"

export type UmaSpotlightPage = { id: string; entries: (UmaRankingEntry | null)[] }
export type UmaSpotlightDeck = {
  sceneId: string
  umas: OverviewUma[]
  characterByVersion: ReadonlyMap<string, string>
  seed: number
  pages: UmaSpotlightPage[]
  index: number
  previous: UmaSpotlightPage | null
  direction: 1 | -1
}

/** Display exclusions use existing character metadata; statistical version identities stay unchanged. */
export function getUmaSpotlightIdentity(versionId: string, characterByVersion: ReadonlyMap<string, string>) {
  return characterByVersion.get(versionId) ?? versionId
}

export function getUmaSpotlightExclusions(entries: readonly UmaRankingEntry[], characterByVersion: ReadonlyMap<string, string>) {
  return new Set(entries.map(entry => getUmaSpotlightIdentity(entry.uma.versionId, characterByVersion)))
}

function shuffleScore(id: string, seed: number) {
  let score = Math.floor(seed * 0xffffffff)
  for (let i = 0; i < id.length; i++) score = Math.imul(score ^ id.charCodeAt(i), 16777619)
  return score >>> 0
}

/** Randomized presentation of real records, stable through ordinary rerenders. */
export function getUmaSpotlightPages(umas: OverviewUma[], metrics: readonly UmaRankingMetric[], excluded: ReadonlySet<string>, characterByVersion: ReadonlyMap<string, string>, seed: number, finalAWins: ReadonlyMap<string, number> = new Map()): UmaSpotlightPage[] {
  const identity = (entry: UmaRankingEntry) => getUmaSpotlightIdentity(entry.uma.versionId, characterByVersion)
  const pools = metrics.map(metric => rankUmaOverview(umas, metric, finalAWins)
    .filter(entry => entry.uma.avatar && !excluded.has(identity(entry)))
    .sort((a, b) => shuffleScore(a.uma.versionId, seed) - shuffleScore(b.uma.versionId, seed) || a.uma.versionId.localeCompare(b.uma.versionId)))
  const count = Math.min(4, Math.max(0, ...pools.map(pool => pool.length)))
  const pages = new Map<string, UmaSpotlightPage>()
  for (let page = 0; page < count; page++) {
    const claimed = new Set<string>()
    const entries = pools.map((pool, slot) => {
      const rotated = pool.map((_, index) => pool[(page + slot + index) % pool.length])
      // Prefer three different Umas, but a small profile can reuse an eligible spotlight.
      const entry = rotated.find(entry => !claimed.has(identity(entry))) ?? rotated[0] ?? null
      if (entry) claimed.add(identity(entry))
      return entry
    })
    const id = entries.map((entry, index) => `${metrics[index]}:${entry?.uma.versionId ?? "empty"}`).join("|")
    pages.set(id, { id, entries })
  }
  return [...pages.values()]
}

/** Keep the deck fixed for the whole podium slide, including its exit-animation cleanup. */
export function getUmaSpotlightDeck(previous: UmaSpotlightDeck | null, sceneId: string, umas: OverviewUma[], excluded: ReadonlySet<string>, characterByVersion: ReadonlyMap<string, string>, seed: number): UmaSpotlightDeck {
  if (previous?.sceneId === sceneId && previous.seed === seed) {
    // Route changes can recreate the same read-only statistics and version maps.
    const sameUmas = previous.umas === umas || JSON.stringify(previous.umas) === JSON.stringify(umas)
    const sameCharacters = previous.characterByVersion === characterByVersion || (previous.characterByVersion.size === characterByVersion.size && [...characterByVersion].every(([id, character]) => previous.characterByVersion.get(id) === character))
    if (sameUmas && sameCharacters) return previous
  }
  const pages = getUmaSpotlightPages(umas, ["races", "races", "races"], excluded, characterByVersion, seed)
  const outgoing = previous?.pages[previous.index] ?? null
  let index = previous ? (previous.index + 1) % Math.max(1, pages.length) : 0
  if (pages.length > 1 && pages[index].id === outgoing?.id) index = (index + 1) % pages.length
  return { sceneId, umas, characterByVersion, seed, pages, index, previous: outgoing, direction: 1 }
}

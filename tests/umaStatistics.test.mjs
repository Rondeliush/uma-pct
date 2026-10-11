import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { calculateUmaStatistics, getUmaStatisticsCatalogue, getUmaPerformanceList, sortUmaPerformance, getUmaBestDistance, formatUmaWinRate } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))

const characters = [
  { id: "oguri", name: "Oguri Cap" },
  { id: "teio", name: "Tokai Teio" },
  { id: "custom", name: "Custom Uma" },
  { id: "unused", name: "Unused Uma" },
]
const versions = [
  { id: "oguri-base", characterId: "oguri", displayName: "Oguri Cap", archived: true, avatar: "oguri.png" },
  { id: "oguri-alt", characterId: "oguri", displayName: "Oguri Cap (Christmas)", archived: false, avatar: "oguri-alt.png" },
  { id: "teio-base", characterId: "teio", displayName: "Tokai Teio", archived: false },
  { id: "custom-base", characterId: "custom", displayName: "Custom Uma", archived: true },
  { id: "unused-base", characterId: "unused", displayName: "Unused Uma", archived: false },
]
const participant = (cmUmaId, umaId, extra = {}) => ({
  cmUmaId, umaId, finalParticipant: false, won: false, ...extra,
})
const attempt = (racesPlayed, results) => ({
  day: 1, attempt: 1, racesPlayed, retired: false,
  umaWins: results.map(([cmUmaId, wins]) => ({ cmUmaId, wins })),
})
const cm = (extra = {}) => ({
  number: 1, distance: 1600, participants: [], attempts: [], finalPlace: "", ...extra,
})

test("keeps alternate versions independent and preserves archived/custom history", () => {
  const result = calculateUmaStatistics([
    cm({ participants: [participant("a", "oguri-base"), participant("b", "custom-base")], attempts: [attempt(10, [["a", 5], ["b", 0]])] }),
    cm({ number: 2, distance: 2000, participants: [participant("c", "oguri-alt")], attempts: [attempt(5, [["c", 3]])] }),
  ], characters, versions)
  assert.equal(result.umas.length, 3)
  const oguri = result.umas.find((uma) => uma.versionId === "oguri-base")
  const christmas = result.umas.find((uma) => uma.versionId === "oguri-alt")
  assert.equal(oguri.name, "Oguri Cap")
  assert.equal(oguri.avatar, "oguri.png")
  assert.equal(oguri.races, 10)
  assert.equal(oguri.wins, 5)
  assert.equal(oguri.winRate, 50)
  assert.equal(christmas.name, "Oguri Cap (Christmas)")
  assert.equal(christmas.avatar, "oguri-alt.png")
  assert.equal(christmas.races, 5)
  assert.equal(christmas.wins, 3)
  assert.equal(christmas.winRate, 60)
  assert.equal(result.umas.find((uma) => uma.versionId === "custom-base").wins, 0)
  assert.equal(result.umas.some((uma) => uma.versionId === "unused-base"), false)
})

test("team and exact-distance totals count each round race once", () => {
  const result = calculateUmaStatistics([
    cm({ participants: [participant("a", "oguri-base"), participant("b", "teio-base")], attempts: [attempt(10, [["a", 4], ["b", 3]])] }),
    cm({ number: 2, distance: 1800, participants: [participant("c", "oguri-alt")], attempts: [attempt(5, [["c", 2]])] }),
    cm({ number: 3, distance: 3200 }),
  ], characters, versions)
  assert.deepEqual(result.overall, { races: 15, wins: 9, winRate: 60, umasUsed: 3 })
  assert.deepEqual(result.distances, [
    { distance: 1600, races: 10, wins: 7, winRate: 70 },
    { distance: 1800, races: 5, wins: 2, winRate: 40 },
  ])
  assert.equal(result.umas.reduce((sum, uma) => sum + uma.races, 0), 25)
})

test("final wins belong only to the recorded winning version and stay separate from rounds", () => {
  const result = calculateUmaStatistics([
    cm({ finalPlace: "1st", participants: [
      participant("a", "oguri-base", { finalParticipant: true, won: true }),
      participant("b", "oguri-alt", { finalParticipant: true }),
      participant("c", "teio-base", { finalParticipant: true }),
    ] }),
    cm({ number: 2, finalPlace: "2nd", participants: [participant("d", "teio-base", { finalParticipant: true, won: true })] }),
    cm({ number: 3, participants: [participant("e", "oguri-alt", { finalParticipant: true, won: true })] }),
  ], characters, versions)
  const oguri = result.umas.find((uma) => uma.versionId === "oguri-base")
  const christmas = result.umas.find((uma) => uma.versionId === "oguri-alt")
  const teio = result.umas.find((uma) => uma.versionId === "teio-base")
  assert.equal(oguri.finalAppearances, 1)
  assert.equal(oguri.finalWins, 1)
  assert.equal(christmas.finalAppearances, 1)
  assert.equal(christmas.finalWins, 0)
  assert.equal(teio.finalAppearances, 2)
  assert.equal(teio.finalWins, 0)
  assert.equal(oguri.races, 0)
  assert.equal(oguri.winRate, null)
  assert.equal(result.overall.races, 0)
  assert.deepEqual(result.distances, [])
})

test("pending finals and unused lineups do not create statistical history", () => {
  const result = calculateUmaStatistics([
    cm({ participants: [participant("a", "oguri-base", { finalParticipant: true })] }),
  ], characters, versions)
  assert.deepEqual(result.umas, [])
  assert.equal(result.overall.winRate, null)
})

test("counts each participating version separately within an attempt", () => {
  const result = calculateUmaStatistics([
    cm({ participants: [participant("a", "oguri-base"), participant("b", "oguri-alt")], attempts: [attempt(5, [["a", 2], ["b", 1]])] }),
  ], characters, versions)
  assert.equal(result.umas.length, 2)
  assert.deepEqual(result.umas.map((uma) => [uma.versionId, uma.races, uma.wins]), [["oguri-base", 5, 2], ["oguri-alt", 5, 1]])
})

test("counts the same version once per attempt across duplicate participant records", () => {
  const result = calculateUmaStatistics([
    cm({ participants: [participant("a", "oguri-base"), participant("b", "oguri-base")], attempts: [attempt(5, [["a", 2], ["b", 1]])] }),
  ], characters, versions)
  assert.equal(result.umas.length, 1)
  assert.equal(result.umas[0].races, 5)
  assert.equal(result.umas[0].wins, 3)
})

test("unresolved historical version IDs retain separate records without fabricated avatars", () => {
  const result = calculateUmaStatistics([
    cm({ participants: [participant("a", "missing-one"), participant("b", "missing-two")], attempts: [attempt(5, [["a", 1], ["b", 0]])] }),
  ], characters, versions)
  assert.equal(result.umas.length, 2)
  assert.deepEqual(result.umas.map((uma) => uma.versionId), ["missing-one", "missing-two"])
  assert.ok(result.umas.every((uma) => uma.unresolved && uma.name.startsWith("Unresolved Uma (") && uma.avatar === ""))
})

test("base-only legacy records remain separate and never inherit an available version", () => {
  const cms = [cm({ participants: [participant("a", "oguri"), participant("b", "oguri-base"), participant("c", "oguri-alt")], attempts: [attempt(5, [["a", 3], ["b", 1], ["c", 0]])] })]
  const snapshot = structuredClone(cms)
  const result = calculateUmaStatistics(cms, characters, versions)
  const legacy = result.umas.find((uma) => uma.versionId === "oguri")
  assert.equal(legacy.name, "Oguri Cap (Legacy / unresolved)")
  assert.equal(legacy.unresolved, true)
  assert.equal(legacy.avatar, "")
  assert.equal(legacy.wins, 3)
  assert.equal(result.umas.find((uma) => uma.versionId === "oguri-base").wins, 1)
  assert.equal(result.umas.find((uma) => uma.versionId === "oguri-alt").wins, 0)
  assert.deepEqual(cms, snapshot)
})

test("the catalogue lists all versions alphabetically with archived/custom and unresolved entries", () => {
  const history = calculateUmaStatistics([
    cm({ participants: [participant("a", "oguri"), participant("b", "deleted")], attempts: [attempt(5, [["a", 1], ["b", 0]])] }),
  ], characters, versions).umas
  const catalogue = getUmaStatisticsCatalogue(versions, history)
  assert.equal(catalogue.length, versions.length + 2)
  assert.equal(catalogue.filter((uma) => uma.name.startsWith("Oguri Cap")).length, 3)
  assert.ok(catalogue.some((uma) => uma.versionId === "oguri-base" && !uma.unresolved))
  assert.ok(catalogue.some((uma) => uma.versionId === "custom-base"))
  assert.ok(catalogue.some((uma) => uma.versionId === "unused-base"))
  assert.deepEqual(catalogue.map((uma) => uma.name), [...catalogue.map((uma) => uma.name)].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })))
})

test("IDs remain authoritative when names coincide or a custom version ID equals a character ID", () => {
  const known = [{ id: "oguri", characterId: "oguri", displayName: "Same Name" }, { id: "alt", characterId: "oguri", displayName: "Same Name" }]
  const result = calculateUmaStatistics([
    cm({ participants: [participant("a", "oguri"), participant("b", "alt")], attempts: [attempt(5, [["a", 1], ["b", 2]])] }),
  ], characters, known)
  assert.equal(result.umas.length, 2)
  assert.ok(result.umas.every((uma) => !uma.unresolved))
  assert.deepEqual(sortUmaPerformance(result.umas, "name-az").map((uma) => uma.versionId), ["alt", "oguri"])
})

test("win-rate ranking prioritizes established history and all other sorts remain available", () => {
  const umas = [
    { versionId: "a", name: "Oguri Cap (Christmas)", races: 1, wins: 1, winRate: 100 },
    { versionId: "b", name: "Oguri Cap", races: 20, wins: 15, winRate: 75 },
    { versionId: "c", name: "Special Week", races: 30, wins: 18, winRate: 60 },
  ]
  const ids = (sort) => sortUmaPerformance(umas, sort).map((uma) => uma.versionId)
  assert.deepEqual(ids("win-rate"), ["b", "c", "a"])
  assert.deepEqual(ids("wins"), ["c", "b", "a"])
  assert.deepEqual(ids("races"), ["c", "b", "a"])
  assert.deepEqual(ids("name-az"), ["b", "a", "c"])
  assert.deepEqual(ids("name-za"), ["c", "a", "b"])
  assert.deepEqual(umas.map((uma) => uma.versionId), ["a", "b", "c"])
})

test("best distance requires an adequate sample and absent rates render as unavailable", () => {
  const uma = { distances: [
    { distance: 1200, races: 1, wins: 1, winRate: 100 },
    { distance: 1600, races: 10, wins: 7, winRate: 70 },
    { distance: 2000, races: 20, wins: 14, winRate: 70 },
  ] }
  assert.equal(getUmaBestDistance(uma).distance, 2000)
  assert.equal(getUmaBestDistance({ distances: [uma.distances[0]] }), null)
  assert.equal(formatUmaWinRate(null), "—")
  assert.equal(formatUmaWinRate(0), "0.0%")
  assert.equal(formatUmaWinRate(70.666), "70.7%")
})

test("empty history and unknown distances do not produce synthetic statistics", () => {
  assert.deepEqual(calculateUmaStatistics([], characters, versions), {
    umas: [], overall: { races: 0, wins: 0, winRate: null, umasUsed: 0 }, distances: [],
    surfaces: [{ surface: "Turf", races: 0, wins: 0, winRate: null }, { surface: "Dirt", races: 0, wins: 0, winRate: null }],
  })
  const result = calculateUmaStatistics([
    cm({ distance: 0, participants: [participant("a", "oguri-base")], attempts: [attempt(5, [["a", 2]])] }),
  ], characters, versions)
  assert.equal(result.umas[0].races, 5)
  assert.deepEqual(result.distances, [])
})

test("CM Events count each version once per raced event, including final-only history", () => {
  const cms = [
    cm({ finalPlace: "1st", participants: [
      participant("a", "oguri-base", { finalParticipant: true, won: true }),
      participant("b", "oguri-base", { finalParticipant: true }),
      participant("c", "oguri-alt"),
    ], attempts: [attempt(5, [["a", 2], ["b", 1], ["c", 0]]), attempt(5, [["a", 1], ["c", 2]])] }),
    cm({ number: 2, finalPlace: "2nd", participants: [participant("d", "oguri-base", { finalParticipant: true })] }),
    cm({ number: 3, participants: [participant("e", "oguri-alt", { finalParticipant: true })], attempts: [attempt(0, [["e", 0]])] }),
    cm({ number: 4, participants: [participant("f", "oguri-alt")], attempts: [attempt(5, [["f", 0]])] }),
  ]
  const snapshot = structuredClone(cms)
  const result = calculateUmaStatistics(cms, characters, versions)
  assert.equal(result.umas.find((uma) => uma.versionId === "oguri-base").cmEvents, 2)
  assert.equal(result.umas.find((uma) => uma.versionId === "oguri-alt").cmEvents, 2)
  assert.equal(result.umas.find((uma) => uma.versionId === "oguri-base").finalAppearances, 2)
  assert.equal(result.umas.find((uma) => uma.versionId === "oguri-alt").finalAppearances, 0)
  assert.deepEqual(cms, snapshot)
})

test("performance list includes all catalogue versions and keeps numeric recorded order", () => {
  const recorded = calculateUmaStatistics([
    cm({ participants: [participant("a", "oguri-alt")], attempts: [attempt(10, [["a", 3]])] }),
    cm({ number: 2, participants: [participant("b", "teio-base")], attempts: [attempt(5, [["b", 0]])] }),
    cm({ number: 3, finalPlace: "2nd", participants: [participant("c", "oguri-base", { finalParticipant: true })] }),
    cm({ number: 4, participants: [participant("d", "oguri")], attempts: [attempt(5, [["d", 1]])] }),
  ], characters, versions).umas
  const catalogue = getUmaStatisticsCatalogue(versions, recorded)
  const snapshot = structuredClone({ recorded, catalogue })
  for (const sort of ["win-rate", "wins", "races"]) {
    const list = getUmaPerformanceList(catalogue, recorded, sort)
    assert.equal(list.length, catalogue.length)
    assert.equal(new Set(list.map((uma) => uma.versionId)).size, catalogue.length)
    assert.deepEqual(list.slice(0, recorded.length).map((uma) => uma.versionId), sortUmaPerformance(recorded, sort).map((uma) => uma.versionId))
    assert.ok(list.slice(0, recorded.length).every((uma) => uma.hasRecordedData))
    assert.ok(list.slice(recorded.length).every((uma) => !uma.hasRecordedData && uma.winRate === null))
    assert.equal(list.find((uma) => uma.versionId === "oguri-base").hasRecordedData, true)
    assert.equal(list.find((uma) => uma.versionId === "custom-base").hasRecordedData, false)
    assert.equal(list.find((uma) => uma.versionId === "oguri").unresolved, true)
  }
  assert.deepEqual({ recorded, catalogue }, snapshot)
})

test("performance list name sorts include no-data entries alphabetically", () => {
  const recorded = calculateUmaStatistics([
    cm({ participants: [participant("a", "oguri-alt")], attempts: [attempt(5, [["a", 1]])] }),
  ], characters, versions).umas
  const catalogue = getUmaStatisticsCatalogue(versions, recorded)
  const ascending = getUmaPerformanceList(catalogue, recorded, "name-az")
  const descending = getUmaPerformanceList(catalogue, recorded, "name-za")
  assert.deepEqual(ascending.map((uma) => uma.versionId), catalogue.map((uma) => uma.versionId))
  assert.deepEqual(descending.map((uma) => uma.versionId), [...catalogue].reverse().map((uma) => uma.versionId))
  assert.equal(ascending[0].hasRecordedData, false)
  assert.equal(ascending.find((uma) => uma.versionId === "oguri-alt").wins, 1)
})

test("performance list works with a completely empty competitive record", () => {
  const catalogue = getUmaStatisticsCatalogue(versions)
  const list = getUmaPerformanceList(catalogue, [], "win-rate")
  assert.equal(list.length, versions.length)
  assert.ok(list.every((uma) => !uma.hasRecordedData && uma.winRate === null && uma.cmEvents === 0 && uma.finalAppearances === 0))
  assert.deepEqual(list.map((uma) => uma.versionId), catalogue.map((uma) => uma.versionId))
})

test("global Turf performance counts 100 races and 60 team wins without multiplying Uma participation", () => {
  const result = calculateUmaStatistics([cm({
    surface: "Turf",
    participants: [participant("a", "oguri-base"), participant("b", "oguri-alt"), participant("c", "teio-base")],
    attempts: [attempt(100, [["a", 40], ["b", 20], ["c", 0]])],
  })], characters, versions)
  assert.deepEqual(result.surfaces, [
    { surface: "Turf", races: 100, wins: 60, winRate: 60 },
    { surface: "Dirt", races: 0, wins: 0, winRate: null },
  ])
  assert.equal(formatUmaWinRate(result.surfaces[0].winRate), "60.0%")
  assert.equal(result.umas.reduce((total, uma) => total + uma.races, 0), 300)
  assert.equal(result.overall.races, 100)
  assert.deepEqual(result.distances, [{ distance: 1600, races: 100, wins: 60, winRate: 60 }])
})

test("global Dirt performance counts 20 races and 5 wins while keeping an empty Turf row", () => {
  const result = calculateUmaStatistics([cm({
    surface: "Dirt", distance: 1800,
    participants: [participant("a", "oguri-base")], attempts: [attempt(20, [["a", 5]])],
  })], characters, versions)
  assert.deepEqual(result.surfaces, [
    { surface: "Turf", races: 0, wins: 0, winRate: null },
    { surface: "Dirt", races: 20, wins: 5, winRate: 25 },
  ])
  assert.equal(formatUmaWinRate(result.surfaces[1].winRate), "25.0%")
  assert.equal(formatUmaWinRate(result.surfaces[0].winRate), "—")
})

test("surfaces aggregate multiple events with weighted rates and reconcile with global distance totals", () => {
  const cms = [
    cm({ surface: "Turf", distance: 1600, participants: [participant("a", "oguri-base")], attempts: [attempt(80, [["a", 40]])] }),
    cm({ number: 2, surface: "Turf", distance: 2000, participants: [participant("b", "oguri-alt")], attempts: [attempt(20, [["b", 20]])] }),
    cm({ number: 3, surface: "Dirt", distance: 1600, participants: [participant("c", "teio-base")], attempts: [attempt(12, [["c", 2]])] }),
    cm({ number: 4, surface: "Dirt", distance: 1800, participants: [participant("d", "custom-base")], attempts: [attempt(8, [["d", 3]])] }),
  ]
  const snapshot = structuredClone(cms)
  const result = calculateUmaStatistics(cms, characters, versions)
  assert.deepEqual(result.surfaces, [
    { surface: "Turf", races: 100, wins: 60, winRate: 60 },
    { surface: "Dirt", races: 20, wins: 5, winRate: 25 },
  ])
  for (const metric of ["races", "wins"]) {
    const total = result.surfaces.reduce((sum, surface) => sum + surface[metric], 0)
    assert.equal(total, result.distances.reduce((sum, distance) => sum + distance[metric], 0))
    assert.equal(total, result.overall[metric])
  }
  assert.deepEqual(cms, snapshot)
})

test("empty, zero-race and final-only history keep both surface rates unavailable", () => {
  const empty = [{ surface: "Turf", races: 0, wins: 0, winRate: null }, { surface: "Dirt", races: 0, wins: 0, winRate: null }]
  for (const cms of [[], [cm({ surface: "Turf", attempts: [attempt(0, [])] })], [cm({
    surface: "Dirt", finalPlace: "1st", participants: [participant("a", "oguri-base", { finalParticipant: true, won: true })],
  })]]) {
    const result = calculateUmaStatistics(cms, characters, versions)
    assert.deepEqual(result.surfaces, empty)
    assert.deepEqual(result.distances, [])
    assert.ok(result.surfaces.every(surface => formatUmaWinRate(surface.winRate) === "—"))
  }
})

test("surface accounting reuses recorded batches including retired, unresolved and participant-free results", () => {
  const result = calculateUmaStatistics([cm({
    surface: "Turf", participants: [],
    attempts: [{ ...attempt(4, [["removed", 1]]), retired: true }, attempt(5, [])],
  })], characters, versions)
  assert.deepEqual(result.surfaces[0], { surface: "Turf", races: 9, wins: 1, winRate: 1 / 9 * 100 })
  assert.deepEqual(result.distances, [{ distance: 1600, races: 9, wins: 1, winRate: 1 / 9 * 100 }])
  assert.equal(result.overall.races, 9)
  assert.equal(result.overall.wins, 1)
})

test("unknown event surfaces are never inferred as Turf or Dirt", () => {
  for (const surface of [undefined, null, "", "Grass", "turf"]) {
    const result = calculateUmaStatistics([cm({
      surface, participants: [participant("a", "oguri-base")], attempts: [attempt(10, [["a", 5]])],
    })], characters, versions)
    assert.deepEqual(result.surfaces, [{ surface: "Turf", races: 0, wins: 0, winRate: null }, { surface: "Dirt", races: 0, wins: 0, winRate: null }])
    assert.equal(result.overall.races, 10)
    assert.deepEqual(result.distances, [{ distance: 1600, races: 10, wins: 5, winRate: 50 }])
  }
})

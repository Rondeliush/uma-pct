import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getUmaSpotlightDeck, getUmaSpotlightExclusions, getUmaSpotlightIdentity, getUmaSpotlightPages } = await importTS(new URL("../src/Statistics/umaSpotlightData.ts", import.meta.url))
const row = (versionId, fields = {}) => ({ versionId, name: versionId, avatar: `${versionId}.png`, unresolved: false, races: 20, wins: 5, winRate: 25, cmEvents: 2, finalAppearances: 1, finalWins: 1, rawPoints: 500, distances: [], ...fields })
const metrics = ["win-rate", "wins", "races"]
const rows = Array.from({ length: 15 }, (_, i) => row(`uma-${i}`, { races: 20 + i, wins: i, winRate: i / (20 + i) * 100 }))

test("spotlights exclude every current and departing podium character, including alternate versions", () => {
  const identities = new Map([["uma-0", "first"], ["first-alt", "first"], ["uma-1", "second"], ["uma-2", "third"]])
  const podium = [0, 1, 2, 3, 4, 5].map(index => ({ uma: rows[index], value: index, place: index + 1 }))
  const excluded = getUmaSpotlightExclusions(podium, identities)
  const pages = getUmaSpotlightPages([...rows, row("first-alt")], metrics, excluded, identities, .31)
  assert.ok(pages.length > 1)
  for (const page of pages) for (const entry of page.entries) {
    assert.ok(entry)
    assert.equal(excluded.has(getUmaSpotlightIdentity(entry.uma.versionId, identities)), false)
    assert.notEqual(entry.uma.versionId, "first-alt")
  }
})

test("randomized pages stay stable across rerenders and prefer different eligible Umas in each banner", () => {
  const excluded = new Set(["uma-0"])
  const a = getUmaSpotlightPages(rows, metrics, excluded, new Map(), .15)
  const b = getUmaSpotlightPages(rows, metrics, excluded, new Map(), .15)
  const c = getUmaSpotlightPages(rows, metrics, excluded, new Map(), .85)
  assert.deepEqual(a, b)
  assert.notDeepEqual(a.map(page => page.id), c.map(page => page.id))
  assert.equal(new Set(a.map(page => page.id)).size, a.length)
  for (const page of a) assert.equal(new Set(page.entries.map(entry => entry.uma.versionId)).size, 3)
})

test("a small profile reuses a valid side record without ever borrowing a podium Uma", () => {
  const excluded = new Set(["podium"])
  const pages = getUmaSpotlightPages([row("podium"), row("other")], metrics, excluded, new Map(), .2)
  assert.equal(pages.length, 1)
  assert.deepEqual(pages[0].entries.map(entry => entry.uma.versionId), ["other", "other", "other"])
  assert.deepEqual(getUmaSpotlightPages([row("podium")], metrics, excluded, new Map(), .2), [])
  assert.deepEqual(getUmaSpotlightPages([], metrics, new Set(), new Map(), .2), [])
})

test("three eligible Umas rotate through all three banners instead of repeating one fixed page", () => {
  const pages = getUmaSpotlightPages(rows.slice(0, 3), metrics, new Set(), new Map(), .34)
  assert.equal(pages.length, 3)
  for (let slot = 0; slot < 3; slot++) assert.equal(new Set(pages.map(page => page.entries[slot].uma.versionId)).size, 3)
})

test("Win Rate keeps the shared minimum sample and missing artwork or unknown raw totals are not invented", () => {
  const pages = getUmaSpotlightPages([row("one-race", { races: 1, wins: 1, winRate: 100 }), row("no-art", { avatar: "" })], metrics, new Set(), new Map(), .4)
  assert.equal(pages[0].entries[0], null)
  assert.equal(pages[0].entries[1].uma.versionId, "one-race")
  assert.deepEqual(getUmaSpotlightPages([row("unknown", { rawPoints: null })], ["raw-points"], new Set(), new Map(), .4), [])
})

test("each spotlight shows its actual metric, with Main Stage raw points independent of League Score", () => {
  const source = [row("raw", { rawPoints: 5420, leagueScore: 4000 }), row("other", { rawPoints: 0 })]
  const pages = getUmaSpotlightPages(source, ["raw-points", "wins", "races"], new Set(), new Map(), .8)
  for (const page of pages) page.entries.forEach((entry, slot) => {
    assert.equal(entry.value, slot === 0 ? entry.uma.rawPoints : slot === 1 ? entry.uma.wins : entry.uma.races)
  })
  assert.ok(pages.some(page => page.entries[0].value === 5420))
})

test("presentation never mutates statistics, version identities or exclusion sets", () => {
  const before = structuredClone(rows)
  const identities = new Map([["uma-0", "character"]])
  const excluded = new Set(["character"])
  getUmaSpotlightPages(rows, metrics, excluded, identities, .61)
  assert.deepEqual(rows, before)
  assert.deepEqual([...identities], [["uma-0", "character"]])
  assert.deepEqual([...excluded], ["character"])
  assert.equal(getUmaSpotlightIdentity("unknown-version", identities), "unknown-version")
})

test("podium exit cleanup does not rebuild or advance the visible spotlight deck", () => {
  const identities = new Map()
  const duringTransition = new Set(["uma-0", "uma-1", "uma-2", "uma-3", "uma-4", "uma-5"])
  const deck = getUmaSpotlightDeck(null, "overall:races", rows, duringTransition, identities, .31)
  const visible = deck.pages[deck.index]
  const afterCleanup = getUmaSpotlightDeck(deck, "overall:races", rows, new Set(["uma-0", "uma-1", "uma-2"]), identities, .31)
  assert.equal(afterCleanup, deck)
  assert.equal(afterCleanup.pages[afterCleanup.index], visible)
  for (const page of afterCleanup.pages) for (const entry of page.entries) assert.equal(duringTransition.has(entry.uma.versionId), false)
})

test("a new podium scene advances spotlights once and excludes both podium lineups", () => {
  const identities = new Map()
  const first = getUmaSpotlightDeck(null, "overall:wins", rows, new Set(["uma-0", "uma-1", "uma-2"]), identities, .5)
  const exclusions = new Set(["uma-0", "uma-1", "uma-2", "uma-3", "uma-4", "uma-5"])
  const next = getUmaSpotlightDeck(first, "overall:races", rows, exclusions, identities, .5)
  assert.notEqual(next.pages[next.index].id, first.pages[first.index].id)
  assert.equal(next.previous, first.pages[first.index])
  for (const page of next.pages) for (const entry of page.entries) assert.equal(exclusions.has(entry.uma.versionId), false)
  assert.equal(getUmaSpotlightDeck(next, "overall:races", rows, new Set(["uma-3", "uma-4", "uma-5"]), identities, .5), next)
})

test("ordinary renders preserve a manually selected spotlight page; new scenes still rotate", () => {
  const identities = new Map(), exclusions = new Set()
  const initial = getUmaSpotlightDeck(null, "overall:wins", rows, exclusions, identities, .15)
  const selected = { ...initial, index: 2, previous: initial.pages[initial.index], direction: -1 }
  assert.equal(getUmaSpotlightDeck(selected, "overall:wins", rows, new Set(), identities, .15), selected)
  const next = getUmaSpotlightDeck(selected, "overall:races", rows, exclusions, identities, .15)
  assert.notEqual(next.pages[next.index].id, selected.pages[selected.index].id)
  assert.equal(next.previous, selected.pages[selected.index])
})

test("recreated statistics and character maps on detail navigation do not advance spotlights", () => {
  const identities = new Map([["uma-0", "character-0"]])
  const deck = getUmaSpotlightDeck(null, "overall:wins", rows, new Set(), identities, .2)
  const selected = { ...deck, index: 2 }
  assert.equal(getUmaSpotlightDeck(selected, "overall:wins", structuredClone(rows), new Set(), new Map(identities), .2), selected)
})

test("spotlight snapshots refresh for changed profile data and support empty or single-record pools", () => {
  const identities = new Map(), exclusions = new Set()
  const initial = getUmaSpotlightDeck(null, "cm:wins", rows, exclusions, identities, .1)
  const updated = rows.map(uma => ({ ...uma, races: uma.races + 10 }))
  const refreshed = getUmaSpotlightDeck(initial, "cm:wins", updated, exclusions, identities, .1)
  assert.notEqual(refreshed, initial)
  for (const page of refreshed.pages) for (const entry of page.entries) assert.equal(entry.value, updated.find(uma => uma.versionId === entry.uma.versionId).races)
  const empty = getUmaSpotlightDeck(null, "loh:wins", [], exclusions, identities, .1)
  assert.deepEqual(empty.pages, [])
  assert.equal(empty.index, 0)
  const one = getUmaSpotlightDeck(null, "loh:wins", [rows[0]], exclusions, identities, .1)
  assert.equal(one.pages.length, 1)
  assert.equal(getUmaSpotlightDeck(one, "loh:races", one.umas, exclusions, identities, .1).index, 0)
})

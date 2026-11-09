import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getAppHref, parseAppRoute, getStatisticsHref, navigateAppRoute, navigateStatisticsRoute, navigateHomeRoute, isUnavailableRoute, subscribeStatisticsNavigation } = await importTS(new URL("../src/Statistics/statisticsRoute.ts", import.meta.url))

function withBrowser(run, hash = "#/", pathname = "/uma-pct/") {
  const original = globalThis.window
  const browser = new EventTarget()
  const entries = [{ url: `https://example.test${pathname}?existing=1${hash}`, state: { unrelated: "retained" } }]
  let index = 0
  const move = delta => {
    const next = index + delta
    if (next < 0 || next >= entries.length) return
    index = next
    browser.dispatchEvent(new Event("popstate"))
  }
  Object.defineProperty(browser, "location", { get: () => new URL(entries[index].url) })
  browser.history = {
    get state() { return entries[index].state },
    get length() { return entries.length },
    replaceState(state, _title, href) { entries[index] = { state, url: href === undefined ? entries[index].url : new URL(href, entries[index].url).href } },
    pushState(state, _title, href) { entries.splice(index + 1); entries.push({ state, url: new URL(href, entries[index].url).href }); index++ },
    back() { move(-1) },
    forward() { move(1) },
  }
  globalThis.window = browser
  try { run(browser) } finally { globalThis.window = original }
}

test("main pages have stable hash URLs and refresh can resolve each page from the URL alone", () => {
  for (const [page, href] of Object.entries({ home: "#/", cms: "#/cm", loh: "#/loh", autoRunTimer: "#/autorun", umaDatabase: "#/uma-database", settings: "#/settings", profiles: "#/profiles", about: "#/about", changelog: "#/changelog" })) {
    assert.equal(getAppHref(page), href)
    assert.deepEqual(parseAppRoute(href), { page, cmId: null, statistics: null })
    assert.equal(isUnavailableRoute(href, "/uma-pct/", "/uma-pct/"), false)
    if (page !== "home") assert.equal(parseAppRoute(href + "/").page, page)
  }
  assert.equal(parseAppRoute("").page, "home", "legacy bare launch keeps existing Home startup")
})

test("CM identity is the saved event number, independent of names or display ordering", () => {
  for (const number of [1, 18, 5435]) {
    assert.equal(getAppHref("cms", String(number)), `#/cm/${number}`)
    assert.deepEqual(parseAppRoute(`#/cm/${number}`), { page: "cms", cmId: String(number), statistics: null })
  }
  for (const id of ["not-a-real-id", "%", "%E0%A4", "invalid/extra"]) {
    assert.equal(parseAppRoute(`#/cm/${id}`).cmId, id, "unresolved IDs stay intact for the unavailable view")
  }
})

test("LoH detail URLs use saved event numbers and decode identity independently of CM", () => {
  for (const number of [1, 32, 5435]) {
    assert.equal(getAppHref("loh", String(number)), `#/loh/${number}`)
    assert.deepEqual(parseAppRoute(`#/loh/${number}`), { page: "loh", cmId: null, lohId: String(number), statistics: null })
    assert.equal(isUnavailableRoute(`#/loh/${number}`, "/uma-pct/", "/uma-pct/"), false)
  }
  const id = "missing/event?#%"
  assert.equal(parseAppRoute(getAppHref("loh", id)).lohId, id)
  for (const id of ["secret", "%", "%E0%A4", "invalid/extra"]) {
    assert.equal(parseAppRoute(`#/loh/${id}`).lohId, id, "unresolved event identities are checked against profile data by the app")
  }
  assert.equal(isUnavailableRoute("#/loh/1", "/uma-pct/missing", "/uma-pct/"), true)
})

test("existing Statistics routes and opaque entity IDs are delegated unchanged", () => {
  for (const [section, id] of [["landing", null], ["events", null], ["uma", null], ["uma", "custom/version?#%"], ["compare", null], ["tracks", null], ["tracks", "hanshin"]]) {
    const route = parseAppRoute(getStatisticsHref(section, id))
    assert.equal(route.page, "statistics")
    assert.deepEqual(route.statistics, { section, umaVersionId: section === "uma" ? id : null, trackId: section === "tracks" ? id : null })
  }
})

test("unknown and nested non-detail routes remain unavailable", () => {
  for (const hash of ["#/unknown", "#/loh-extra", "#/cms", "#/settings/secret", "#/profiles/secret", "#/autorun/extra", "#/cm-extra", "#/statistics/events/extra", "#/statistics/compare/extra"]) {
    assert.equal(parseAppRoute(hash), null)
    assert.equal(isUnavailableRoute(hash, "/uma-pct/", "/uma-pct/"), true)
  }
  assert.equal(isUnavailableRoute("#/cm/18", "/uma-pct/missing", "/uma-pct/"), true)
})

test("main pages, CM details and Statistics follow one native Back/Forward history", () => withBrowser(browser => {
  navigateAppRoute("cms")
  navigateAppRoute("cms", "18")
  navigateStatisticsRoute("landing")
  navigateStatisticsRoute("tracks")
  navigateStatisticsRoute("tracks", "hanshin")
  const expected = ["#/statistics/tracks", "#/statistics", "#/cm/18", "#/cm", "#/"]
  assert.equal(browser.history.length, 6)
  for (const href of expected) { browser.history.back(); assert.equal(browser.location.hash, href) }
  for (const href of [...expected].reverse().slice(1).concat("#/statistics/tracks/hanshin")) {
    browser.history.forward(); assert.equal(browser.location.hash, href)
  }
  assert.equal(browser.history.state.unrelated, "retained")
}))

test("LoH participates in native history alongside CM and Statistics", () => withBrowser(browser => {
  navigateAppRoute("cms")
  navigateAppRoute("loh")
  navigateStatisticsRoute("tracks")
  browser.history.back(); assert.equal(browser.location.hash, "#/loh")
  browser.history.back(); assert.equal(browser.location.hash, "#/cm")
  browser.history.forward(); assert.equal(browser.location.hash, "#/loh")
}))

test("LoH details share native Back/Forward history with CM details and Statistics", () => withBrowser(browser => {
  navigateAppRoute("cms", "32")
  navigateAppRoute("loh")
  navigateAppRoute("loh", "1")
  navigateStatisticsRoute("uma")
  browser.history.back(); assert.equal(browser.location.hash, "#/loh/1")
  browser.history.back(); assert.equal(browser.location.hash, "#/loh")
  browser.history.back(); assert.equal(browser.location.hash, "#/cm/32")
  browser.history.forward(); assert.equal(browser.location.hash, "#/loh")
  browser.history.forward(); assert.equal(browser.location.hash, "#/loh/1")
  browser.history.forward(); assert.equal(browser.location.hash, "#/statistics/uma")
}))

test("closing a LoH detail returns to its existing list entry without creating duplicate history", () => withBrowser(browser => {
  navigateAppRoute("loh")
  navigateAppRoute("loh", "1")
  navigateAppRoute("loh", null, "/uma-pct/", true)
  assert.equal(browser.location.hash, "#/loh")
  assert.equal(browser.history.length, 3)
  browser.history.back(); assert.equal(browser.location.hash, "#/")
  browser.history.forward(); assert.equal(browser.location.hash, "#/loh")
  browser.history.forward(); assert.equal(browser.location.hash, "#/loh/1")
}))

test("a direct or refreshed LoH detail can close to the LoH list safely", () => withBrowser(browser => {
  navigateAppRoute("loh", null, "/uma-pct/", true)
  assert.equal(browser.location.hash, "#/loh")
  browser.history.back(); assert.equal(browser.location.hash, "#/loh/1")
  browser.history.forward(); assert.equal(browser.location.hash, "#/loh")
}, "#/loh/1"))

test("CM close returns to the existing list entry; a direct detail URL closes safely to CM", () => {
  withBrowser(browser => {
    navigateAppRoute("cms"); navigateAppRoute("cms", "18")
    navigateAppRoute("cms", null, "/uma-pct/", true)
    assert.equal(browser.location.hash, "#/cm")
    assert.equal(browser.history.length, 3)
    browser.history.back(); assert.equal(browser.location.hash, "#/")
    browser.history.forward(); assert.equal(browser.location.hash, "#/cm")
    browser.history.forward(); assert.equal(browser.location.hash, "#/cm/18")
  })
  withBrowser(browser => {
    navigateAppRoute("cms", null, "/uma-pct/", true)
    assert.equal(browser.location.hash, "#/cm")
    browser.history.back(); assert.equal(browser.location.hash, "#/cm/18")
  }, "#/cm/18")
})

test("primary navigation pushes visits even when revisiting a parent, while duplicate current visits are ignored", () => withBrowser(browser => {
  navigateAppRoute("cms"); navigateAppRoute("home")
  assert.equal(browser.history.length, 3)
  navigateAppRoute("home"); assert.equal(browser.history.length, 3)
  browser.history.back(); assert.equal(browser.location.hash, "#/cm")
  browser.history.back(); assert.equal(browser.location.hash, "#/")
}))

test("Profiles is a page route with ordinary history, without modifying profile storage", () => withBrowser(browser => {
  navigateAppRoute("settings"); navigateAppRoute("profiles"); navigateAppRoute("home")
  browser.history.back(); assert.equal(parseAppRoute(browser.location.hash).page, "profiles")
  browser.history.back(); assert.equal(parseAppRoute(browser.location.hash).page, "settings")
}))

test("fallback Home and main navigation recover the app path and preserve failed URLs for Back", () => {
  for (const page of ["home", "cms", "autoRunTimer", "settings", "profiles"]) withBrowser(browser => {
    const failed = browser.location.href
    if (page === "home") navigateHomeRoute("/uma-pct/")
    else navigateAppRoute(page, null, "/uma-pct/")
    assert.equal(browser.location.href, `https://example.test/uma-pct/?existing=1${getAppHref(page)}`)
    browser.history.back(); assert.equal(browser.location.href, failed)
  }, "#/unknown", "/uma-pct/missing")
})

test("the existing route subscription covers both main and Statistics navigation and cleans up", () => withBrowser(browser => {
  const seen = [], unsubscribe = subscribeStatisticsNavigation(() => seen.push(browser.location.hash))
  navigateAppRoute("cms"); navigateStatisticsRoute("uma"); navigateAppRoute("autoRunTimer")
  browser.history.back(); browser.dispatchEvent(new Event("hashchange"))
  assert.deepEqual(seen, ["#/cm", "#/statistics/uma", "#/autorun", "#/statistics/uma", "#/statistics/uma"])
  unsubscribe(); navigateAppRoute("settings"); assert.equal(seen.length, 5)
}))

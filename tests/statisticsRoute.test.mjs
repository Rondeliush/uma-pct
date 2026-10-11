import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getStatisticsHref, parseStatisticsRoute, navigateStatisticsRoute, clearStatisticsRoute, subscribeStatisticsNavigation, getNavigationLocation, isUnavailableRoute, navigateHomeRoute } = await importTS(new URL("../src/Statistics/statisticsRoute.ts", import.meta.url))
const { getTrackStatisticsHref, parseTrackStatisticsRoute } = await importTS(new URL("../src/Statistics/trackStatisticsRoute.ts", import.meta.url))

function withBrowser(run, initialHash = "", state = { unrelated: "retained" }, pathname = "/uma-pct/") {
  const originalWindow = globalThis.window
  const browser = new EventTarget()
  const entries = [{ url: `https://example.test${pathname}?existing=1${initialHash}`, state }]
  let index = 0
  let backCalls = 0
  const move = (delta) => {
    const next = index + delta
    if (next < 0 || next >= entries.length) return
    index = next
    browser.dispatchEvent(new Event("popstate"))
  }
  Object.defineProperty(browser, "location", { get: () => new URL(entries[index].url) })
  browser.history = {
    get state() { return entries[index].state },
    get length() { return entries.length },
    replaceState(state, _title, href) {
      entries[index] = { state, url: href === undefined ? entries[index].url : new URL(href, entries[index].url).href }
    },
    pushState(state, _title, href) {
      entries.splice(index + 1)
      entries.push({ state, url: new URL(href, entries[index].url).href })
      index++
    },
    back() { backCalls++; move(-1) },
    forward() { move(1) },
    get backCalls() { return backCalls },
  }
  globalThis.window = browser
  try { run(browser) } finally { globalThis.window = originalWindow }
}

test("all six Statistics locations have canonical hash URLs and round-trip route parameters", () => {
  const routes = [
    ["landing", null, "#/statistics"], ["events", null, "#/statistics/events"],
    ["uma", null, "#/statistics/uma"], ["uma", "exact-version-id", "#/statistics/uma/exact-version-id"],
    ["tracks", null, "#/statistics/tracks"], ["tracks", "hanshin", "#/statistics/tracks/hanshin"],
  ]
  for (const [section, id, href] of routes) {
    assert.equal(getStatisticsHref(section, id), href)
    assert.deepEqual(parseStatisticsRoute(href), { section, umaVersionId: section === "uma" ? id : null, trackId: section === "tracks" ? id : null })
  }
  assert.equal(getStatisticsHref(), "#/statistics")
})

test("Uma details use opaque stable IDs, retaining custom, legacy, Unicode and reserved characters", () => {
  for (const id of ["oguri_cap_s02", "custom:1234", "legacy/missing version", "żółw?#%", "VERSION-ID"]) {
    const href = getStatisticsHref("uma", id)
    assert.equal(href, `#/statistics/uma/${encodeURIComponent(id)}`)
    assert.equal(parseStatisticsRoute(href).umaVersionId, id)
  }
})

test("existing Track URL builders and parsers share the generalized Statistics implementation", () => {
  for (const id of [null, "hanshin", "sapporo", "ooi", "missing", "invalid/id"]) {
    assert.equal(getTrackStatisticsHref(id), getStatisticsHref("tracks", id))
    assert.deepEqual(parseTrackStatisticsRoute(getTrackStatisticsHref(id)), { trackId: id })
  }
  assert.equal(parseTrackStatisticsRoute("#/statistics/uma"), null)
})

test("overview trailing slashes are safe and unrelated pages never become Statistics routes", () => {
  for (const section of ["landing", "events", "uma", "tracks"]) assert.equal(parseStatisticsRoute(getStatisticsHref(section) + "/").section, section)
  for (const hash of ["", "#/cms", "#/settings", "#/profiles", "#/statistics-extra", "#/statistics/unknown", "#/statistics/events/extra", "#/statistics/uma-extra"]) assert.equal(parseStatisticsRoute(hash), null)
})

test("invalid and malformed detail parameters stay intact for not-found views without selecting a default", () => {
  for (const section of ["uma", "tracks"]) {
    const field = section === "uma" ? "umaVersionId" : "trackId"
    for (const id of ["missing", "%E0%A4", "%", "invalid/extra"]) assert.equal(parseStatisticsRoute(`#/statistics/${section}/${id}`)[field], id)
  }
})

test("unknown hashes and paths are unavailable, preserving all existing application and Statistics URLs", () => {
  for (const pathname of ["/uma-pct", "/uma-pct/", "/uma-pct/index.html"]) {
    for (const hash of ["", "#/statistics", "#/statistics/events", "#/statistics/uma", "#/statistics/uma/version-id", "#/statistics/tracks", "#/statistics/tracks/hanshin"]) {
      assert.equal(isUnavailableRoute(hash, pathname, "/uma-pct/"), false, pathname + hash)
    }
  }
  for (const hash of ["#/unknown", "#/loh", "#/statistics/blocked", "#/statistics/events/extra", "#internal-route"]) {
    assert.equal(isUnavailableRoute(hash, "/uma-pct/", "/uma-pct/"), true)
  }
  for (const pathname of ["/uma-pct/missing", "/uma-pct/statistics/tracks/missing", "/elsewhere/"]) {
    for (const hash of ["", "#/statistics/uma"]) assert.equal(isUnavailableRoute(hash, pathname, "/uma-pct/"), true)
  }
  assert.equal(isUnavailableRoute("", "/", "/"), false)
})

test("Home clears an unavailable URL and keeps it accessible through browser Back and Forward", () => withBrowser((browser) => {
  const unavailableUrl = browser.location.href
  let navigationEvents = 0
  const unsubscribe = subscribeStatisticsNavigation(() => navigationEvents++)
  navigateHomeRoute("/uma-pct/")
  assert.equal(browser.location.href, "https://example.test/uma-pct/?existing=1#/")
  assert.equal(browser.history.state.umaPctStatisticsHref, "#/")
  assert.equal(browser.history.state.umaPctStatisticsParent, null)
  assert.equal(browser.history.state.unrelated, "retained")
  assert.equal(navigationEvents, 1)
  browser.history.back()
  assert.equal(getNavigationLocation(), unavailableUrl)
  browser.history.forward()
  assert.equal(browser.location.hash, "#/")
  unsubscribe()
}, "#/statistics/uma/missing", { unrelated: "retained" }, "/uma-pct/not-a-real-page"))

test("navigation from an unavailable path opens the requested valid Statistics URL without replacing the failed entry", () => withBrowser((browser) => {
  const unavailableUrl = browser.location.href
  navigateStatisticsRoute("tracks", null, "home", "/uma-pct/")
  assert.equal(browser.location.href, "https://example.test/uma-pct/?existing=1#/statistics/tracks")
  assert.equal(browser.history.length, 2)
  browser.history.back()
  assert.equal(browser.location.href, unavailableUrl)
}, "#/statistics/tracks", undefined, "/uma-pct/missing"))

test("header navigation can clear an unavailable hash or path while keeping unrelated state and query parameters", () => withBrowser((browser) => {
  clearStatisticsRoute("/uma-pct/")
  assert.equal(browser.location.href, "https://example.test/uma-pct/?existing=1")
  assert.equal(browser.history.state.unrelated, "retained")
  assert.equal(browser.history.length, 1)
}, "#/not-a-real-page", undefined, "/uma-pct/missing"))

test("Statistics, Uma, Details and browser Back/Forward use native history entries", () => withBrowser((browser) => {
  navigateStatisticsRoute("landing", null, "home")
  navigateStatisticsRoute("uma")
  navigateStatisticsRoute("uma", "saved-id")
  assert.equal(browser.history.length, 4)
  assert.equal(browser.location.hash, "#/statistics/uma/saved-id")
  browser.history.back()
  assert.equal(browser.location.hash, "#/statistics/uma")
  browser.history.back()
  assert.equal(browser.location.hash, "#/statistics")
  browser.history.forward()
  assert.equal(browser.location.hash, "#/statistics/uma")
  browser.history.forward()
  assert.equal(browser.location.hash, "#/statistics/uma/saved-id")
  browser.history.back(); browser.history.back(); browser.history.back()
  assert.equal(browser.location.hash, "")
  assert.equal(browser.history.state.umaPctStatisticsReturnPage, "home")
  assert.equal(browser.history.state.unrelated, "retained")
}))

test("explicit overview and landing back actions return to their existing parent history entry", () => withBrowser((browser) => {
  navigateStatisticsRoute("landing", null, "settings")
  navigateStatisticsRoute("tracks")
  navigateStatisticsRoute("tracks", "hanshin")
  navigateStatisticsRoute("tracks")
  assert.equal(browser.history.backCalls, 1)
  assert.equal(browser.location.hash, "#/statistics/tracks")
  navigateStatisticsRoute("landing")
  assert.equal(browser.history.backCalls, 2)
  assert.equal(browser.location.hash, "#/statistics")
  browser.history.back()
  assert.equal(browser.history.state.umaPctStatisticsReturnPage, "settings")
}))

test("direct details visits have a safe explicit overview destination without leaving Statistics", () => {
  for (const section of ["uma", "tracks"]) withBrowser((browser) => {
    navigateStatisticsRoute(section)
    assert.equal(browser.history.backCalls, 0)
    assert.equal(browser.location.hash, getStatisticsHref(section))
    browser.history.back()
    assert.equal(browser.location.hash, getStatisticsHref(section, "saved-id"))
  }, getStatisticsHref(section, "saved-id"))
})

test("matching current routes do not add duplicate entries and stale parent markers do not trigger Back", () => withBrowser((browser) => {
  navigateStatisticsRoute("uma")
  assert.equal(browser.history.length, 1)
  navigateStatisticsRoute("landing")
  assert.equal(browser.history.backCalls, 0)
  assert.equal(browser.location.hash, "#/statistics")
}, "#/statistics/uma", { umaPctStatisticsHref: "#/statistics/tracks", umaPctStatisticsParent: "#/statistics" }))

test("leaving Statistics clears only its hash, preserving the base path, query and unrelated history state", () => {
  for (const section of ["landing", "events", "uma", "tracks"]) withBrowser((browser) => {
    clearStatisticsRoute()
    assert.equal(browser.location.href, "https://example.test/uma-pct/?existing=1")
    assert.equal(browser.history.length, 1)
    assert.equal(browser.history.state.unrelated, "retained")
    assert.equal(browser.history.state.umaPctStatisticsParent, null)
  }, getStatisticsHref(section))
  withBrowser((browser) => { clearStatisticsRoute(); assert.equal(browser.location.hash, "#/other") }, "#/other")
})

test("route subscribers observe programmatic visits, native history and hash changes, and clean up", () => withBrowser((browser) => {
  const seen = []
  const unsubscribe = subscribeStatisticsNavigation(() => seen.push(browser.location.hash))
  navigateStatisticsRoute("events", null, "home")
  navigateStatisticsRoute("uma")
  browser.history.back()
  browser.dispatchEvent(new Event("hashchange"))
  clearStatisticsRoute()
  assert.deepEqual(seen, ["#/statistics/events", "#/statistics/uma", "#/statistics/events", "#/statistics/events", ""])
  unsubscribe()
  navigateStatisticsRoute("tracks")
  assert.equal(seen.length, 5)
}))

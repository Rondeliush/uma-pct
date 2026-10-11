export type StatisticsSection = "landing" | "events" | "uma" | "tracks"
export type StatisticsRoute = {
  section: StatisticsSection
  umaVersionId: string | null
  trackId: string | null
}

const STATISTICS_ROUTE = "#/statistics"
const NAVIGATION_EVENT = "uma-pct-statistics-navigation"

const APP_ROUTES = {
  home: "#/",
  cms: "#/cm",
  statistics: STATISTICS_ROUTE,
  autoRunTimer: "#/autorun",
  umaDatabase: "#/uma-database",
  settings: "#/settings",
  profiles: "#/profiles",
  about: "#/about",
  changelog: "#/changelog",
} as const

export type AppPage = keyof typeof APP_ROUTES
export type AppRoute = {
  page: AppPage
  cmId: string | null
  statistics: StatisticsRoute | null
}

export function getAppHref(page: AppPage, cmId: string | null = null) {
  return page === "cms" && cmId !== null ? `${APP_ROUTES.cms}/${encodeURIComponent(cmId)}` : APP_ROUTES[page]
}

export function parseAppRoute(hash: string): AppRoute | null {
  const statistics = parseStatisticsRoute(hash)
  if (statistics) return { page: "statistics", cmId: null, statistics }
  if (hash === "") return { page: "home", cmId: null, statistics: null }
  for (const page of Object.keys(APP_ROUTES) as AppPage[]) {
    if (page !== "statistics" && (hash === APP_ROUTES[page] || (page !== "home" && hash === `${APP_ROUTES[page]}/`))) {
      return { page, cmId: null, statistics: null }
    }
  }
  if (hash.startsWith(`${APP_ROUTES.cms}/`)) {
    let cmId = hash.slice(APP_ROUTES.cms.length + 1)
    try { cmId = decodeURIComponent(cmId) } catch { /* Unresolved IDs use the shared unavailable page. */ }
    return { page: "cms", cmId, statistics: null }
  }
  return null
}

export function getStatisticsHref(section: StatisticsSection = "landing", detailId: string | null = null) {
  const base = section === "landing" ? STATISTICS_ROUTE : `${STATISTICS_ROUTE}/${section}`
  return detailId !== null && (section === "uma" || section === "tracks") ? `${base}/${encodeURIComponent(detailId)}` : base
}

export function parseStatisticsRoute(hash: string): StatisticsRoute | null {
  if (hash === STATISTICS_ROUTE || hash === `${STATISTICS_ROUTE}/`) return { section: "landing", umaVersionId: null, trackId: null }
  for (const section of ["events", "uma", "tracks"] as const) {
    const base = getStatisticsHref(section)
    if (hash === base || hash === `${base}/`) return { section, umaVersionId: null, trackId: null }
    if (section === "events" || !hash.startsWith(`${base}/`)) continue
    const segment = hash.slice(base.length + 1)
    let id = segment
    try { id = decodeURIComponent(segment) } catch { /* Keep malformed IDs for the existing not-found view. */ }
    return { section, umaVersionId: section === "uma" ? id : null, trackId: section === "tracks" ? id : null }
  }
  return null
}

export const getStatisticsHash = () => window.location.hash
export const getNavigationLocation = () => window.location.href

export function isUnavailableRoute(hash: string, pathname: string, basePath: string) {
  const base = basePath.replace(/\/?$/, "/")
  const isAppPath = pathname === base || pathname === base.slice(0, -1) || pathname === `${base}index.html`
  return !isAppPath || parseAppRoute(hash) === null
}

export function subscribeStatisticsNavigation(listener: () => void) {
  for (const event of ["popstate", "hashchange", NAVIGATION_EVENT]) window.addEventListener(event, listener)
  return () => {
    for (const event of ["popstate", "hashchange", NAVIGATION_EVENT]) window.removeEventListener(event, listener)
  }
}

/** Share native history entries between main pages and the existing Statistics routes. */
function navigateHref(href: string, basePath?: string, backToParent = false, returnPage?: string) {
  const currentHref = window.location.hash
  const unavailablePath = basePath !== undefined && isUnavailableRoute("", window.location.pathname, basePath)
  if (href === currentHref && !unavailablePath) return
  const state = window.history.state
  if (backToParent && !unavailablePath && state?.umaPctStatisticsHref === currentHref && state.umaPctStatisticsParent === href) {
    window.history.back()
    return
  }
  const currentRoute = unavailablePath ? null : parseAppRoute(currentHref)
  if (currentHref === "" && returnPage) window.history.replaceState({ ...state, umaPctStatisticsReturnPage: returnPage }, "")
  window.history.pushState({
    ...window.history.state,
    umaPctStatisticsHref: href,
    umaPctStatisticsParent: currentRoute ? currentHref : null,
    umaPctStatisticsReturnPage: null,
  }, "", unavailablePath ? `${basePath}${window.location.search}${href}` : href)
  window.dispatchEvent(new Event(NAVIGATION_EVENT))
}

export function navigateAppRoute(page: AppPage, cmId: string | null = null, basePath?: string, backToParent = false) {
  navigateHref(getAppHref(page, cmId), basePath, backToParent)
}

export function navigateStatisticsRoute(section: StatisticsSection, detailId: string | null = null, returnPage?: string, basePath?: string) {
  navigateHref(getStatisticsHref(section, detailId), basePath, true, returnPage)
}

/** Other app pages retain their existing state navigation and unmodified base URL. */
export function clearStatisticsRoute(basePath?: string) {
  if (basePath === undefined && !parseStatisticsRoute(window.location.hash)) return
  window.history.replaceState({ ...window.history.state, umaPctStatisticsHref: null, umaPctStatisticsParent: null, umaPctStatisticsReturnPage: null }, "", (basePath ?? window.location.pathname) + window.location.search)
  window.dispatchEvent(new Event(NAVIGATION_EVENT))
}

/** An explicit Home action keeps the unavailable URL in browser history. */
export function navigateHomeRoute(basePath: string) {
  navigateAppRoute("home", null, basePath)
}

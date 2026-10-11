import { useCallback, useLayoutEffect, useSyncExternalStore } from "react"
import type { HeaderPage } from "../components/Header/Header"
import { getAppHref, getNavigationLocation, getStatisticsHref, isUnavailableRoute, navigateAppRoute, navigateStatisticsRoute, parseAppRoute, subscribeStatisticsNavigation } from "./statisticsRoute"
import type { StatisticsSection } from "./statisticsRoute"

export default function useStatisticsNavigation() {
  const location = useSyncExternalStore(subscribeStatisticsNavigation, getNavigationLocation, () => "")
  const { hash, pathname } = new URL(location, "http://localhost")
  const appRoute = parseAppRoute(hash)
  const route = appRoute?.statistics ?? null
  const unavailable = isUnavailableRoute(hash, pathname, import.meta.env.BASE_URL)
  const pageHref = unavailable || !appRoute ? location : route
    ? getStatisticsHref(route.section, route.umaVersionId ?? route.trackId) : getAppHref(appRoute.page, appRoute.cmId)

  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = "manual"
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
    return () => { window.history.scrollRestoration = previousRestoration }
  }, [pageHref])

  const navigatePage = useCallback((page: HeaderPage) => {
    if (page === "statistics") navigateStatisticsRoute("landing", null, undefined, import.meta.env.BASE_URL)
    else if (page !== "loh") navigateAppRoute(page, null, import.meta.env.BASE_URL)
  }, [])

  const navigateSection = (section: StatisticsSection) => {
    navigateStatisticsRoute(section, null, undefined, import.meta.env.BASE_URL)
  }
  const openDetails = (section: "uma" | "tracks", id: string) => {
    navigateStatisticsRoute(section, id, undefined, import.meta.env.BASE_URL)
    requestAnimationFrame(() => {
      document.getElementById(section === "uma" ? "uma-statistics-detail-title" : "track-detail-title")?.focus({ preventScroll: true })
    })
  }
  return { route, appRoute, unavailable, navigatePage, navigateSection,
    navigateUma: (id: string) => openDetails("uma", id), navigateTrack: (id: string) => openDetails("tracks", id),
    navigateCm: (number: number) => navigateAppRoute("cms", String(number), import.meta.env.BASE_URL),
    closeCm: () => navigateAppRoute("cms", null, import.meta.env.BASE_URL, true),
  }
}

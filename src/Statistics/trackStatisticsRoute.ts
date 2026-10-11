import { getStatisticsHref, parseStatisticsRoute } from "./statisticsRoute"

export function getTrackStatisticsHref(trackId: string | null = null) {
  return getStatisticsHref("tracks", trackId)
}

export function parseTrackStatisticsRoute(hash: string): { trackId: string | null } | null {
  const route = parseStatisticsRoute(hash)
  return route?.section === "tracks" ? { trackId: route.trackId } : null
}

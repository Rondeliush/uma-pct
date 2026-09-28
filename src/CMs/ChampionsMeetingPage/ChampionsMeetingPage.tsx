import { useIsMobile } from "../../responsive/useIsMobile"

import ChampionsMeetingPageDesktop from "./ChampionsMeetingPageDesktop"
import ChampionsMeetingPageMobile from "./ChampionsMeetingPageMobile"

import type {
  ChampionsMeetingPageProps,
} from "./ChampionsMeetingPageDesktop"

import {
  useChampionsMeetingPage,
} from "./useChampionsMeetingPage"

function ChampionsMeetingPage(
  props: ChampionsMeetingPageProps
) {
  const isMobile = useIsMobile()

  const pageState =
    useChampionsMeetingPage(
      props.cms,
      props.profileId
    )

  return isMobile ? (
    <ChampionsMeetingPageMobile
      {...props}
      pageState={pageState}
    />
  ) : (
    <ChampionsMeetingPageDesktop
      {...props}
      pageState={pageState}
    />
  )
}
export default ChampionsMeetingPage
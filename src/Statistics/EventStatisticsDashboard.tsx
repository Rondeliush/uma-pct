import type { ReactNode } from "react"
import type { CM } from "../types/types"
import type { LoH } from "../LoH/types"
import LoHEventStatistics from "../LoH/LoHEventStatistics"
import CMEventStatistics from "./CMEventStatistics"
import "../Home/Home.css"
import "./EventStatisticsDashboard.css"

export default function EventStatisticsDashboard({ cms, lohs, navigation, onOpenCm, onOpenLoH }: {
  cms: CM[]; lohs: LoH[]; navigation: ReactNode; onOpenCm: (number: number) => void; onOpenLoH: (number: number) => void
}) {
  return <div className="event-statistics-dashboard home-dashboard">
    <div className="event-statistics-toolbar">
      {navigation}
    </div>
    <CMEventStatistics cms={cms} onOpen={onOpenCm} />
    <LoHEventStatistics lohs={lohs} onOpen={onOpenLoH} />
  </div>
}

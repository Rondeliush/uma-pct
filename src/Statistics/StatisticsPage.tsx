import { useState } from "react"

import type {
  Dispatch,
  SetStateAction,
} from "react"

import type { CM } from "../types/types"

import CMStatisticsDashboard from "./CMStatisticsDashboard"
import LoHStatisticsDashboard from "./LoHStatisticsDashboard"

type StatisticsPageProps = {
  cms: CM[]
  setCms: Dispatch<SetStateAction<CM[]>>
}

type StatisticsMode =
  | "cm"
  | "loh"

function StatisticsPage({
  cms,
  setCms,
}: StatisticsPageProps) {
  const [dashboardMode, setDashboardMode] =
    useState<StatisticsMode>("cm")

  return (
    <div className="space-y-6">

      {/* STATISTICS MODE */}
      <div className="text-center">
      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/40">
        Event Statistics
      </div>
      </div>

      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#07111f]/85 p-1 shadow-lg backdrop-blur-md">

          {/* CM */}
          <button
            type="button"
            onClick={() =>
              setDashboardMode("cm")
            }
            className={`relative min-w-[120px] rounded-lg px-5 py-2.5 text-sm font-black transition ${
              dashboardMode === "cm"
                ? "bg-sky-400/[0.12] text-sky-200 shadow-[0_0_14px_rgba(56,189,248,0.10)]"
                : "text-blue-100/35 hover:bg-white/[0.03] hover:text-white/70"
            }`}
          >
            Champions Meeting

            {dashboardMode === "cm" && (
              <span className="absolute inset-x-4 -bottom-1 h-[2px] rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]" />
            )}
          </button>

          {/* LOH */}
          <button
            type="button"
            onClick={() =>
              setDashboardMode("loh")
            }
            className={`relative min-w-[120px] rounded-lg px-5 py-2.5 text-sm font-black transition ${
              dashboardMode === "loh"
                ? "bg-rose-400/[0.12] text-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.10)]"
                : "text-blue-100/35 hover:bg-white/[0.03] hover:text-white/70"
            }`}
          >
            League of Heroes

            {dashboardMode === "loh" && (
              <span className="absolute inset-x-4 -bottom-1 h-[2px] rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
            )}
          </button>

        </div>
      </div>

      {/* DASHBOARD */}
      {dashboardMode === "cm" ? (
        <CMStatisticsDashboard
          cms={cms}
          setCms={setCms}
        />
      ) : (
        <LoHStatisticsDashboard />
      )}

    </div>
  )
}

export default StatisticsPage
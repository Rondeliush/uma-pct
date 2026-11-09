import { useUmaDatabase } from "../context/UmaDatabaseContext"
import EventUmaCard from "../components/EventUmaCard"
import { getRunningStyleLabel, snapshotParticipantConfiguration } from "../CMs/cmParticipantConfiguration"
import type { LoHExtraStageResult, LoHLineupMember } from "./types"
import { LOH_EXTRA_STAGE_PLACEMENT_LABELS } from "./extraStage"

export default function LoHExtraStageLineup({ lineup, result }: { lineup: readonly LoHLineupMember[]; result?: LoHExtraStageResult }) {
  const { versions } = useUmaDatabase()
  return <div className="mt-4 grid grid-cols-3 items-start gap-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-6">
    {lineup.map(uma => {
      const version = versions.find(item => item.id === uma.umaId)
      const placement = result?.placements.find(item => item.umaId === uma.umaId)?.placement
      return <div key={uma.umaId} data-loh-extra-uma={uma.umaId} className="flex min-w-0 justify-center">
        <EventUmaCard configuration={snapshotParticipantConfiguration(uma)} version={version} name={version?.displayName ?? uma.umaId} tone="loh" showName
          primaryStat={placement ? LOH_EXTRA_STAGE_PLACEMENT_LABELS[placement] : "Registered"}
          supportingText={<>{getRunningStyleLabel(uma.runningStyle) || "Unknown style"}{result && <span className="mt-1 block">SUPER HERO</span>}</>} />
      </div>
    })}
  </div>
}

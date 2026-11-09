import { useUmaDatabase } from "../context/UmaDatabaseContext"
import CMLogParticipantCell from "../CMs/CMLogParticipantCell"
import { snapshotParticipantConfiguration } from "../CMs/cmParticipantConfiguration"
import { LOH_EXTRA_STAGE_PLACEMENT_LABELS } from "./extraStage"
import type { LoH } from "./types"

/** The registered lineup and its single recorded race, independent of Main Stage sets. */
export default function LoHExtraStageHistory({ event }: { event: LoH }) {
  const { versions } = useUmaDatabase()
  const extra = event.extraStage
  const result = extra?.result
  if (!result) return null

  return <section aria-label="Extra Stage race history" data-loh-extra-stage-history className="pt-4">
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <h3 className="text-lg font-black text-rose-200">Extra Stage</h3>
      <p className="text-xs font-bold text-blue-100/60">1 Race</p>
    </div>
    <div className="rounded-lg border border-rose-400/20 bg-rose-400/[0.02] px-3 py-2.5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span>{result.weather} · {result.condition}</span>
        <time dateTime={result.createdAt}>{new Date(result.createdAt).toLocaleString()}</time>
      </div>
      <div className="grid grid-cols-3 overflow-hidden rounded-md border border-white/[0.06] bg-black/10">
        {extra.lineupSnapshot.map(uma => {
          const placement = result.placements.find(item => item.umaId === uma.umaId)!.placement
          return <CMLogParticipantCell key={uma.umaId} configuration={snapshotParticipantConfiguration(uma)}
            version={versions.find(version => version.id === uma.umaId)} resultText={LOH_EXTRA_STAGE_PLACEMENT_LABELS[placement]} winner={placement === "first"} final />
        })}
      </div>
    </div>
  </section>
}

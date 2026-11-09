import type { Dispatch, SetStateAction } from "react"
import UmaForm from "../../CMs/UmaForm"
import type { UmaFormData } from "./eventFormData"

type Props = { eventType?: "CM" | "LoH"; umas: UmaFormData[]; setUmas: Dispatch<SetStateAction<UmaFormData[]>> }

export default function EventTeamLineup({ eventType = "CM", umas, setUmas }: Props) {
  return (
    <section className={`relative overflow-hidden rounded-2xl border bg-[#080d21]/85 p-5 backdrop-blur-sm ${eventType === "LoH" ? "border-rose-500/55 shadow-[0_0_18px_rgba(244,63,94,0.20),0_0_38px_rgba(244,63,94,0.10),inset_0_0_18px_rgba(244,63,94,0.035)]" : "border-violet-500/55 shadow-[0_0_18px_rgba(139,92,246,0.20),0_0_38px_rgba(124,58,237,0.10),inset_0_0_18px_rgba(139,92,246,0.035)]"}`}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent ${eventType === "LoH" ? "via-rose-400/70" : "via-violet-400/70"}`} />

      <div className="mb-5 flex items-end justify-between">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-[44px] leading-none ${eventType === "LoH" ? "text-rose-300 drop-shadow-[0_0_5px_rgba(244,63,94,0.4)]" : "text-violet-300 drop-shadow-[0_0_5px_rgba(167,139,250,0.4)]"}`}>
            ♞
          </div>

          <div>
            <div className="text-xl font-black text-white">
              Umamusume Team Lineup
            </div>

            <div className={`mt-1 text-xs font-medium ${eventType === "LoH" ? "text-rose-200/45" : "text-violet-200/45"}`}>
              Optional — you can add your Umas later.
            </div>
          </div>
        </div>

        <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${eventType === "LoH" ? "text-rose-300/60" : "text-violet-300/60"}`}>
          {
            umas.filter(
              (uma) => uma.id !== ""
            ).length
          }{" "}
          / 3 Selected
        </div>
      </div>

      <div className="space-y-4">
        {umas.map((uma, index) => (
          <UmaForm
            key={index}
            number={index + 1}
            value={uma}
            selectedUmas={umas}
            onChange={(updatedUma) => {
              setUmas((current) =>
                current.map((item, i) =>
                  i === index
                    ? updatedUma
                    : item
                )
              )
            }}
          />
        ))}
      </div>
    </section>
  )
}

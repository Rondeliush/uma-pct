import type { CMParticipantConfiguration, UmaVersion } from "../types/types"
import UmaAvatarImage from "../components/UmaAvatarImage"
import ParticipantConfigurationBadges from "./ParticipantConfigurationBadges"
import CMParticipantName from "./CMParticipantName"
import { getRunningStyleVisual } from "./runningStyleVisuals"

export default function CMLogParticipantCell({ configuration, version, resultText, winner = false, final = false }: {
  configuration: CMParticipantConfiguration
  version?: UmaVersion
  resultText: string
  winner?: boolean
  final?: boolean
}) {
  const name = version?.displayName ?? "Unavailable Uma"
  return (
    <div className={`cm-log-participant flex min-w-0 flex-col items-center justify-center gap-1 px-2 py-2 md:flex-row md:justify-start md:gap-2.5 md:px-3 ${final ? "relative" : ""} ${winner ? "bg-amber-300/[0.035]" : ""}`}
      style={getRunningStyleVisual(configuration.runningStyle).style}
      data-running-style={configuration.runningStyle ?? "unknown"}
      data-version-id={configuration.umaVersionId ?? ""} role="group" aria-label={`${name}, ${resultText}`}>
      <div className={`cm-log-participant-avatar relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/20 md:h-10 md:w-10 ${winner ? " ring-1 ring-amber-300/60" : ""}`} title={name}>
        {version?.avatar ? <UmaAvatarImage avatar={version.avatar} alt={name} className="h-full w-full object-contain" />
          : <span className="font-bold text-blue-100/20" aria-label={name}>?</span>}
      </div>
      <div className="cm-log-participant-info min-w-0 max-w-full w-full">
        <div className="flex min-w-0 items-center justify-center gap-1.5 md:justify-start">
          <CMParticipantName name={name} className="cm-log-participant-name min-w-0 truncate text-sm font-bold text-white/90" />
          <ParticipantConfigurationBadges configuration={configuration} compact showRoles={false} showAutoRun={false} />
          {final && winner && <svg viewBox="0 0 32 24"
            className="hidden h-3.5 w-4.5 shrink-0 text-yellow-300 drop-shadow-[0_0_4px_rgba(250,204,21,0.55)] md:block"
            fill="currentColor" aria-hidden="true">
            <path d="M4 19h24l2-12-7 5-7-9-7 9-7-5 2 12Zm2 2h20v2H6v-2Z" />
          </svg>}
        </div>
        <div className={`cm-log-participant-result ${final
          ? `mt-0.5 text-center text-xs font-medium md:text-left ${winner ? "text-amber-200/65" : "text-blue-100/35"}`
          : "text-center text-xs font-medium text-blue-100/50 md:mt-0.5 md:text-left md:text-blue-100/40"}`}>
          <span className="cm-log-participant-result-text">{resultText}</span>
          <span className="ml-1 inline-flex max-w-full flex-wrap items-center justify-center gap-0.5 align-middle md:justify-start md:gap-1">
            <ParticipantConfigurationBadges configuration={configuration} compact showRunningStyle={false} />
          </span>
        </div>
      </div>
    </div>
  )
}

import { Fragment } from "react"
import type { HTMLAttributes, ReactElement, ReactNode } from "react"
import type { CMParticipantConfiguration } from "../types/types"
import { getRunningStyleVisual } from "./runningStyleVisuals"
import "./ParticipantConfiguration.css"

type ParticipantConfigurationBadgesProps = {
  configuration: CMParticipantConfiguration
  compact?: boolean
  showRunningStyle?: boolean
  showRoles?: boolean
  abbreviateRoles?: boolean
  showAutoRun?: boolean
  autoRunLabel?: string
  showUnknownStyle?: boolean
  provenanceTitle?: string
  renderBadge?: (badge: ReactElement<HTMLAttributes<HTMLSpanElement>>) => ReactNode
}

export default function ParticipantConfigurationBadges({
  configuration, compact = false, showRunningStyle = true, showRoles = true, abbreviateRoles = compact,
  showAutoRun = true, autoRunLabel, showUnknownStyle = !compact, provenanceTitle, renderBadge,
}: ParticipantConfigurationBadgesProps) {
  const visual = getRunningStyleVisual(configuration.runningStyle)
  const badges = [
    ...(showRunningStyle && (configuration.runningStyle !== null || showUnknownStyle) ? [{
      label: configuration.runningStyle === null ? visual.label : compact ? visual.abbreviation : visual.label,
      meaning: visual.label, tone: "style",
    }] : []),
    ...(showRoles && configuration.ace === true ? [{ label: "ACE", meaning: "Ace", tone: "ace" }] : []),
    ...(showRoles && configuration.debuffer === true ? [{ label: abbreviateRoles ? "DB" : "DEBUFFER", meaning: "Debuffer", tone: "debuffer" }] : []),
    ...(showAutoRun && configuration.entrySource === "autorun" ? [{ label: autoRunLabel ?? (abbreviateRoles ? "AUTO" : "AutoRun"), meaning: "AutoRun", tone: "autorun" }] : []),
  ]
  if (badges.length === 0) return null
  const provenance = provenanceTitle ?? (configuration.configurationSource === "legacy_inferred"
    ? "Configuration inferred from the saved historical participant." : undefined)
  return (
    <span className={`participant-configuration-badges${compact ? " participant-configuration-badges--compact" : ""}`}
      style={visual.style} role="group" aria-label="Participant configuration" title={provenance}>
      {badges.map((badge) => {
        const element = <span key={badge.tone}
          className={`participant-configuration-badge participant-configuration-badge--${badge.tone}`}
          data-configuration-badge={badge.tone} title={badge.meaning} aria-label={badge.meaning}>
          {badge.label}
        </span>
        return renderBadge ? <Fragment key={badge.tone}>{renderBadge(element)}</Fragment> : element
      })}
    </span>
  )
}

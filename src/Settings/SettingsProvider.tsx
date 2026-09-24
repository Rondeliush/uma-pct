import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

export type TimeFormat =
  | "system"
  | "24h"
  | "12h"

type SettingsContextValue = {
  autoRunNotifications: boolean
  setAutoRunNotifications: (
    value: boolean
  ) => void

  useTrainingStamina: boolean
  setUseTrainingStamina: (
    value: boolean
  ) => void

  timeFormat: TimeFormat
  setTimeFormat: (
    value: TimeFormat
  ) => void
}

const SettingsContext =
  createContext<
    SettingsContextValue | undefined
  >(undefined)

type SettingsProviderProps = {
  children: ReactNode
}

export function SettingsProvider({
  children,
}: SettingsProviderProps) {
  const [
    timeFormat,
    setTimeFormatState,
  ] = useState<TimeFormat>(() => {
    const saved =
      localStorage.getItem(
        "uma-tracker-time-format"
      )

    if (
      saved === "24h" ||
      saved === "12h"
    ) {
      return saved
    }

    return "system"
  })

  const [
    autoRunNotifications,
    setAutoRunNotificationsState,
  ] = useState(() => {
    const saved =
      localStorage.getItem(
        "uma-tracker-autorun-notifications"
      )

    return saved === null
      ? true
      : saved === "true"
  })

  const [
    useTrainingStamina,
    setUseTrainingStaminaState,
  ] = useState(() => {
    const saved =
      localStorage.getItem(
        "uma-tracker-use-training-stamina"
      )

    return saved === null
      ? false
      : saved === "true"
  })

  useEffect(() => {
    localStorage.setItem(
      "uma-tracker-time-format",
      timeFormat
    )
  }, [timeFormat])

  useEffect(() => {
    localStorage.setItem(
      "uma-tracker-autorun-notifications",
      String(autoRunNotifications)
    )
  }, [autoRunNotifications])

  useEffect(() => {
    localStorage.setItem(
      "uma-tracker-use-training-stamina",
      String(useTrainingStamina)
    )
  }, [useTrainingStamina])

  const setAutoRunNotifications = (
    value: boolean
  ) => {
    setAutoRunNotificationsState(value)
  }

  const setUseTrainingStamina = (
    value: boolean
  ) => {
    setUseTrainingStaminaState(value)
  }

  const setTimeFormat = (
    value: TimeFormat
  ) => {
    setTimeFormatState(value)
  }

  return (
    <SettingsContext.Provider
      value={{
        autoRunNotifications,
        setAutoRunNotifications,
        timeFormat,
        setTimeFormat,
        useTrainingStamina,
        setUseTrainingStamina,
      }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context =
    useContext(SettingsContext)

  if (!context) {
    throw new Error(
      "useSettings must be used inside SettingsProvider"
    )
  }

  return context
}
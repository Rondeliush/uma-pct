import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import {
  clearAutoRunTimer,
  loadAutoRunTimer,
  saveAutoRunTimer,
  loadAutoRunStamina,
  saveAutoRunStamina,
  type AutoRunStaminaState,
} from "../profiles/activeProfileStore"

import { useSettings } from "../Settings/SettingsProvider"

/*const AUTO_RUN_DURATION_MS =
  10 * 1000*/

const AUTO_RUN_DURATION_MS =
  50 * 60 * 1000

async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    return false
  }

  if (Notification.permission === "granted") {
    return true
  }

  if (Notification.permission === "denied") {
    return false
  }

  try {
    const permission =
      await Notification.requestPermission()

    return permission === "granted"
  } catch (error) {
    console.error(
      "Could not request browser notification permission:",
      error
    )

    return false
  }
}

function showBrowserNotification(
  title: string,
  body: string
) {
  if (!("Notification" in window)) {
    return
  }

  if (Notification.permission !== "granted") {
    return
  }

  try {
    new Notification(title, {
      body,
    })
  } catch (error) {
    console.error(
      "Could not show browser notification:",
      error
    )
  }
}

type AutoRunTimerContextValue = {
  isTimerLoaded: boolean

  isStaminaLoaded: boolean
  staminaState: AutoRunStaminaState | null

  currentStamina: number | null
  effectiveStaminaCost: number | null
  staminaFullAt: number | null
  staminaTimeToFullSeconds: number
  staminaNextPointSeconds: number

  setCurrentStamina: (
  stamina: number
) => void

  setHalfStaminaCostEvent: (
    enabled: boolean
  ) => void

  setDoubleStaminaCostEvent: (
    enabled: boolean
  ) => void


  
  remainingSeconds: number
  timeText: string

  isActive: boolean
  isComplete: boolean

  alarmVolume: number
  setAlarmVolume: (
    volume: number
  ) => void

  startTimer: () => void
  cancelTimer: () => void
  runTimerTest: () => void
  testAlarmSound: () => void
}

const AutoRunTimerContext =
  createContext<
    AutoRunTimerContextValue | undefined
  >(undefined)

type AutoRunTimerProviderProps = {
  profileId: string
  children: ReactNode
}

export function AutoRunTimerProvider({
  profileId,
  children,
}: AutoRunTimerProviderProps) {
  const [
    endsAt,
    setEndsAt,
  ] = useState<number | null>(null)
  
  const {
  autoRunNotifications,
  useTrainingStamina,
} = useSettings()

  const [
    now,
    setNow,
  ] = useState(Date.now())

  const [
  isTimerLoaded,
  setIsTimerLoaded,
] = useState(false)

  const [
  isStaminaLoaded,
  setIsStaminaLoaded,
] = useState(false)

  const [
    staminaState,
    setStaminaState,
  ] = useState<AutoRunStaminaState | null>(
    null
  )

  const audioRef =
    useRef<HTMLAudioElement | null>(
      null
    )

  const alarmPlayedRef =
    useRef(false)

  const [
    alarmVolume,
    setAlarmVolume,
  ] = useState(() => {
    const savedVolume =
      localStorage.getItem(
        "uma-tracker-alarm-volume"
      )

    const parsedVolume =
      savedVolume === null
        ? 0.2
        : Number(savedVolume)

    return Number.isFinite(
      parsedVolume
    )
      ? Math.min(
          1,
          Math.max(
            0,
            parsedVolume
          )
        )
      : 0.2
  })

  // LOAD SAVED TIMER
  useEffect(() => {
    let cancelled = false

    const loadTimer = async () => {
      setIsTimerLoaded(false)

      const savedTimer =
        await loadAutoRunTimer(
          profileId
        )

      if (cancelled) {
        return
      }

      const currentTime =
        Date.now()

      setNow(currentTime)

      if (savedTimer) {
        setEndsAt(
          savedTimer.endsAt
        )

        // Jeśli timer skończył się,
        // zanim provider został uruchomiony,
        // nie odtwarzamy starego alarmu.
        alarmPlayedRef.current =
          savedTimer.endsAt <=
          currentTime
      } else {
        setEndsAt(null)

        alarmPlayedRef.current =
          false
      }

      setIsTimerLoaded(true)
    }

    void loadTimer()

    return () => {
      cancelled = true
    }
  }, [profileId])


  // LOAD SAVED STAMINA
useEffect(() => {
  let cancelled = false

  const loadStamina = async () => {
    setIsStaminaLoaded(false)

    const savedStamina =
      await loadAutoRunStamina(
        profileId
      )

    if (cancelled) {
      return
    }

    const initialStaminaState: AutoRunStaminaState =
  savedStamina ?? {
    currentStamina: 100,
    maxStamina: 100,
    updatedAt: Date.now(),

    regenMinutesPerStamina: 10,
    baseAutoRunCost: 30,

    halfStaminaCostEvent: false,
    doubleStaminaCostEvent: false,
  }

setStaminaState(
  initialStaminaState
)

setIsStaminaLoaded(true)
  }

  void loadStamina()

  return () => {
    cancelled = true
  }
}, [profileId])

useEffect(() => {
  if (
    !isStaminaLoaded ||
    staminaState === null
  ) {
    return
  }

  void saveAutoRunStamina(
    profileId,
    staminaState
  )
}, [
  isStaminaLoaded,
  staminaState,
  profileId,
])

  // TIMER TICK
  useEffect(() => {
    if (endsAt === null) {
      return
    }

    const intervalId =
      window.setInterval(() => {
        const currentTime =
          Date.now()

        setNow(currentTime)

        if (
          currentTime >= endsAt
        ) {
          window.clearInterval(
            intervalId
          )
        }
      }, 1000)

    return () => {
      window.clearInterval(
        intervalId
      )
    }
  }, [endsAt])

  // AUDIO
  useEffect(() => {
    const audio = new Audio(
      `${import.meta.env.BASE_URL}alarmtimer.mp3`
    )

    audio.volume =
      alarmVolume *
      alarmVolume

    audioRef.current = audio

    return () => {
      audio.pause()

      audioRef.current = null
    }
  }, [])

  // VOLUME
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume =
        alarmVolume *
        alarmVolume
    }

    localStorage.setItem(
      "uma-tracker-alarm-volume",
      String(alarmVolume)
    )
  }, [alarmVolume])

  const remainingSeconds =
    endsAt === null
      ? Math.ceil(
          AUTO_RUN_DURATION_MS /
            1000
        )
      : Math.max(
          0,
          Math.ceil(
            (endsAt - now) /
              1000
          )
        )

  const minutes =
    Math.floor(
      remainingSeconds / 60
    )

  const seconds =
    remainingSeconds % 60

  const timeText =
    `${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(
      2,
      "0"
    )}`

  const isActive =
    endsAt !== null &&
    remainingSeconds > 0

  const isComplete =
    endsAt !== null &&
    remainingSeconds === 0

  const currentStamina =
  staminaState === null
    ? null
    : Math.min(
        staminaState.maxStamina,
        staminaState.currentStamina +
          Math.floor(
            Math.max(
              0,
              now -
                staminaState.updatedAt
            ) /
              (
                staminaState
                  .regenMinutesPerStamina *
                60 *
                1000
              )
          )
      )

useEffect(() => {
  if (
    staminaState === null ||
    currentStamina === null ||
    currentStamina >=
      staminaState.maxStamina ||
    isActive
  ) {
    return
  }

  const intervalId =
    window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

  return () => {
    window.clearInterval(
      intervalId
    )
  }
}, [
  staminaState,
  currentStamina,
  isActive,
])

const staminaCostMultiplier =
  staminaState === null
    ? 1
    : (staminaState
          .halfStaminaCostEvent
        ? 0.5
        : 1) *
      (staminaState
          .doubleStaminaCostEvent
        ? 2
        : 1)

const effectiveStaminaCost =
  staminaState === null
    ? null
    : staminaState.baseAutoRunCost *
      staminaCostMultiplier

const staminaRegenMs =
  staminaState === null
    ? null
    : staminaState.regenMinutesPerStamina *
      60 *
      1000

const staminaFullAt =
  staminaState === null ||
  staminaRegenMs === null ||
  currentStamina === null ||
  currentStamina >= staminaState.maxStamina
    ? null
    : staminaState.updatedAt +
      (
        staminaState.maxStamina -
        staminaState.currentStamina
      ) *
        staminaRegenMs

const staminaTimeToFullSeconds =
  staminaFullAt === null
    ? 0
    : Math.max(
        0,
        Math.ceil(
          (staminaFullAt - now) /
            1000
        )
      )
const staminaNextPointSeconds =
  staminaState === null ||
  staminaRegenMs === null ||
  currentStamina === null ||
  currentStamina >=
    staminaState.maxStamina
    ? 0
    : Math.ceil(
        (
          staminaRegenMs -
          (
            Math.max(
              0,
              now -
                staminaState.updatedAt
            ) %
            staminaRegenMs
          )
        ) /
          1000
      )

const setCurrentStamina = (
  stamina: number
) => {
  setStaminaState((current) => {
    if (current === null) {
      return current
    }

    const normalizedStamina =
      Math.min(
        current.maxStamina,
        Math.max(
          0,
          stamina
        )
      )

    return {
      ...current,
      currentStamina:
        normalizedStamina,
      updatedAt: Date.now(),
    }
  })

  setNow(Date.now())
}

const setHalfStaminaCostEvent = (
  enabled: boolean
) => {
  setStaminaState((current) => {
    if (current === null) {
      return current
    }

    return {
      ...current,
      halfStaminaCostEvent:
        enabled,
    }
  })
}

const setDoubleStaminaCostEvent = (
  enabled: boolean
) => {
  setStaminaState((current) => {
    if (current === null) {
      return current
    }

    return {
      ...current,
      doubleStaminaCostEvent:
        enabled,
    }
  })
}

  // ALARM
useEffect(() => {
  if (
    !isTimerLoaded ||
    !isComplete ||
    alarmPlayedRef.current
  ) {
    return
  }

  alarmPlayedRef.current =
    true

  const audio =
    audioRef.current

  if (audio) {
    audio.currentTime = 0

    void audio
      .play()
      .catch((error) => {
        console.error(
          "Could not play alarm sound:",
          error
        )
      })
  }
if (autoRunNotifications) {
  showBrowserNotification(
    "AutoRun Complete!",
    "Your AutoRun training should be finished."
  )
}
}, [
  isComplete,
  isTimerLoaded,
  autoRunNotifications,
])
  const startTimer = () => {
    if (autoRunNotifications) {
    void requestBrowserNotificationPermission()
    }

  if (
    useTrainingStamina &&
    (
      staminaState === null ||
      currentStamina === null ||
      effectiveStaminaCost === null
    )
  ) {
    return
  }

  if (
    useTrainingStamina &&
    currentStamina !== null &&
    effectiveStaminaCost !== null &&
    currentStamina <
      effectiveStaminaCost
  ) {
    return
  }

  alarmPlayedRef.current =
    false

  if (audioRef.current) {
    audioRef.current.pause()
    audioRef.current.currentTime =
      0
  }

  const currentTime =
    Date.now()

  if (
    useTrainingStamina &&
    effectiveStaminaCost !== null
  ) {
    setStaminaState((current) => {
      if (current === null) {
        return current
      }

      const regenMs =
        current.regenMinutesPerStamina *
        60 *
        1000

      const elapsed =
        Math.max(
          0,
          currentTime -
            current.updatedAt
        )

      const regenerated =
        Math.floor(
          elapsed / regenMs
        )

      const actualStamina =
        Math.min(
          current.maxStamina,
          current.currentStamina +
            regenerated
        )

      const remainingRegenMs =
        actualStamina >=
        current.maxStamina
          ? 0
          : elapsed % regenMs

      return {
        ...current,
        currentStamina:
          actualStamina -
          effectiveStaminaCost,
        updatedAt:
          currentTime -
          remainingRegenMs,
      }
    })
  }

  const newEndsAt =
    currentTime +
    AUTO_RUN_DURATION_MS

  setNow(currentTime)
  setEndsAt(newEndsAt)

  void saveAutoRunTimer(
    profileId,
    {
      endsAt: newEndsAt,
    }
  )
}

  const testAlarmSound = () => {
  const audio = audioRef.current

  if (!audio) {
    return
  }

  audio.pause()
  audio.currentTime = 0

  void audio
    .play()
    .catch((error) => {
      console.error(
        "Could not play test alarm sound:",
        error
      )
    })
}
const runTimerTest = async () => {
  let notificationsAllowed = false

  if (autoRunNotifications) {
    notificationsAllowed =
      await requestBrowserNotificationPermission()
  }

  window.setTimeout(() => {
    const audio = audioRef.current

    if (audio) {
      audio.currentTime = 0

      void audio
        .play()
        .catch((error) => {
          console.error(
            "Could not play test alarm sound:",
            error
          )
        })
    }

    if (notificationsAllowed) {
      showBrowserNotification(
        "AutoRun Timer Test",
        "Alarm and notifications are working."
      )
    }
  }, 3000)
}


const cancelTimer =
  useCallback(() => {
    setEndsAt(null)
    setNow(Date.now())

    alarmPlayedRef.current =
      false

    if (audioRef.current) {
      audioRef.current.pause()

      audioRef.current.currentTime =
        0
    }

    void clearAutoRunTimer(
      profileId
    )
  }, [profileId])


  return (
    <AutoRunTimerContext.Provider
      value={{
        isTimerLoaded,

        isStaminaLoaded,
        staminaState,

        currentStamina,
        effectiveStaminaCost,
        setCurrentStamina,
        setHalfStaminaCostEvent,
        setDoubleStaminaCostEvent,
        staminaFullAt,
        staminaTimeToFullSeconds,
        staminaNextPointSeconds,

        remainingSeconds,
        timeText,

        isActive,
        isComplete,

        alarmVolume,
        setAlarmVolume,

        startTimer,
        cancelTimer,
        runTimerTest,
        testAlarmSound,
      }}
    >
      {children}
    </AutoRunTimerContext.Provider>
  )
}



export function useAutoRunTimer() {
  const context =
    useContext(
      AutoRunTimerContext
    )

  if (!context) {
    throw new Error(
      "useAutoRunTimer must be used inside AutoRunTimerProvider"
    )
  }

  return context
}
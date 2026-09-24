import { useAutoRunTimer } from "./AutoRunTimerProvider"
import { useSettings } from "../Settings/SettingsProvider"

type AutoRunTimerPageProps = {
  onOpenSettings: () => void
}

function AutoRunTimerPage({
  onOpenSettings,
}: AutoRunTimerPageProps) {
  const {
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

    timeText,
    isActive,
    isComplete,
    startTimer,
    cancelTimer,
  } = useAutoRunTimer()

  const {
  timeFormat,
  useTrainingStamina,
} = useSettings()



  const staminaHours =
    Math.floor(
      staminaTimeToFullSeconds / 3600
    )

  const staminaMinutes =
    Math.floor(
      (
        staminaTimeToFullSeconds %
        3600
      ) / 60
    )

  const staminaFullSeconds =
    staminaTimeToFullSeconds % 60

  const staminaTimeToFullText =
    staminaTimeToFullSeconds === 0
      ? "Full"
      : staminaHours > 0
        ? `${staminaHours}h ${staminaMinutes}m ${staminaFullSeconds}s`
        : staminaMinutes > 0
          ? `${staminaMinutes}m ${staminaFullSeconds}s`
          : `${staminaFullSeconds}s`

const staminaFullAtText =
  staminaFullAt === null
    ? "Full"
    : new Date(
        staminaFullAt
      ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12:
          timeFormat === "system"
            ? undefined
            : timeFormat === "12h",
      })


  if (
  !isTimerLoaded ||
  (
    useTrainingStamina &&
    (
      !isStaminaLoaded ||
      staminaState === null ||
      currentStamina === null ||
      effectiveStaminaCost === null
    )
  )
) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm font-bold text-blue-100/30">
        Loading timer...
      </div>
    )
  }

const hasEnoughStamina =
  !useTrainingStamina ||
  (
    currentStamina !== null &&
    effectiveStaminaCost !== null &&
    currentStamina >=
      effectiveStaminaCost
  )

const staminaNextMinutes =
  Math.floor(
    staminaNextPointSeconds / 60
  )

const staminaNextSeconds =
  staminaNextPointSeconds % 60

const staminaNextPointText =
  staminaNextPointSeconds === 0
    ? "Full"
    : `${String(
        staminaNextMinutes
      ).padStart(
        2,
        "0"
      )}:${String(
        staminaNextSeconds
      ).padStart(
        2,
        "0"
      )}`
const energyNeededForTraining =
  useTrainingStamina &&
  effectiveStaminaCost !== null &&
  currentStamina !== null
    ? Math.max(
        0,
        Math.ceil(
          effectiveStaminaCost -
            currentStamina
        )
      )
    : 0

const secondsUntilEnoughEnergy =
  energyNeededForTraining === 0 ||
  staminaState === null
    ? 0
    : staminaNextPointSeconds +
      (
        energyNeededForTraining - 1
      ) *
        staminaState
          .regenMinutesPerStamina *
        60

const enoughEnergyHours =
  Math.floor(
    secondsUntilEnoughEnergy / 3600
  )

const enoughEnergyMinutes =
  Math.floor(
    (
      secondsUntilEnoughEnergy %
      3600
    ) / 60
  )

const enoughEnergySeconds =
  secondsUntilEnoughEnergy % 60

const enoughEnergyText =
  energyNeededForTraining === 0
    ? "Enough Energy to Train"
    : enoughEnergyHours > 0
      ? `${enoughEnergyHours}h ${enoughEnergyMinutes}m ${enoughEnergySeconds}s until Enough Energy`
      : enoughEnergyMinutes > 0
        ? `${enoughEnergyMinutes}m ${enoughEnergySeconds}s until Enough Energy`
        : `${enoughEnergySeconds}s until Enough Energy`



  return (
    <div className="space-y-6">

      <section className="mx-auto max-w-2xl">

        {/* PAGE HEADER */}
        <div className="mb-5 text-center">
          <h1 className="text-3xl font-black text-white">
            AutoRun Timer
          </h1>

          <p className="mt-2 text-gray-400">
            Keep track of your Auto Run training.
          </p>
        </div>

        {/* TIMER CARD */}
        <div
          data-guide="autorun-timer"
          className="relative overflow-hidden rounded-3xl border border-sky-300/20 bg-[#07111f]/95 px-8 py-10 text-center shadow-2xl"
        >

          <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-96 -translate-x-1/2 rounded-full bg-sky-500/[0.08] blur-3xl" />

          <div className="relative">

            {/* STATUS */}
            <div
              className={`mt-3 text-sm font-black uppercase tracking-[0.16em] ${
                isComplete
                  ? "text-emerald-300"
                  : isActive
                    ? "text-sky-300"
                    : "text-blue-100/35"
              }`}
            >
              {isComplete
                ? "Training Complete!"
                : isActive
                  ? "Training in Progress"
                  : "Ready"}
            </div>

            {/* TIME */}
            <div
              className={`mt-5 font-mono text-8xl font-black tracking-tight ${
                isComplete
                  ? "text-emerald-300"
                  : isActive
                    ? "text-white"
                    : "text-blue-100/80"
              }`}
            >
              {timeText}
            </div>

            <div className="mt-3 text-xs font-medium text-blue-100/30">
              {isComplete
                ? "Your Auto Run should be finished."
                : isActive
                  ? "Time remaining"
                  : "Auto Run training timer"}
            </div>

                  {/* AUTORUN SETTINGS */}
                <div className="mt-6 text-xs text-blue-100/35">
                  Alarm volume and notifications can be configured in{" "}
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="font-black text-sky-300/70 transition hover:text-sky-200"
                  >
                    Settings
                  </button>
                  .
                </div>

            {/* BUTTONS */}
            <div className="mt-8 flex justify-center gap-3">

              {!isActive && (
                <button
                  type="button"
                  onClick={startTimer}
                  disabled={!hasEnoughStamina}
                  className={
                    hasEnoughStamina
                      ? "rounded-xl border border-sky-300/30 bg-sky-400/[0.12] px-6 py-3 text-sm font-black text-sky-100 transition hover:border-sky-300/50 hover:bg-sky-400/[0.18]"
                      : "cursor-not-allowed rounded-xl border border-white/[0.06] bg-white/[0.03] px-6 py-3 text-sm font-black text-blue-100/25"
                  }
                >
                  {!hasEnoughStamina
                    ? "Not Enough Stamina"
                    : isComplete
                      ? "Start Another"
                      : "Start Auto Run"}
                </button>
              )}

              {isActive && (
                <button
                  type="button"
                  onClick={cancelTimer}
                  className="rounded-xl border border-red-300/20 bg-red-400/[0.06] px-6 py-3 text-sm font-black text-red-200/80 transition hover:border-red-300/40 hover:bg-red-400/[0.10] hover:text-red-100"
                >
                  Cancel
                </button>
              )}

            </div>
          {/* STAMINA TRACKER */}
            {useTrainingStamina &&
            staminaState !== null &&
            currentStamina !== null &&
            effectiveStaminaCost !== null && (
<div className="mt-6 overflow-hidden rounded-3xl border border-violet-300/20 bg-[#07111f]/95 p-5 shadow-2xl">

  {/* HEADER */}
  <div className="flex items-center justify-between gap-4">
    <div>
      <h2 className="text-xl font-black text-white">
        Training Energy
      </h2>

      <p className="mt-1 text-xs text-blue-100/35">
        Track energy regeneration and Auto Run cost.
      </p>
    </div>

    <div className="text-2xl font-black text-violet-200">
      {currentStamina} / {staminaState.maxStamina}
    </div>
  </div>

  {/* STAMINA BAR */}
  <div className="mt-4">
    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className="h-full rounded-full bg-violet-400 transition-all"
        style={{
          width: `${
            (currentStamina /
              staminaState.maxStamina) *
            100
          }%`,
        }}
      />
    </div>

    <div className="mt-2 space-y-1 text-right text-xs font-bold">
  <div className="text-blue-100/35">
    {staminaTimeToFullText === "Full"
      ? "Energy Full"
      : `${staminaTimeToFullText} until full`}
  </div>

  <div
    className={
      energyNeededForTraining === 0
        ? "text-emerald-300/70"
        : "text-violet-200/60"
    }
  >
    {enoughEnergyText}
  </div>
</div>
  </div>

  {/* STAMINA CONTROLS */}
  <div className="mt-3 flex items-center justify-center gap-3">
    <button
      type="button"
      onClick={() =>
        setCurrentStamina(
          currentStamina - 1
        )
      }
      className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.04] text-lg font-black text-blue-100/70 transition hover:bg-white/[0.08] hover:text-white"
    >
      −
    </button>

    <input
    
      type="number"
      min={0}
      max={staminaState.maxStamina}
      value={currentStamina}
      onChange={(event) => {
        const value = Number(
          event.target.value
        )

        if (Number.isFinite(value)) {
          setCurrentStamina(value)
        }
      }}
      className="no-spinner h-9 w-20 rounded-xl border border-violet-300/20 bg-black/20 text-center font-black text-white outline-none transition focus:border-violet-300/50" ></input>

    <button
      type="button"
      onClick={() =>
        setCurrentStamina(
          currentStamina + 1
        )
      }
      className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.04] text-lg font-black text-blue-100/70 transition hover:bg-white/[0.08] hover:text-white"
    >
      +
    </button>
  </div>

  {/* STAMINA INFO */}
  <div className="mt-4 grid grid-cols-3 gap-3">

    <div className="rounded-2xl border border-violet-300/15 bg-violet-400/[0.05] p-3 text-center">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-violet-200/45">
        Cost
      </div>

      <div className="mt-1 text-lg font-black text-violet-200">
        {effectiveStaminaCost}
      </div>

      <div
        className={`mt-0.5 min-h-[15px] text-[10px] font-bold ${
          effectiveStaminaCost !==
          staminaState.baseAutoRunCost
            ? "text-blue-100/25"
            : "invisible"
        }`}
      >
        Base {staminaState.baseAutoRunCost}
      </div>
    </div>

    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-center">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-100/30">
        Next Energy
      </div>

      <div className="mt-1 font-mono text-lg font-black text-white">
        {staminaNextPointText}
      </div>
    </div>

    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-center">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-100/30">
        Full At
      </div>

      <div className="mt-1 font-mono text-lg font-black text-white">
        {staminaFullAtText}
      </div>
    </div>

  </div>

  {/* EVENTS */}
  <div className="mt-4 grid grid-cols-2 gap-3">

    <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3 py-3">
      <div>
        <div className="text-xs font-black text-blue-100/80">
          Half Cost Event
        </div>

        <div className="mt-0.5 text-[10px] text-blue-100/30">
          Cost ×0.5
        </div>
      </div>

      <input
        type="checkbox"
        checked={
          staminaState.halfStaminaCostEvent
        }
        onChange={(event) =>
          setHalfStaminaCostEvent(
            event.target.checked
          )
        }
        className="h-4 w-4 accent-violet-400"
      />
    </label>

    <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3 py-3">
      <div>
        <div className="text-xs font-black text-blue-100/80">
          Double Cost Event
        </div>

        <div className="mt-0.5 text-[10px] text-blue-100/30">
          Cost ×2
        </div>
      </div>

      <input
        type="checkbox"
        checked={
          staminaState.doubleStaminaCostEvent
        }
        onChange={(event) =>
          setDoubleStaminaCostEvent(
            event.target.checked
          )
        }
        className="h-4 w-4 accent-violet-400"
      />
    </label>

  </div>
</div> 
)}
          </div>
        </div>
      </section>

    </div>
  )
}

export default AutoRunTimerPage
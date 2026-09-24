import { useSettings } from "./SettingsProvider"
import AutoRunTest from "./AutoRunTest"
import { useAutoRunTimer } from "../AutoRun/AutoRunTimerProvider"


function SettingsPage() {
  const {
  autoRunNotifications,
  setAutoRunNotifications,
  timeFormat,
  setTimeFormat,
  useTrainingStamina,
  setUseTrainingStamina,
  
  
} = useSettings()


const {
  alarmVolume,
  setAlarmVolume,
  testAlarmSound,
} = useAutoRunTimer()

  return (
  <div className="mx-auto max-w-3xl space-y-5">
    {/* HEADER */}
    <div className="text-center">
      <h1 className="text-3xl font-black text-white">
        Settings
      </h1>

      <p className="mt-2 text-gray-400">
        Configure application behavior and notifications.
      </p>
    </div>

    {/* GENERAL */}
<section className="overflow-hidden rounded-3xl border border-sky-300/15 bg-[#07111f]/95 shadow-2xl">
  <div className="border-b border-white/[0.06] px-6 py-4">
    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300/50">
      General
    </div>
  </div>

  <div className="mx-6 h-px bg-white/[0.06]" />

  {/* TIME FORMAT */}
  <div className="flex items-center justify-between gap-6 px-6 py-5">
    <div>
      <div className="text-sm font-black text-white">
        Time format
      </div>

      <p className="mt-1 text-xs text-blue-100/40">
        Choose how times are displayed in the app.
      </p>
    </div>

    <div className="flex shrink-0 rounded-xl border border-white/[0.08] bg-black/20 p-1">
      <button
        type="button"
        onClick={() =>
          setTimeFormat("system")
        }
        className={`rounded-lg px-3 py-2 text-xs font-black transition ${
          timeFormat === "system"
            ? "bg-sky-400/15 text-sky-200"
            : "text-blue-100/35 hover:text-blue-100/70"
        }`}
      >
        System
      </button>

      <button
        type="button"
        onClick={() =>
          setTimeFormat("24h")
        }
        className={`rounded-lg px-3 py-2 text-xs font-black transition ${
          timeFormat === "24h"
            ? "bg-sky-400/15 text-sky-200"
            : "text-blue-100/35 hover:text-blue-100/70"
        }`}
      >
        24H
      </button>

      <button
        type="button"
        onClick={() =>
          setTimeFormat("12h")
        }
        className={`rounded-lg px-3 py-2 text-xs font-black transition ${
          timeFormat === "12h"
            ? "bg-sky-400/15 text-sky-200"
            : "text-blue-100/35 hover:text-blue-100/70"
        }`}
      >
        12H
      </button>
    </div>
  </div>
</section>

    {/* AUTORUN */}
    <section className="overflow-hidden rounded-3xl border border-sky-300/15 bg-[#07111f]/95 shadow-2xl">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300/50">
          AutoRun
        </div>
      </div>
          {/* TRAINING ENERGY */}
<div className="flex items-center justify-between gap-6 px-6 py-5">
  <div>
    <div className="text-sm font-black text-white">
      Use Training Energy
    </div>

    <p className="mt-1 text-xs text-blue-100/40">
      Track energy regeneration and require enough energy before starting Auto Run.
    </p>
  </div>

  <button
    type="button"
    role="switch"
    aria-checked={useTrainingStamina}
    onClick={() =>
      setUseTrainingStamina(
        !useTrainingStamina
      )
    }
    className={`relative h-7 w-12 shrink-0 rounded-full transition ${
      useTrainingStamina
        ? "bg-sky-400"
        : "bg-white/10"
    }`}
  >
    <span
      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
        useTrainingStamina
          ? "left-6"
          : "left-1"
      }`}
    />
  </button>
</div>

<div className="mx-6 h-px bg-white/[0.06]" />


      {/* NOTIFICATIONS */}
      <div className="flex items-center justify-between gap-6 px-6 py-5">
        <div>
          <div className="text-sm font-black text-white">
            System notifications
          </div>

          <p className="mt-1 text-xs text-blue-100/40">
            Show a browser notification when AutoRun training is complete.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={autoRunNotifications}
          onClick={() =>
            setAutoRunNotifications(
              !autoRunNotifications
            )
          }
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
            autoRunNotifications
              ? "bg-sky-400"
              : "bg-white/10"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
              autoRunNotifications
                ? "left-6"
                : "left-1"
            }`}
          />
        </button>
      </div>

      <div className="mx-6 h-px bg-white/[0.06]" />

      {/* ALARM */}
      <div className="px-6 py-5">
        <div className="text-sm font-black text-white">
          Alarm volume
        </div>

        <p className="mt-1 text-xs text-blue-100/40">
          Adjust the alarm volume used when Auto Run training is complete.
        </p>

        <div className="mt-4 flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={alarmVolume}
            onChange={(event) =>
              setAlarmVolume(
                Number(event.target.value)
              )
            }
            className="min-w-0 flex-1 cursor-pointer accent-sky-400"
          />

          <div className="w-10 text-right text-xs font-black text-sky-200/70">
            {Math.round(alarmVolume * 100)}%
          </div>

          <button
            type="button"
            onClick={testAlarmSound}
            className="shrink-0 rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-xs font-black text-sky-200 transition hover:bg-sky-400/20"
          >
            Test Sound
          </button>
        </div>
      </div>

      <div className="mx-6 h-px bg-white/[0.06]" />

      {/* TIMER TEST */}
      <div className="px-6 py-5">
        <AutoRunTest />
      </div>
    </section>

    {/* SUPPORT */}
    <section className="overflow-hidden rounded-3xl border border-sky-300/15 bg-[#07111f]/95 shadow-2xl">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300/50">
          Support
        </div>
      </div>

     

       {/* REPOSITORY */}
    <div className="flex items-center justify-between gap-6 px-6 py-5">
      <div>
        <div className="text-sm font-black text-white">
          UmaPCT Repository
        </div>

        <p className="mt-1 text-xs text-blue-100/40">
          View the public UmaPCT repository on GitHub.
        </p>
      </div>

      <a
        href="https://github.com/Rondeliush/uma-pct"
        target="_blank"
        rel="noreferrer"
        className="shrink-0 rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-xs font-black text-sky-200 transition hover:bg-sky-400/20"
      >
        Open Repository
      </a>
          </div>

<div className="mx-6 h-px bg-white/[0.06]" />       


      {/* FEEDBACK */}
      <div className="flex items-center justify-between gap-6 px-6 py-5">
        <div>
          <div className="text-sm font-black text-white">
            Feedback & Support
          </div>

          <p className="mt-1 text-xs text-blue-100/40">
            Report bugs through GitHub.
          </p>
        </div>

        <a
          href="https://github.com/Rondeliush/uma-pct/issues/new?template=bug_report.md"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-xs font-black text-sky-200 transition hover:bg-sky-400/20"
        >
          Report a bug
        </a>
      </div>
    </section>
  </div>
)
}

export default SettingsPage
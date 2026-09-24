import {
  useEffect,
  useState,
} from "react"

import { useAutoRunTimer } from "../AutoRun/AutoRunTimerProvider"

function AutoRunTest() {
  const { runTimerTest } =
    useAutoRunTimer()

  const [
    testSeconds,
    setTestSeconds,
  ] = useState<number | null>(null)

  useEffect(() => {
    if (testSeconds === null) {
      return
    }

    if (testSeconds === 0) {
      const finishTimer =
        window.setTimeout(() => {
          setTestSeconds(null)
        }, 5000)

      return () => {
        window.clearTimeout(
          finishTimer
        )
      }
    }

    const timer =
      window.setTimeout(() => {
        setTestSeconds(
          (current) =>
            current === null
              ? null
              : current - 1
        )
      }, 1000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [testSeconds])

  const handleRunTest = () => {
    if (testSeconds !== null) {
      return
    }

    setTestSeconds(3)
    runTimerTest()
  }

  const isRunning =
    testSeconds !== null &&
    testSeconds > 0

  const isComplete =
    testSeconds === 0

  return (
  <div>
      <div className="flex items-center justify-between gap-6">
        <div>
          <div className="text-sm font-black text-white">
            Test AutoRun Timer
          </div>

          <p className="mt-1 max-w-xl text-xs leading-5 text-blue-100/45">
            Run a 3-second test to check the
            AutoRun alarm and system notification.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunTest}
          disabled={testSeconds !== null}
          className="shrink-0 rounded-lg border border-sky-300/25 bg-sky-400/[0.08] px-4 py-2 text-xs font-black text-sky-200 transition hover:border-sky-300/45 hover:bg-sky-400/[0.14] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isRunning
            ? `Testing... ${testSeconds}s`
            : isComplete
              ? "Test Complete"
              : "Run Test"}
        </button>
      </div>
    </div>
  )
}

export default AutoRunTest
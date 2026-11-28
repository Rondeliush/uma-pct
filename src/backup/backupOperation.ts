export const BACKUP_TIMEOUT_MS = 30_000

const steps = new WeakMap<AbortSignal, string>()

/** Bound the caller's wait without allowing a timed-out task to start more I/O. */
export function withBackupDeadline<T>(task: (signal: AbortSignal) => Promise<T>, timeoutMs = BACKUP_TIMEOUT_MS, parent?: AbortSignal): Promise<T> {
  const controller = new AbortController()
  const cancel = () => controller.abort(parent?.reason)
  if (parent?.aborted) cancel()
  else parent?.addEventListener("abort", cancel, { once: true })
  const timer = setTimeout(() => controller.abort(new DOMException(
    `File backup timed out while ${steps.get(controller.signal) ?? "saving"}. Your profile is still saved on this device. Try again.`,
    "TimeoutError",
  )), timeoutMs)
  return backupStep(controller.signal, "starting the backup", () => task(controller.signal)).finally(() => {
    clearTimeout(timer)
    parent?.removeEventListener("abort", cancel)
  })
}

export function markBackupStep(signal: AbortSignal | undefined, step: string) {
  signal?.throwIfAborted()
  if (signal) steps.set(signal, step)
}

/** Consume late resolutions/rejections too; cancellation never leaves an unhandled rejection. */
export function backupStep<T>(signal: AbortSignal | undefined, step: string, task: () => Promise<T>): Promise<T> {
  try { markBackupStep(signal, step) } catch (error) { return Promise.reject(error) }
  if (!signal) return task()
  return new Promise<T>((resolve, reject) => {
    const cancel = () => { signal.removeEventListener("abort", cancel); reject(signal.reason) }
    signal.addEventListener("abort", cancel, { once: true })
    try {
      task().then(value => {
        signal.removeEventListener("abort", cancel)
        if (signal.aborted) reject(signal.reason)
        else resolve(value)
      }, error => { signal.removeEventListener("abort", cancel); reject(error) })
    } catch (error) { signal.removeEventListener("abort", cancel); reject(error) }
  })
}

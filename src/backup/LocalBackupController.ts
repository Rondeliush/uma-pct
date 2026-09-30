import type { Profile } from "../profiles/profileStore"
import { isImportedProfileFile, type ImportedProfileFile } from "../profiles/profileTransfer"

export type BackupFile = {
  name: string
  queryPermission(options: { mode: "readwrite" }): Promise<PermissionState>
  requestPermission(options: { mode: "readwrite" }): Promise<PermissionState>
  getFile(): Promise<{ text(): Promise<string> }>
  createWritable(): Promise<{
    write(data: string): Promise<void>
    close(): Promise<void>
    abort(): Promise<void>
  }>
}
export type BackupConfig = { id: string; handle: BackupFile; lastSavedAt: string | null }
type Phase = "off" | "loading" | "ready" | "pending" | "saving" | "permission" | "error"
export type BackupState = {
  profileId: string | null
  profileName: string
  fileName: string
  phase: Phase
  lastSavedAt: string | null
  error: string
  configured: boolean
}
type Dependencies = {
  readConfig(id: string): Promise<BackupConfig | undefined>
  writeConfig(id: string, value: BackupConfig | undefined): Promise<void>
  readBackup(id: string): Promise<ImportedProfileFile>
  pickFile(name: string): Promise<BackupFile>
  withLock(task: () => Promise<void>): Promise<void>
  delay?: number
}

export class LocalBackupController {
  private deps: Dependencies
  private profile: Profile | null = null
  private config: BackupConfig | undefined
  private generation = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  private queue: Promise<void> = Promise.resolve()
  private listeners = new Set<() => void>()
  private state: BackupState = {
    profileId: null, profileName: "", fileName: "", phase: "off",
    lastSavedAt: null, error: "", configured: false,
  }

  constructor(deps: Dependencies) { this.deps = deps }
  getSnapshot = () => this.state
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  private update(value: Partial<BackupState>) {
    this.state = { ...this.state, ...value }
    this.listeners.forEach((listener) => listener())
  }
  private cancelTimer() { clearTimeout(this.timer); this.timer = undefined }
  private fail(error: unknown) {
    const permission = error instanceof Error && error.name === "NotAllowedError"
    this.update({ phase: permission ? "permission" : "error", error: error instanceof Error ? error.message : "Could not save the backup file." })
  }

  async setProfile(profile: Profile | null) {
    const generation = ++this.generation
    this.cancelTimer()
    this.profile = profile
    this.config = undefined
    this.update({ profileId: profile?.id ?? null, profileName: profile?.name ?? "", fileName: "", lastSavedAt: null, error: "", configured: false, phase: profile ? "loading" : "off" })
    if (!profile) return
    try {
      const config = await this.deps.readConfig(profile.id)
      if (generation !== this.generation) return
      this.config = config
      this.update({ configured: !!config, fileName: config?.handle.name ?? "", lastSavedAt: config?.lastSavedAt ?? null, phase: "off" })
      if (config) await this.saveNow()
    } catch (error) { if (generation === this.generation) this.fail(error) }
  }

  async selectFile() {
    if (!this.profile) return
    const profile = this.profile
    const generation = this.generation
    const name = Array.from(profile.name, (char) => char.charCodeAt(0) < 32 ? "_" : char)
      .join("").replace(/[<>:"/\\|?*]/g, "_").replace(/[. ]+$/g, "") || "profile"
    try {
      // The picker must run directly from the user's click, before any await.
      const handle = await this.deps.pickFile(`UmaPCT-${name}.json`)
      if (generation !== this.generation) return
      const existingText = await (await handle.getFile()).text()
      if (existingText.trim()) {
        let existing: unknown
        try { existing = JSON.parse(existingText) } catch { /* Reject unrelated files below. */ }
        if (!isImportedProfileFile(existing) || existing.profile.sourceProfileId !== (profile.sourceProfileId ?? profile.id)) {
          throw new Error("Choose a new file or a backup of this profile. This file belongs to different data and was not changed.")
        }
      }
      if (generation !== this.generation) return
      this.cancelTimer()
      await this.queue
      if (generation !== this.generation) return
      const config = { id: crypto.randomUUID(), handle, lastSavedAt: null }
      await this.deps.withLock(() => this.deps.writeConfig(profile.id, config))
      if (generation !== this.generation) return
      this.config = config
      this.update({ configured: true, fileName: handle.name, lastSavedAt: null, error: "" })
      await this.saveNow()
    } catch (error) {
      if (generation !== this.generation || (error instanceof Error && error.name === "AbortError")) return
      this.fail(error)
    }
  }

  async resume() {
    const generation = this.generation
    if (!this.config) return
    try {
      const permission = await this.config.handle.requestPermission({ mode: "readwrite" })
      if (generation !== this.generation) return
      if (permission !== "granted") {
        this.update({ phase: "permission", error: "File access was not granted. Browser data is still saved locally." })
        return
      }
      await this.saveNow()
    } catch (error) { if (generation === this.generation) this.fail(error) }
  }

  changed(key: string) {
    if (!this.profile || !this.config || (key !== "profiles" && key !== `profile:${this.profile.id}:data`)) return
    if (this.state.phase === "permission" || this.state.phase === "error") return
    if (!this.timer) {
      this.update({ phase: "pending" })
      // Bounded delay, even when updates arrive continuously.
      this.timer = setTimeout(() => { this.timer = undefined; void this.saveNow() }, this.deps.delay ?? 1500)
    }
  }

  saveNow(): Promise<void> {
    this.cancelTimer()
    const profile = this.profile
    const config = this.config
    const generation = this.generation
    if (!profile || !config) return Promise.resolve()
    this.queue = this.queue.then(() => this.deps.withLock(async () => {
      if (generation !== this.generation) return
      try {
        const currentConfig = await this.deps.readConfig(profile.id)
        if (generation !== this.generation) return
        if (currentConfig?.id !== config.id) {
          this.config = undefined
          this.update({ configured: false, phase: "error", error: "Backup settings changed in another tab. Reopen this profile to load them." })
          return
        }
        if (await config.handle.queryPermission({ mode: "readwrite" }) !== "granted") {
          if (generation === this.generation) this.update({ phase: "permission", error: "Allow access to resume automatic file backups." })
          return
        }
        if (generation !== this.generation) return
        this.update({ phase: "saving", error: "" })
        const backup = await this.deps.readBackup(profile.id)
        if (generation !== this.generation) return
        const json = JSON.stringify(backup, null, 2)
        const stream = await config.handle.createWritable()
        try {
          await stream.write(json)
          await stream.close()
        } catch (error) {
          try { await stream.abort() } catch { /* The original error explains the failure. */ }
          throw error
        }
        // Report success only after the file has been committed with close().
        const lastSavedAt = new Date().toISOString()
        await this.deps.writeConfig(profile.id, { ...config, lastSavedAt })
        if (generation === this.generation) {
          this.config = { ...config, lastSavedAt }
          this.update({ lastSavedAt, phase: this.timer ? "pending" : "ready", error: "" })
        }
      } catch (error) { if (generation === this.generation) { this.cancelTimer(); this.fail(error) } }
    })).catch((error: unknown) => { if (generation === this.generation) this.fail(error) })
    return this.queue
  }

  async disable() {
    const profile = this.profile
    if (!profile) return
    const generation = ++this.generation
    this.cancelTimer()
    this.config = undefined
    this.update({ phase: "loading" })
    try {
      await this.queue
      await this.deps.withLock(() => this.deps.writeConfig(profile.id, undefined))
      if (generation === this.generation) this.update({ configured: false, phase: "off", fileName: "", lastSavedAt: null, error: "" })
    } catch (error) { if (generation === this.generation) this.fail(error) }
  }
}

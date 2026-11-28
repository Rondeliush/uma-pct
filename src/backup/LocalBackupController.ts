import type { Profile } from "../profiles/profileStore"
import type { ImportedProfileFile } from "../profiles/profileTransfer"
import { assertBackupFileOwner, readBackupFile, canRelinkBackupFile, relinkProfileBackupFile, writeProfileBackupFile, type BackupFile, type BackupDestination } from "./backupFile"
import { backupStep, withBackupDeadline } from "./backupOperation"
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
  relink: { fileName: string } | null
}
type Dependencies = {
  readConfig(id: string): Promise<BackupConfig | undefined>
  writeConfig(id: string, value: BackupConfig | undefined): Promise<void>
  readBackup(id: string, signal?: AbortSignal): Promise<ImportedProfileFile>
  pickFile(name: string, destination: BackupDestination): Promise<BackupFile>
  withLock(task: () => Promise<void>, signal?: AbortSignal): Promise<void>
  delay?: number
  timeoutMs?: number
}

export class LocalBackupController {
  private deps: Dependencies
  private profile: Profile | null = null
  private config: BackupConfig | undefined
  private pendingRelink: { handle: BackupFile; configId: string | undefined } | undefined
  private relinkGeneration: number | undefined
  private changedDuringRelink = false
  private generation = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  private queue: Promise<void> = Promise.resolve()
  private session = new AbortController()
  private saving: { generation: number; promise: Promise<void>; changed: boolean } | undefined
  private listeners = new Set<() => void>()
  private state: BackupState = {
    profileId: null, profileName: "", fileName: "", phase: "off",
    lastSavedAt: null, error: "", configured: false, relink: null,
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
    this.cancelTimer()
    const permission = error instanceof Error && error.name === "NotAllowedError"
    this.update({ phase: permission ? "permission" : "error", error: error instanceof Error ? error.message : "Could not save the backup file." })
  }

  private run<T>(task: (signal: AbortSignal) => Promise<T>) {
    return withBackupDeadline(task, this.deps.timeoutMs, this.session.signal)
  }

  private enqueue(task: (signal: AbortSignal) => Promise<void>, generation: number) {
    const previous = this.queue
    this.queue = this.run(async signal => {
      await backupStep(signal, "waiting for the previous backup", () => previous)
      await backupStep(signal, "waiting for the backup file lock", () => this.deps.withLock(() => task(signal), signal))
    }).catch(error => {
      if (generation === this.generation) this.fail(error)
    }).finally(() => {
      if (generation === this.generation && (this.state.phase === "saving" || (this.state.phase === "pending" && !this.timer))) {
        this.fail(new Error("The file backup did not finish. Your profile is still saved on this device. Try again."))
      }
    })
    return this.queue
  }

  async setProfile(profile: Profile | null) {
    const generation = ++this.generation
    this.session.abort()
    this.session = new AbortController()
    this.saving = undefined
    this.cancelTimer()
    this.profile = profile
    this.config = undefined
    this.pendingRelink = undefined
    this.relinkGeneration = undefined
    this.changedDuringRelink = false
    this.update({ profileId: profile?.id ?? null, profileName: profile?.name ?? "", fileName: "", lastSavedAt: null, error: "", configured: false, relink: null, phase: profile ? "loading" : "off" })
    if (!profile) return
    try {
      const config = await this.run(signal => backupStep(signal, "loading backup settings", () => this.deps.readConfig(profile.id)))
      if (generation !== this.generation) return
      this.config = config
      this.update({ configured: !!config, fileName: config?.handle.name ?? "", lastSavedAt: config?.lastSavedAt ?? null, phase: "off" })
      if (config) await this.saveNow()
    } catch (error) { if (generation === this.generation) this.fail(error) }
  }

  async selectFile(destination: BackupDestination = "folder") {
    if (!this.profile) return
    const profile = this.profile
    const generation = this.generation
    this.cancelRelink()
    const name = Array.from(profile.name, (char) => char.charCodeAt(0) < 32 ? "_" : char)
      .join("").replace(/[<>:"/\\|?*]/g, "_").slice(0, 80).replace(/[. ]+$/g, "") || "profile"
    try {
      // The picker must run directly from the user's click, before any await.
      const handle = await this.deps.pickFile(`UmaPCT-${name}.json`, destination)
      if (generation !== this.generation) return
      await this.run(async signal => {
        const existing = await readBackupFile(handle, signal)
        if (generation !== this.generation) return
        if (!existing && destination === "existing") {
          throw new Error("This file is not a valid profile backup. Choose a new file. Nothing was overwritten.")
        }
        if (existing && canRelinkBackupFile(profile, existing)) {
          this.pendingRelink = { handle, configId: this.config?.id }
          this.update({ relink: { fileName: handle.name }, error: "", ...(!this.config ? { phase: "off" as const } : {}) })
          return
        }
        await assertBackupFileOwner(handle, profile.sourceProfileId ?? profile.id, signal)
        if (generation !== this.generation) return
        this.cancelTimer()
        await backupStep(signal, "waiting for the previous backup", () => this.queue)
        if (generation !== this.generation) return
        const config = { id: crypto.randomUUID(), handle, lastSavedAt: null }
        await this.deps.withLock(() => backupStep(signal, "saving backup settings", () => this.deps.writeConfig(profile.id, config)), signal)
        if (generation !== this.generation) return
        this.config = config
        this.update({ configured: true, fileName: handle.name, lastSavedAt: null, error: "" })
      })
      if (generation !== this.generation || this.pendingRelink) return
      await this.saveNow()
    } catch (error) {
      if (generation !== this.generation || (error instanceof Error && error.name === "AbortError")) return
      this.fail(error)
    }
  }

  cancelRelink() {
    this.pendingRelink = undefined
    if (this.state.relink) this.update({ relink: null })
  }

  confirmRelink(): Promise<void> {
    const pending = this.pendingRelink
    const profile = this.profile
    const generation = this.generation
    if (!pending || !profile) return Promise.resolve()
    this.cancelRelink()
    this.cancelTimer()
    this.relinkGeneration = generation
    return this.enqueue(async signal => {
      const current = () => generation === this.generation && !signal.aborted
      if (generation !== this.generation) return
      const currentConfig = await backupStep(signal, "reading backup settings", () => this.deps.readConfig(profile.id))
      if (generation !== this.generation) return
      if (currentConfig?.id !== pending.configId) {
        throw new Error("Backup settings changed in another tab. Reopen this profile before linking a backup.")
      }
      if (await backupStep(signal, "checking file permission", () => pending.handle.queryPermission({ mode: "readwrite" })) !== "granted") {
        throw new DOMException("File access was not granted. The file was not changed.", "NotAllowedError")
      }
      if (generation !== this.generation) return
      this.update({ phase: "saving", error: "" })
      const backup = await backupStep(signal, "reading the saved profile", () => this.deps.readBackup(profile.id, signal))
      if (generation !== this.generation) return
      const saved = await relinkProfileBackupFile(pending.handle, backup, profile, current, signal)
      if (!saved || generation !== this.generation) return
      const config = { id: crypto.randomUUID(), handle: pending.handle, lastSavedAt: new Date().toISOString() }
      await backupStep(signal, "saving backup completion", () => this.deps.writeConfig(profile.id, config))
      if (generation === this.generation) {
        this.config = config
        this.update({ configured: true, fileName: pending.handle.name, lastSavedAt: config.lastSavedAt, phase: "ready", error: "" })
      }
    }, generation).finally(() => {
      if (this.relinkGeneration !== generation) return
      this.relinkGeneration = undefined
      const changed = this.changedDuringRelink
      this.changedDuringRelink = false
      if (changed && generation === this.generation && this.state.phase === "ready") this.changed(`profile:${profile.id}:data`)
    })
  }

  async resume() {
    const generation = this.generation
    if (!this.config) return
    try {
      const handle = this.config.handle
      const permission = await this.run(signal => backupStep(signal, "requesting file permission", () => handle.requestPermission({ mode: "readwrite" })))
      if (generation !== this.generation) return
      if (permission !== "granted") {
        this.update({ phase: "permission", error: "File access was not granted. Your profile data is still saved locally on this device." })
        return
      }
      await this.saveNow()
    } catch (error) { if (generation === this.generation) this.fail(error) }
  }

  changed(key: string) {
    if (!this.profile || (key !== "profiles" && key !== `profile:${this.profile.id}:data`)) return
    if (this.relinkGeneration === this.generation) { this.changedDuringRelink = true; return }
    if (!this.config) return
    if (this.state.phase === "permission" || this.state.phase === "error") return
    if (this.saving?.generation === this.generation) { this.saving.changed = true; return }
    if (!this.timer) {
      this.update({ phase: "pending" })
      // Bounded delay, even when updates arrive continuously.
      this.timer = setTimeout(() => { this.timer = undefined; void this.saveNow() }, this.deps.delay ?? 1500)
    }
  }

  saveNow(): Promise<void> {
    if (this.relinkGeneration === this.generation) return this.queue
    this.cancelTimer()
    if (this.saving?.generation === this.generation) return this.saving.promise
    const profile = this.profile
    const config = this.config
    const generation = this.generation
    if (!profile || !config) return Promise.resolve()
    const saving = { generation, promise: Promise.resolve(), changed: false }
    this.saving = saving
    this.update({ phase: "pending", error: "" })
    saving.promise = this.enqueue(async signal => {
      const current = () => generation === this.generation && !signal.aborted
      if (generation !== this.generation) return
      const currentConfig = await backupStep(signal, "reading backup settings", () => this.deps.readConfig(profile.id))
      if (generation !== this.generation) return
      if (currentConfig?.id !== config.id) {
        this.config = undefined
        this.update({ configured: false, phase: "error", error: "Backup settings changed in another tab. Reopen this profile to load them." })
        return
      }
      if (await backupStep(signal, "checking file permission", () => config.handle.queryPermission({ mode: "readwrite" })) !== "granted") {
        if (generation === this.generation) this.update({ phase: "permission", error: "Allow access to resume automatic file backups." })
        return
      }
      if (generation !== this.generation) return
      this.update({ phase: "saving", error: "" })
      const backup = await backupStep(signal, "reading the saved profile", () => this.deps.readBackup(profile.id, signal))
      if (generation !== this.generation) return
      if (backup.profile.sourceProfileId !== (profile.sourceProfileId ?? profile.id)) {
        throw new Error("The profile identity changed. Reopen the profile before saving a backup.")
      }
      const saved = await writeProfileBackupFile(config.handle, backup, current, signal)
      if (!saved) return
      // Report success only after the file has been committed with close().
      const lastSavedAt = new Date().toISOString()
      await backupStep(signal, "saving backup completion", () => this.deps.writeConfig(profile.id, { ...config, lastSavedAt }))
      if (generation === this.generation) {
        this.config = { ...config, lastSavedAt }
        this.update({ lastSavedAt, phase: this.timer ? "pending" : "ready", error: "" })
      }
    }, generation).finally(() => {
      if (this.saving !== saving) return
      this.saving = undefined
      if (saving.changed && this.state.phase === "ready") this.changed(`profile:${profile.id}:data`)
    })
    return saving.promise
  }

  async disable() {
    const profile = this.profile
    if (!profile) return
    const generation = ++this.generation
    this.session.abort()
    this.session = new AbortController()
    this.saving = undefined
    this.cancelTimer()
    this.cancelRelink()
    this.relinkGeneration = undefined
    this.changedDuringRelink = false
    this.config = undefined
    this.update({ phase: "loading" })
    try {
      await this.run(async signal => {
        await backupStep(signal, "waiting for the previous backup", () => this.queue)
        await this.deps.withLock(() => backupStep(signal, "disabling file backup", () => this.deps.writeConfig(profile.id, undefined)), signal)
      })
      if (generation === this.generation) this.update({ configured: false, phase: "off", fileName: "", lastSavedAt: null, error: "" })
    } catch (error) { if (generation === this.generation) this.fail(error) }
  }
}

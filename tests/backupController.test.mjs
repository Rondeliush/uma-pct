import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { LocalBackupController } = await importTS(new URL("../src/backup/LocalBackupController.ts", import.meta.url))
const { withBackupFileLock } = await importTS(new URL("../src/backup/backupFile.ts", import.meta.url))
const { PROFILE_DATA_VERSION } = await importTS(new URL("../src/profiles/profileDataMigration.ts", import.meta.url))
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const never = () => new Promise(() => {})
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const profile = { id: "backup-test", name: "Trainer", createdAt: "2026-11-28T00:00:00Z" }
const backup = () => ({
  format: "uma-tracker-profile", version: 1, profile: { sourceProfileId: profile.id, name: profile.name },
  data: { dataVersion: PROFILE_DATA_VERSION, cms: [], lohs: [], customUmaDatabase: { customCharacters: [], customVersions: [], archivedVersionIds: [] }, favoriteUmaId: "first", cmViewMode: "detailed", seenOfficialVersionIds: [], onboardingCompleted: true },
})

function setup() {
  const hooks = {}, phases = [], calls = { open: 0, write: 0, close: 0, abort: 0 }
  let text = "", current = backup(), config
  const step = async name => { await hooks[name]?.() }
  const handle = {
    name: "Trainer.json",
    async queryPermission() { await step("permission"); return "granted" },
    async requestPermission() { await step("requestPermission"); return "granted" },
    async getFile() { await step("file"); return { text: async () => { await step("text"); return text } } },
    async createWritable() {
      calls.open++; await step("open")
      let staged
      return {
        async write(value) { calls.write++; staged = value; await step("write") },
        async close() { calls.close++; await step("close"); text = staged },
        async abort() { calls.abort++; await step("abort") },
      }
    },
  }
  const controller = new LocalBackupController({
    async readConfig() { await step("config"); return config },
    async writeConfig(id, value) { await step("saveConfig"); config = value },
    async readBackup() { const snapshot = structuredClone(current); await step("snapshot"); return snapshot },
    pickFile: async () => handle,
    withLock: async (task, signal) => { await step("lock"); return withBackupFileLock(task, signal) },
    timeoutMs: 60, delay: 5,
  })
  controller.subscribe(() => phases.push(controller.getSnapshot().phase))
  return { controller, hooks, phases, calls, handle,
    async connect() { await controller.setProfile(profile); await controller.selectFile(); assert.equal(controller.getSnapshot().phase, "ready") },
    update(value) { current.data.favoriteUmaId = value },
    contents: () => JSON.parse(text),
  }
}

test("successful backup reports ready only after close and saves the latest snapshot", { timeout: 2000 }, async () => {
  const f = setup(); await f.connect()
  const entered = deferred(), release = deferred(), previous = f.controller.getSnapshot().lastSavedAt
  f.hooks.close = async () => { entered.resolve(); await release.promise }
  f.update("latest")
  const saving = f.controller.saveNow(); await entered.promise
  assert.equal(f.controller.getSnapshot().phase, "saving")
  assert.equal(f.controller.getSnapshot().lastSavedAt, previous)
  release.resolve(); await saving
  assert.equal(f.controller.getSnapshot().phase, "ready")
  assert.equal(f.controller.getSnapshot().error, "")
  assert.equal(f.contents().data.favoriteUmaId, "latest")
  assert.equal(f.calls.close, 2)
})

test("write error clears saving even if abort never settles; the next autosave succeeds", { timeout: 2000 }, async () => {
  const f = setup(); await f.connect()
  const previous = f.controller.getSnapshot().lastSavedAt
  f.hooks.write = () => { throw new Error("Disk full") }; f.hooks.abort = never
  await f.controller.saveNow()
  assert.equal(f.controller.getSnapshot().phase, "error")
  assert.match(f.controller.getSnapshot().error, /Disk full/)
  assert.equal(f.controller.getSnapshot().lastSavedAt, previous)
  assert.equal(f.calls.close, 1)
  delete f.hooks.write; delete f.hooks.abort
  await f.controller.saveNow()
  f.update("autosaved-after-error"); f.controller.changed(`profile:${profile.id}:data`)
  await pause(20); await f.controller.saveNow()
  assert.equal(f.controller.getSnapshot().phase, "ready")
  assert.equal(f.contents().data.favoriteUmaId, "autosaved-after-error")
})

for (const stage of ["config", "permission", "snapshot", "file", "text", "open", "write", "saveConfig", "lock"]) {
  test(`unresolved ${stage} ends with a controlled error and does not poison the queue`, { timeout: 2000 }, async () => {
    const f = setup(); await f.connect()
    const previous = f.controller.getSnapshot().lastSavedAt
    f.hooks[stage] = never
    await f.controller.saveNow()
    assert.equal(f.controller.getSnapshot().phase, "error")
    assert.match(f.controller.getSnapshot().error, /timed out/)
    assert.equal(f.controller.getSnapshot().lastSavedAt, previous)
    delete f.hooks[stage]; f.update(`recovered-${stage}`)
    await f.controller.saveNow()
    assert.equal(f.controller.getSnapshot().phase, "ready")
    assert.equal(f.contents().data.favoriteUmaId, `recovered-${stage}`)
  })
}

test("late writer creation and late writes cannot overwrite a successful retry", { timeout: 2000 }, async () => {
  for (const stage of ["open", "write"]) {
    const f = setup(); await f.connect()
    const entered = deferred(), release = deferred()
    f.hooks[stage] = async () => { entered.resolve(); await release.promise }
    f.update("stale"); const saving = f.controller.saveNow(); await entered.promise; await saving
    assert.equal(f.controller.getSnapshot().phase, "error")
    delete f.hooks[stage]; f.update("newer"); await f.controller.saveNow()
    release.resolve(); await pause(5)
    assert.equal(f.controller.getSnapshot().phase, "ready")
    assert.equal(f.contents().data.favoriteUmaId, "newer")
    assert.equal(f.calls.close, 2, "the cancelled writer must never commit")
    assert.equal(f.calls.abort, 1)
  }
})

test("an unresolved native commit settles the UI but retains the physical lock until safe to retry", { timeout: 2000 }, async () => {
  const f = setup(); await f.connect()
  const entered = deferred(), release = deferred()
  f.hooks.close = async () => { entered.resolve(); await release.promise }
  f.update("old-commit"); const saving = f.controller.saveNow(); await entered.promise
  try {
    await saving
    assert.equal(f.controller.getSnapshot().phase, "error")
    const opens = f.calls.open
    delete f.hooks.close; f.update("new-commit"); await f.controller.saveNow()
    assert.equal(f.controller.getSnapshot().phase, "error")
    assert.equal(f.calls.open, opens, "a retry cannot overtake an unresolved commit")
  } finally { release.resolve() }
  await pause(5); await f.controller.saveNow()
  assert.equal(f.controller.getSnapshot().phase, "ready")
  assert.equal(f.contents().data.favoriteUmaId, "new-commit")
})

test("timeout aborts a pending commit when supported and allows the next save", { timeout: 2000 }, async () => {
  const f = setup(); await f.connect()
  const cancelled = deferred()
  f.hooks.close = async () => { await cancelled.promise; throw new Error("Commit aborted") }
  f.hooks.abort = () => { cancelled.resolve() }
  await f.controller.saveNow()
  assert.equal(f.controller.getSnapshot().phase, "error")
  assert.equal(f.calls.abort, 1)
  delete f.hooks.close; delete f.hooks.abort
  f.update("after-aborted-commit"); await f.controller.saveNow()
  assert.equal(f.controller.getSnapshot().phase, "ready")
  assert.equal(f.contents().data.favoriteUmaId, "after-aborted-commit")
})

test("concurrent flushes share one save and data changes schedule only one follow-up", { timeout: 2000 }, async () => {
  const f = setup(); await f.connect()
  const entered = deferred(), release = deferred()
  f.hooks.write = async () => { entered.resolve(); await release.promise }
  const saving = f.controller.saveNow(); await entered.promise
  const opens = f.calls.open
  for (let i = 0; i < 20; i++) {
    f.update(`change-${i}`); f.controller.changed(`profile:${profile.id}:data`)
    assert.equal(f.controller.saveNow(), saving)
  }
  assert.equal(f.calls.open, opens)
  delete f.hooks.write; release.resolve(); await saving
  await pause(20)
  assert.equal(f.calls.open, opens + 1)
  assert.equal(f.contents().data.favoriteUmaId, "change-19")
  assert.equal(f.controller.getSnapshot().phase, "ready")
})

test("switching profiles cancels a stalled save without changing the next profile status", { timeout: 2000 }, async () => {
  const f = setup(); await f.connect()
  const entered = deferred()
  f.hooks.write = () => { entered.resolve(); return never() }
  const saving = f.controller.saveNow(); await entered.promise
  await f.controller.setProfile(null); await saving
  assert.equal(f.controller.getSnapshot().phase, "off")
  assert.equal(f.controller.getSnapshot().profileId, null)
  assert.equal(f.calls.close, 1)
  assert.equal(f.calls.abort, 1)
  delete f.hooks.write
  await f.controller.setProfile(profile)
  assert.equal(f.controller.getSnapshot().phase, "ready")
})

test("stalled config loading and disabling leave loading with an error and can be retried", { timeout: 2000 }, async () => {
  const f = setup(); f.hooks.config = never
  await f.controller.setProfile(profile)
  assert.equal(f.controller.getSnapshot().phase, "error")
  delete f.hooks.config; await f.connect()
  f.hooks.saveConfig = never; await f.controller.disable()
  assert.equal(f.controller.getSnapshot().phase, "error")
  delete f.hooks.saveConfig; await f.controller.disable()
  assert.equal(f.controller.getSnapshot().phase, "off")
})

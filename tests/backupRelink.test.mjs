import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { LocalBackupController } = await importTS(new URL("../src/backup/LocalBackupController.ts", import.meta.url))
const { writeProfileBackupFile } = await importTS(new URL("../src/backup/backupFile.ts", import.meta.url))
const { getTrustedBackupSourceIds } = await importTS(new URL("../src/profiles/profileStore.ts", import.meta.url))
const { PROFILE_DATA_VERSION } = await importTS(new URL("../src/profiles/profileDataMigration.ts", import.meta.url))
const profile = (fields = {}) => ({ id: "local-copy", name: "Imported trainer", createdAt: "2026-10-11T00:00:00Z", sourceProfileId: "copy-owner", importedFromSourceProfileId: "desktop-owner", ...fields })
const backup = (owner, name = "Trainer") => ({ format: "uma-tracker-profile", version: 1, profile: { sourceProfileId: owner, name }, data: { dataVersion: PROFILE_DATA_VERSION, cms: [], lohs: [], customUmaDatabase: { customCharacters: [], customVersions: [], archivedVersionIds: [] }, favoriteUmaId: "current-uma", cmViewMode: "detailed", seenOfficialVersionIds: [], onboardingCompleted: true } })
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }

function file(contents, { onWrite, closeError } = {}) {
  let text = typeof contents === "string" ? contents : JSON.stringify(contents)
  const calls = { open: 0, write: 0, close: 0, abort: 0 }
  return {
    name: "Transferred-backup.json", calls,
    get text() { return text }, replace: value => { text = typeof value === "string" ? value : JSON.stringify(value) },
    permission: "granted",
    async queryPermission() { return this.permission }, async requestPermission() { return this.permission },
    async getFile() { const snapshot = text; return { text: async () => snapshot } },
    async createWritable() {
      calls.open++; let staged
      return {
        async write(value) { calls.write++; staged = value; await onWrite?.() },
        async close() { calls.close++; if (closeError) throw closeError; text = staged },
        async abort() { calls.abort++ },
      }
    },
  }
}

function setup(handle, currentProfile = profile()) {
  const configs = new Map()
  let selected = handle
  let current = backup(currentProfile.sourceProfileId ?? currentProfile.id, currentProfile.name)
  const controller = new LocalBackupController({
    readConfig: async id => configs.get(id),
    writeConfig: async (id, value) => { if (value) configs.set(id, value); else configs.delete(id) },
    readBackup: async () => structuredClone(current), pickFile: async () => selected,
    withLock: async task => task(), delay: 1,
  })
  return { controller, configs, currentProfile, setCurrent: value => { current = value }, setHandle: value => { selected = value } }
}

test("origin selection waits for confirmation, saves the current snapshot and then uses ordinary automatic saves", async () => {
  const transferred = backup("desktop-owner"); transferred.data.favoriteUmaId = "old-desktop-uma"
  const handle = file(transferred), original = handle.text
  const { controller, configs, currentProfile, setCurrent } = setup(handle)
  await controller.setProfile(currentProfile); await controller.selectFile("existing")
  assert.deepEqual(controller.getSnapshot().relink, { fileName: handle.name })
  assert.equal(controller.getSnapshot().configured, false)
  assert.equal(handle.text, original); assert.equal(handle.calls.open, 0); assert.equal(configs.size, 0)
  const latest = backup("copy-owner", "Renamed imported profile"); latest.data.favoriteUmaId = "edited-after-selection"
  setCurrent(latest); await controller.confirmRelink()
  assert.deepEqual(JSON.parse(handle.text), latest)
  assert.equal(controller.getSnapshot().phase, "ready"); assert.equal(controller.getSnapshot().error, "")
  assert.equal(controller.getSnapshot().relink, null); assert.equal(controller.getSnapshot().configured, true)
  assert.equal(configs.get(currentProfile.id).handle, handle); assert.ok(configs.get(currentProfile.id).lastSavedAt)
  latest.data.favoriteUmaId = "later-automatic-update"; setCurrent(latest)
  controller.changed(`profile:${currentProfile.id}:data`)
  await new Promise(resolve => setTimeout(resolve, 10)); await controller.saveNow()
  assert.deepEqual(JSON.parse(handle.text), latest)
  handle.replace(backup("unrelated-owner")); const protectedText = handle.text, opens = handle.calls.open
  await controller.saveNow()
  assert.equal(handle.text, protectedText); assert.equal(handle.calls.open, opens)
  assert.equal(controller.getSnapshot().phase, "error", "ownership protection remains active after adoption")
})

test("cancelling leaves the file byte-for-byte unchanged and backup disconnected", async () => {
  const handle = file(backup("desktop-owner")), original = handle.text
  const { controller, configs, currentProfile } = setup(handle)
  await controller.setProfile(currentProfile); await controller.selectFile("existing"); controller.cancelRelink()
  await controller.confirmRelink(); await controller.saveNow()
  assert.equal(handle.text, original); assert.equal(handle.calls.open, 0); assert.equal(configs.size, 0)
  assert.equal(controller.getSnapshot().configured, false); assert.equal(controller.getSnapshot().phase, "off")
})

test("restored origins and new import origins allow explicit relinking without replacing current identity or data", async () => {
  for (const source of ["desktop-owner", "other-trusted-device"]) {
    const current = profile({ importedFromSourceProfileId: undefined, trustedBackupSourceIds: ["desktop-owner", "other-trusted-device"] })
    const selected = backup(source); selected.data.favoriteUmaId = "older-desktop-data"
    const handle = file(selected), original = handle.text
    const { controller, configs, currentProfile, setCurrent } = setup(handle, current)
    await controller.setProfile(currentProfile); await controller.selectFile("existing")
    assert.deepEqual(controller.getSnapshot().relink, { fileName: handle.name })
    assert.equal(handle.text, original); assert.equal(handle.calls.open, 0); assert.equal(configs.size, 0)
    controller.cancelRelink(); await controller.confirmRelink()
    assert.equal(handle.text, original); assert.equal(configs.size, 0)
    await controller.selectFile("existing"); await controller.confirmRelink()
    assert.equal(controller.getSnapshot().phase, "ready"); assert.equal(controller.getSnapshot().configured, true)
    assert.equal(JSON.parse(handle.text).profile.sourceProfileId, "copy-owner")
    assert.equal(JSON.parse(handle.text).data.favoriteUmaId, "current-uma")
    assert.equal(current.sourceProfileId, "copy-owner"); assert.equal(configs.get(current.id).handle, handle)
    const latest = backup("copy-owner"); latest.data.favoriteUmaId = "later-mobile-change"
    setCurrent(latest); controller.changed(`profile:${current.id}:data`); await controller.saveNow()
    assert.deepEqual(JSON.parse(handle.text), latest); assert.equal(controller.getSnapshot().error, "")
  }
})

test("unrelated files remain untouched even when trusted restore origins exist", async () => {
  const current = profile({ importedFromSourceProfileId: undefined, trustedBackupSourceIds: ["desktop-owner"] })
  const handle = file(backup("unrelated-C")), original = handle.text
  const { controller, configs } = setup(handle, current)
  await controller.setProfile(current); await controller.selectFile("existing"); await controller.confirmRelink()
  assert.equal(controller.getSnapshot().relink, null); assert.match(controller.getSnapshot().error, /belongs to profile/)
  assert.equal(handle.text, original); assert.equal(handle.calls.open, 0); assert.equal(configs.size, 0)
})

test("trusted origin lookup accepts only exact nonempty string IDs and remains compatible with legacy imports", () => {
  const current = profile({ trustedBackupSourceIds: ["new-origin", null, 12, "", " ", "new-origin"] })
  assert.deepEqual(getTrustedBackupSourceIds(current), ["new-origin", "desktop-owner"])
  assert.deepEqual(getTrustedBackupSourceIds(profile({ trustedBackupSourceIds: "unrelated-owner" })), ["desktop-owner"])
  assert.deepEqual(getTrustedBackupSourceIds(profile({ trustedBackupSourceIds: null, importedFromSourceProfileId: undefined })), [])
})

test("unrelated profiles and older copies without recorded origin stay blocked without a relink offer", async () => {
  for (const [selectedOwner, fields] of [["other-owner", {}], ["desktop-owner", { importedFromSourceProfileId: undefined }], ["desktop-owner", { importedFromSourceProfileId: "another-origin" }]]) {
    const handle = file(backup(selectedOwner)), original = handle.text
    const { controller, configs, currentProfile } = setup(handle, profile(fields))
    await controller.setProfile(currentProfile); await controller.selectFile("existing"); await controller.confirmRelink()
    assert.equal(controller.getSnapshot().relink, null); assert.match(controller.getSnapshot().error, /belongs to profile/)
    assert.equal(handle.text, original); assert.equal(handle.calls.open, 0); assert.equal(configs.size, 0)
  }
})

test("matching owners, including normal cross-device imports with different local IDs, keep the existing flow", async () => {
  for (const current of [profile(), profile({ sourceProfileId: "desktop-owner", importedFromSourceProfileId: undefined })]) {
    const handle = file(backup(current.sourceProfileId)), { controller, currentProfile } = setup(handle, current)
    await controller.setProfile(currentProfile); await controller.selectFile("existing")
    assert.equal(controller.getSnapshot().relink, null); assert.equal(controller.getSnapshot().phase, "ready")
    assert.equal(JSON.parse(handle.text).profile.sourceProfileId, current.sourceProfileId); assert.equal(handle.calls.close, 1)
  }
})

test("malformed JSON, invalid payloads, future formats and empty existing files are never written", async () => {
  const invalid = backup("desktop-owner"); invalid.data.cms = [null]
  const future = backup("desktop-owner"); future.version = 999
  for (const contents of ["", "not json", "{}", { format: "other" }, invalid, future]) {
    const handle = file(contents), original = handle.text, { controller, configs, currentProfile } = setup(handle)
    await controller.setProfile(currentProfile); await controller.selectFile("existing"); await controller.confirmRelink()
    assert.equal(controller.getSnapshot().phase, "error"); assert.equal(controller.getSnapshot().relink, null)
    assert.equal(handle.text, original); assert.equal(handle.calls.open, 0); assert.equal(configs.size, 0)
  }
})

test("empty newly created folder destinations still accept the first ordinary backup", async () => {
  const handle = file(""), { controller, currentProfile } = setup(handle)
  await controller.setProfile(currentProfile); await controller.selectFile("folder")
  assert.equal(controller.getSnapshot().phase, "ready"); assert.equal(JSON.parse(handle.text).profile.sourceProfileId, "copy-owner")
})

test("confirmation revalidates changed ownership, corruption and emptied files before opening a writable stream", async () => {
  for (const replacement of [backup("another-owner"), "broken", ""]) {
    const handle = file(backup("desktop-owner")), { controller, currentProfile } = setup(handle)
    await controller.setProfile(currentProfile); await controller.selectFile("existing")
    handle.replace(replacement); const changed = handle.text; await controller.confirmRelink()
    assert.equal(handle.text, changed); assert.equal(handle.calls.open, 0)
    assert.equal(controller.getSnapshot().phase, "error"); assert.equal(controller.getSnapshot().configured, false)
  }
})

test("switching or disabling profiles invalidates pending consent", async () => {
  for (const action of [c => c.setProfile(profile({ id: "other-local", sourceProfileId: "other-owner" })), c => c.disable()]) {
    const handle = file(backup("desktop-owner")), original = handle.text, { controller, configs, currentProfile } = setup(handle)
    await controller.setProfile(currentProfile); await controller.selectFile("existing"); await action(controller); await controller.confirmRelink()
    assert.equal(controller.getSnapshot().relink, null)
    assert.equal(handle.text, original); assert.equal(handle.calls.open, 0); assert.equal(configs.size, 0)
  }
})

test("identity or backup settings changed during confirmation are rejected before writing", async () => {
  for (const change of ["identity", "config"]) {
    const handle = file(backup("desktop-owner")), original = handle.text, { controller, configs, currentProfile, setCurrent } = setup(handle)
    await controller.setProfile(currentProfile); await controller.selectFile("existing")
    if (change === "identity") setCurrent(backup("different-current-owner"))
    else configs.set(currentProfile.id, { id: "other-tab-config", handle: file(""), lastSavedAt: null })
    await controller.confirmRelink()
    assert.equal(handle.text, original); assert.equal(handle.calls.open, 0); assert.equal(controller.getSnapshot().phase, "error")
  }
})

test("profile changes during a staged confirmed write abort the stream and preserve the original file", async () => {
  const writing = deferred(), release = deferred()
  const handle = file(backup("desktop-owner"), { onWrite: async () => { writing.resolve(); await release.promise } }), original = handle.text
  const { controller, configs, currentProfile } = setup(handle)
  await controller.setProfile(currentProfile); await controller.selectFile("existing")
  const confirmation = controller.confirmRelink(); await writing.promise
  await controller.setProfile(null); release.resolve(); await confirmation
  assert.equal(handle.text, original); assert.equal(handle.calls.abort, 1); assert.equal(handle.calls.close, 0); assert.equal(configs.size, 0)
})

test("permission and commit failures never report a connected successful backup", async () => {
  for (const failure of ["permission", "close"]) {
    const handle = file(backup("desktop-owner"), failure === "close" ? { closeError: new Error("Disk full") } : {}), original = handle.text
    const { controller, configs, currentProfile } = setup(handle)
    await controller.setProfile(currentProfile); await controller.selectFile("existing")
    if (failure === "permission") handle.permission = "denied"
    await controller.confirmRelink()
    assert.equal(handle.text, original); assert.equal(configs.size, 0); assert.equal(controller.getSnapshot().configured, false)
    assert.equal(controller.getSnapshot().lastSavedAt, null)
    assert.equal(controller.getSnapshot().phase, failure === "permission" ? "permission" : "error")
  }
})

test("ordinary exports/writes never adopt an origin file implicitly", async () => {
  const handle = file(backup("desktop-owner")), original = handle.text
  await assert.rejects(writeProfileBackupFile(handle, backup("copy-owner")), /belongs to profile/)
  assert.equal(handle.text, original); assert.equal(handle.calls.open, 0)
})

test("changes and flush requests during relinking switch to the new file without stale-configuration errors", async () => {
  const old = file(backup("copy-owner")), writing = deferred(), release = deferred()
  let first = true
  const destination = file(backup("desktop-owner"), { onWrite: async () => {
    if (first) { first = false; writing.resolve(); await release.promise }
  } })
  const { controller, currentProfile, setHandle, setCurrent } = setup(old)
  await controller.setProfile(currentProfile); await controller.selectFile("existing")
  const oldContents = old.text
  setHandle(destination); await controller.selectFile("existing")
  const confirmation = controller.confirmRelink(); await writing.promise
  const latest = backup("copy-owner"); latest.data.favoriteUmaId = "changed-during-relink"
  setCurrent(latest); controller.changed(`profile:${currentProfile.id}:data`)
  const flush = controller.saveNow(); release.resolve(); await confirmation; await flush
  await new Promise(resolve => setTimeout(resolve, 10)); await controller.saveNow()
  assert.equal(controller.getSnapshot().phase, "ready"); assert.equal(controller.getSnapshot().error, "")
  assert.equal(old.text, oldContents); assert.deepEqual(JSON.parse(destination.text), latest)
})

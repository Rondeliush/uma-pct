import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { restoreProfileFromBackup, importProfileToDevice } = await importTS(new URL("../src/profiles/profileTransfer.ts", import.meta.url))
const { PROFILE_DATA_VERSION } = await importTS(new URL("../src/profiles/profileDataMigration.ts", import.meta.url))
const data = (favoriteUmaId = "old-favorite") => ({ dataVersion: PROFILE_DATA_VERSION, cms: [], lohs: [], customUmaDatabase: { customCharacters: [], customVersions: [], archivedVersionIds: [] }, favoriteUmaId, cmViewMode: "compact", seenOfficialVersionIds: [], onboardingCompleted: false, cmLineupGuideCompleted: false })
const target = { id: "target-local", sourceProfileId: "target-owner", importedFromSourceProfileId: "original-import", name: "rondel mobile", createdAt: "2026-10-11" }
const backup = (owner = "target-owner") => ({ format: "uma-tracker-profile", version: 1, profile: { sourceProfileId: owner, name: "rondel backup" }, data: data("restored-favorite") })

// Minimal transactional IndexedDB adapter: puts stage data, abort discards it,
// and results become visible only at transaction completion.
function storage({ failCommit = false, profile = target } = {}) {
  let committed = new Map([["profiles", [profile]], [`profile:${profile.id}:data`, data()], [`backup:profile:${profile.id}`, { id: "backup-config", handle: "preserved-file", lastSavedAt: "previous-save" }]])
  const puts = []
  globalThis.indexedDB = {
    open() {
      const request = {}
      queueMicrotask(() => {
        request.result = {
          close() {},
          transaction() {
            const staged = structuredClone(committed), requests = []
            let aborted = false
            const transaction = {
              error: null,
              abort() { aborted = true },
              objectStore() {
                return {
                  get(key) { const read = {}; requests.push(() => { read.result = staged.get(key); read.onsuccess?.() }); return read },
                  put(value, key) { puts.push(key); staged.set(key, structuredClone(value)) },
                  add(value, key) { if (staged.has(key)) throw new Error("Duplicate key"); staged.set(key, structuredClone(value)) },
                }
              },
            }
            queueMicrotask(() => {
              while (requests.length && !aborted) requests.shift()()
              if (failCommit || aborted) { transaction.error = new Error("Transaction aborted"); transaction.onabort?.() }
              else { committed = staged; transaction.oncomplete?.() }
            })
            return transaction
          },
        }
        request.onsuccess()
      })
      return request
    },
  }
  return { read: key => structuredClone(committed.get(key)), snapshot: () => structuredClone(committed), puts, remove: key => committed.delete(key), replace: (key, value) => committed.set(key, value) }
}

test("matching and explicitly confirmed foreign restores replace data while preserving every target identity and backup field", async () => {
  for (const owner of ["target-owner", "foreign-owner"]) {
    const store = storage(), profiles = store.read("profiles"), config = store.read(`backup:profile:${target.id}`)
    const file = backup(owner), originalFile = structuredClone(file)
    await restoreProfileFromBackup(target, file)
    assert.deepEqual(store.read(`profile:${target.id}:data`), { ...file.data, onboardingCompleted: true, cmLineupGuideCompleted: true })
    assert.deepEqual(store.read("profiles"), profiles)
    assert.deepEqual(store.read(`backup:profile:${target.id}`), config)
    assert.deepEqual(store.puts, [`profile:${target.id}:data`])
    assert.deepEqual(file, originalFile, "the input backup is not modified")
  }
})

test("malformed, unsupported and invalid restore payloads leave all profile storage unchanged", async () => {
  for (const file of [null, "broken JSON", {}, { ...backup(), version: 999 }, { ...backup(), data: { ...data(), cms: [null] } }, { ...backup(), data: { ...data(), dataVersion: PROFILE_DATA_VERSION + 1 } }]) {
    const store = storage(), before = store.snapshot()
    await assert.rejects(restoreProfileFromBackup(target, file), /valid UmaPCT/)
    assert.deepEqual(store.snapshot(), before); assert.equal(store.puts.length, 0)
  }
})

test("missing targets and changed target ownership cannot be restored from a stale preview", async () => {
  for (const change of ["profile", "identity"]) {
    const store = storage()
    if (change === "profile") store.remove("profiles")
    const before = store.snapshot()
    await assert.rejects(restoreProfileFromBackup(change === "identity" ? { ...target, sourceProfileId: "stale-owner" } : target, backup()))
    assert.deepEqual(store.snapshot(), before); assert.equal(store.puts.length, 0)
  }
})

test("an existing profile with missing or corrupt data can recover from a valid backup without changing its identity", async () => {
  for (const contents of [undefined, { broken: true }]) {
    const store = storage()
    store.replace(`profile:${target.id}:data`, contents)
    await restoreProfileFromBackup(target, backup())
    assert.deepEqual(store.read(`profile:${target.id}:data`), { ...backup().data, onboardingCompleted: true, cmLineupGuideCompleted: true })
    assert.deepEqual(store.read("profiles"), [target])
  }
})

test("an aborted commit after staging restored data rolls back the entire replacement", async () => {
  const store = storage({ failCommit: true }), before = store.snapshot()
  await assert.rejects(restoreProfileFromBackup(target, backup()), /aborted/)
  assert.equal(store.puts.length, 1, "the failure occurs after staging the write")
  assert.deepEqual(store.snapshot(), before)
})

test("supported older exports migrate data while preserving legacy target identity", async () => {
  const legacy = { ...target, sourceProfileId: undefined }
  const store = storage({ profile: legacy }), file = backup()
  delete file.data.dataVersion
  await restoreProfileFromBackup(legacy, file)
  assert.equal(store.read(`profile:${target.id}:data`).dataVersion, PROFILE_DATA_VERSION)
  assert.deepEqual(store.read("profiles"), [legacy])
})

test("Import Profile remains non-destructive and duplicate copies still record their origin for explicit backup relinking", async () => {
  const store = storage(), original = store.read(`profile:${target.id}:data`)
  await assert.rejects(importProfileToDevice(backup()), /already exists/)
  assert.deepEqual(store.read("profiles"), [target]); assert.deepEqual(store.read(`profile:${target.id}:data`), original)
  const copy = await importProfileToDevice(backup(), true)
  assert.notEqual(copy.id, target.id); assert.notEqual(copy.sourceProfileId, target.sourceProfileId)
  assert.equal(copy.importedFromSourceProfileId, target.sourceProfileId)
  assert.equal(store.read("profiles").length, 2)
  assert.deepEqual(store.read(`profile:${target.id}:data`), original)
  assert.deepEqual(store.read(`profile:${copy.id}:data`), backup().data)
  assert.equal(store.read(`backup:profile:${copy.id}`), undefined)
})

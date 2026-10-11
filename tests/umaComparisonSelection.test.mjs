import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import ts from "typescript"

const code = ts.transpileModule(readFileSync(new URL("../src/Statistics/umaComparisonSelection.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText
const { normalizeUmaComparisonSlots } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`)

test("legacy or malformed Compare preferences restore five empty slots", () => {
  for (const saved of [undefined, null, "uma", {}, 4]) {
    assert.deepEqual(normalizeUmaComparisonSlots(saved), [null, null, null, null, null])
  }
})

test("Compare restoration preserves selected order and holes without modifying the saved array", () => {
  const saved = ["original", null, "christmas", "custom", null]
  assert.deepEqual(normalizeUmaComparisonSlots(saved), saved)
  assert.notEqual(normalizeUmaComparisonSlots(saved), saved)
  assert.deepEqual(saved, ["original", null, "christmas", "custom", null])
})

test("Compare restoration rejects duplicate and malformed entries and caps the saved slots at five", () => {
  assert.deepEqual(normalizeUmaComparisonSlots(["original", "original", 3, " ", "christmas", "sixth"]), ["original", null, null, null, "christmas"])
})

test("removed Umas become empty slots without shifting valid custom or archived selections", () => {
  const valid = new Set(["original", "custom", "archived"])
  assert.deepEqual(normalizeUmaComparisonSlots(["removed", "custom", "original", "archived", "custom"], valid), [null, "custom", "original", "archived", null])
})

test("reordered Compare selections retain their new positions after a save/restore round trip", () => {
  const reordered = ["christmas", null, "original", null, "custom"]
  assert.deepEqual(normalizeUmaComparisonSlots(JSON.parse(JSON.stringify(reordered))), reordered)
})

import { readFileSync } from "node:fs"
import ts from "typescript"

const compiled = new Map()

/** Load the real pure TS modules and their relative imports without a test dependency. */
function compile(url) {
  if (compiled.has(url.href)) return compiled.get(url.href)
  const source = ts.transpileModule(readFileSync(url, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText.replaceAll("import.meta.env.BASE_URL", JSON.stringify("/"))
    .replace(/from\s+(["'])(\.[^"']+)\1/g, (_, quote, path) => {
    const dependency = new URL(path.endsWith(".ts") ? path : `${path}.ts`, url)
    return `from ${JSON.stringify(compile(dependency))}`
  })
  const result = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
  compiled.set(url.href, result)
  return result
}

export function importTS(url) {
  return import(compile(url))
}

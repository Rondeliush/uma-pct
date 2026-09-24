import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

const tracks = [
  ["sapporo.png", "https://media.gametora.com/umamusume/racetrack/icon/10001.png"],
  ["hakodate.png", "https://media.gametora.com/umamusume/racetrack/icon/10002.png"],
  ["niigata.png", "https://media.gametora.com/umamusume/racetrack/icon/10003.png"],
  ["fukushima.png", "https://media.gametora.com/umamusume/racetrack/icon/10004.png"],
  ["nakayama.png", "https://media.gametora.com/umamusume/racetrack/icon/10005.png"],
  ["tokyo.png", "https://media.gametora.com/umamusume/racetrack/icon/10006.png"],
  ["chukyo.png", "https://media.gametora.com/umamusume/racetrack/icon/10007.png"],
  ["kyoto.png", "https://media.gametora.com/umamusume/racetrack/icon/10008.png"],
  ["hanshin.png", "https://media.gametora.com/umamusume/racetrack/icon/10009.png"],
  ["kokura.png", "https://media.gametora.com/umamusume/racetrack/icon/10010.png"],
  ["ooi.png", "https://media.gametora.com/umamusume/racetrack/icon/10101.png"],
  ["kawasaki.png", "https://media.gametora.com/umamusume/racetrack/icon/10103.png"],
  ["funabashi.png", "https://media.gametora.com/umamusume/racetrack/icon/10104.png"],
  ["morioka.png", "https://media.gametora.com/umamusume/racetrack/icon/10105.png"],
  ["longchamp.png", "https://media.gametora.com/umamusume/racetrack/icon/10201.png"],
  ["santa-anita.png", "https://media.gametora.com/umamusume/racetrack/icon/10202.png"],
  ["del-mar.png", "https://media.gametora.com/umamusume/racetrack/icon/10203.png"],
]

const outputDir = join(process.cwd(), "public", "Tracks")

await mkdir(outputDir, { recursive: true })

console.log(`Downloading ${tracks.length} track images to:`)
console.log(outputDir)
console.log("")

let downloaded = 0
let failed = 0

for (const [fileName, url] of tracks) {
  try {
    process.stdout.write(`Downloading ${fileName} ... `)

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    await writeFile(join(outputDir, fileName), buffer)

    downloaded += 1
    console.log("OK")
  } catch (error) {
    failed += 1
    console.log("FAILED")
    console.error(`  ${error instanceof Error ? error.message : error}`)
  }
}

console.log("")
console.log(`Finished. Downloaded: ${downloaded}, failed: ${failed}`)

if (failed > 0) {
  process.exitCode = 1
}

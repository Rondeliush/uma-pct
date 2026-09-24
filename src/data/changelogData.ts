export type ChangelogEntry = {
  version: string
  date: string
  new?: string[]
  improved?: string[]
  fixed?: string[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: "0.1.0",
    date: "2026-09-19",
    new: [
      "Champions Meeting notes",
      "Favorite Uma profile avatars",
      "First-launch onboarding",
      "AutoRun Timer",
    ],
    improved: [
      "Profile import and export experience",
      "AutoRun settings and alarm controls",
    ],
  },
]
export type ChangelogEntry = {
  version: string
  date: string
  new?: string[]
  improved?: string[]
  fixed?: string[]
}

export const changelog: ChangelogEntry[] = [

    {
    version: "0.1.2",
    date: "2026-09-29",

    new: [
      "Added support for installing UmaPCT as an app.",
      "Added app installation controls to Settings.",
    ],
  },
    {
    version: "0.1.1",
    date: "2026-09-28",
    new: [
      "Added dedicated mobile layouts and interactions across the app.",
      "Added mobile-specific AutoRun behavior that relies on Umamusume notifications instead of duplicate UmaPCT alarms.",
    ],
    improved: [
      "Improved Champions Meeting layout, cards, filters, forms, results and race history on mobile.",
      "Improved Statistics layout on mobile, including the podium showcase, Uma Performance and Surface & Distance Performance.",
      "Improved Uma Database toolbar and controls on smaller screens.",
      "Improved Profile Selection layout and visibility of Import and Export actions on mobile.",
      "Improved AutoRun Timer and Settings for mobile use.",
      "Improved overall page contrast and background readability.",
    ],
    fixed: [
      "Fixed multiple mobile overflow and spacing issues.",
      "Fixed background jumping while scrolling on mobile devices.",
      "Fixed elements becoming difficult to read against the page background.",
    ],
  },
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
type IconName = "record" | "route" | "activity" | "trophy" | "flag" | "history"

const paths: Record<IconName, string> = {
  record: "M5 3h14v18H5V3Zm4 4h6M9 11h6M9 15h3",
  route: "M4 6a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm12 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM8 6h8a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h8",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  trophy: "M8 3h8v5a4 4 0 0 1-8 0V3Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 1v6m-4 3h8m-7-3h6v3H9v-3Z",
  flag: "M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0",
  history: "M3 4v5h5M3 9a9 9 0 1 1 0 6m9-8v5l3 2",
}

export default function UmaStatisticsIcon({ name }: { name: IconName }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  )
}

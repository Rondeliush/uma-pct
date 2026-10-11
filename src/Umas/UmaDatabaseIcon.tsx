import type { SVGProps } from "react"

type IconName =
  | "book"
  | "plus"
  | "search"
  | "image"
  | "grid"
  | "list"
  | "chevron"
  | "back"
  | "more"
  | "archive"
  | "restore"
  | "delete"
  | "check"
  | "close"

const paths: Record<IconName, string> = {
  book: "M12 5C8 2 4 3 2 4v15c3-1 7-1 10 1m0-15c4-3 8-2 10-1v15c-3-1-7-1-10 1V5Z",
  plus: "M12 5v14M5 12h14",
  search: "M21 21l-4.5-4.5M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z",
  image: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm4 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm12 7-5-5L5 21",
  grid: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z",
  list: "M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1",
  chevron: "m9 5 7 7-7 7",
  back: "m14 5-7 7 7 7",
  more: "M12 5h.01M12 12h.01M12 19h.01",
  archive: "M3 4h18v4H3V4Zm2 4v12h14V8M10 12h4",
  restore: "M3 4h18v4H3V4Zm2 4v12h14V8m-10 7 3-3 3 3m-3-3v6",
  delete: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12M18 6 6 18",
}

export default function UmaDatabaseIcon({
  name,
  className = "h-4 w-4",
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "more" ? 3 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  )
}

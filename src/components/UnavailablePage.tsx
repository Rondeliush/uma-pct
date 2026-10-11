import { useEffect, useRef } from "react"
import { navigateHomeRoute } from "../Statistics/statisticsRoute"
import "./UnavailablePage.css"

export default function UnavailablePage() {
  const heading = useRef<HTMLHeadingElement>(null)
  const goHome = () => navigateHomeRoute(import.meta.env.BASE_URL)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
    heading.current?.focus({ preventScroll: true })
  }, [])

  return (
    <main className="unavailable-page" lang="en" aria-labelledby="unavailable-page-title" style={{ backgroundImage: `url("${import.meta.env.BASE_URL}missed_background.png")` }}>
      <div className="absolute inset-0 bg-[#030811]/70" aria-hidden="true" />
      <div className="relative w-full max-w-xl text-center">
        <h1 ref={heading} id="unavailable-page-title" tabIndex={-1} className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Looks like we're on the wrong train.</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-200 sm:text-base">This page doesn't exist or is unavailable.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className="unavailable-page-action" onClick={() => window.history.length > 1 ? window.history.back() : goHome()}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m14 6-6 6 6 6M8 12h12" /></svg>
            Go Back
          </button>
          <button type="button" className="unavailable-page-action" onClick={goHome}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m3 11 9-8 9 8M5 10v10h14V10M9 20v-6h6v6" /></svg>
            Home
          </button>
        </div>
      </div>
    </main>
  )
}

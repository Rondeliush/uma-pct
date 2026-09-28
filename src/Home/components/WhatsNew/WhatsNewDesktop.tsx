import type { WhatsNewProps } from "./WhatsNew"

function WhatsNewDesktop({
  version,
  onOpenChangelog,
  hasNewChangelog,
}: WhatsNewProps) {
  return (
    <section
      data-guide="home-whats-new"
      className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-gray-950/75 shadow-xl"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-sky-500/[0.08] blur-3xl" />

      <div className="relative flex items-center justify-between gap-6 px-5 py-4">

        <div>
          <div className="flex items-center gap-2">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300/60">
            What's New
          </div>

          {hasNewChangelog && (
            <span className="rounded-md bg-emerald-400 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-950">
              New
            </span>
          )}
        </div>

          <div className="mt-1 text-lg font-black text-white">
            Umamusume Personal Competitive Tracker v{version}
          </div>

          <div className="mt-1 text-sm text-blue-100/40">
            View the latest changes and improvements to Umamusume Personal Competitive Tracker.
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenChangelog}
          className="shrink-0 rounded-lg border border-sky-300/20 bg-sky-400/[0.08] px-4 py-2 text-xs font-black text-sky-200 transition hover:border-sky-300/35 hover:bg-sky-400/[0.14]"
        >
          View Changelog →
        </button>

      </div>
    </section>
  )
}

export default WhatsNewDesktop
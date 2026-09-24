import { changelog } from "../data/changelogData"

function ChangelogPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="mt-2 text-3xl font-black text-white">
          Changelog
        </h1>

        <p className="mt-2 text-sm text-blue-100/50">
          See what's new, improved, and fixed in UmaPCT.
        </p>
      </div>

      {/* VERSIONS */}
      <div className="space-y-6">
        {changelog.map((entry, index) => (
          <div
            key={entry.version}
            className="overflow-hidden rounded-2xl border border-blue-900/60 bg-gray-950/70"
          >
            {/* VERSION HEADER */}
            <div className="flex items-center justify-between border-b border-blue-950/80 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="text-xl font-black text-white">
                  v{entry.version}
                </div>

                {index === 0 && (
                  <div className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-sky-300">
                    Latest
                  </div>
                )}
              </div>

              <div className="text-xs font-bold text-blue-100/35">
                {entry.date}
              </div>
            </div>

            {/* CHANGES */}
            <div className="space-y-6 p-6">
              {entry.new && entry.new.length > 0 && (
                <section>
                  <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-400">
                    New
                  </div>

                  <div className="space-y-2">
                    {entry.new.map((change) => (
                      <div
                        key={change}
                        className="flex gap-3 text-sm text-gray-300"
                      >
                        <span className="text-emerald-400">+</span>
                        <span>{change}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {entry.improved && entry.improved.length > 0 && (
                <section>
                  <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-sky-400">
                    Improved
                  </div>

                  <div className="space-y-2">
                    {entry.improved.map((change) => (
                      <div
                        key={change}
                        className="flex gap-3 text-sm text-gray-300"
                      >
                        <span className="text-sky-400">↑</span>
                        <span>{change}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {entry.fixed && entry.fixed.length > 0 && (
                <section>
                  <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-amber-400">
                    Fixed
                  </div>

                  <div className="space-y-2">
                    {entry.fixed.map((change) => (
                      <div
                        key={change}
                        className="flex gap-3 text-sm text-gray-300"
                      >
                        <span className="text-amber-400">✓</span>
                        <span>{change}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ChangelogPage
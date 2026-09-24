function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-black text-white">
          About
        </h1>

        <p className="mt-2 text-gray-400">
          Umamusume Personal Competitive Tracker
        </p>
         <div>
        <p className="mt-2 text-sm leading-6 text-blue-100/55">
            Created by rondel
        </p>
        </div>
      </div>

     

      <section className="rounded-3xl border border-sky-300/15 bg-[#07111f]/95 p-6 shadow-2xl">
        <div className="space-y-5">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em] text-sky-300/60">
              Application
            </div>

            <div className="mt-2 text-xl font-black text-white">
              Umamusume Personal Competitive Tracker
            </div>

            <div className="mt-1 text-sm text-blue-100/45">
              Version 0.1.0
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          <div>
            <div className="text-sm font-black text-white">
              Unofficial fan-made application
            </div>

            <p className="mt-2 text-sm leading-6 text-blue-100/55">
              This project is an unofficial fan-made application
              for Umamusume: Pretty Derby.
            </p>

            <p className="mt-3 text-sm leading-6 text-blue-100/55">
              This project is not affiliated with, endorsed by,
              or sponsored by Cygames.
            </p>
          </div>

          <div className="h-px bg-white/[0.06]" />

          <div>
            <div className="text-sm font-black text-white">
              Trademarks and game assets
            </div>

            <p className="mt-2 text-sm leading-6 text-blue-100/55">
              Umamusume: Pretty Derby and related character names,
              trademarks, images, audio, and other game assets are
              the property of Cygames, Inc. and their respective
              rights holders.
            </p>
          </div>

          <div className="h-px bg-white/[0.06]" />

          <div>
            <div className="text-sm font-black text-white">
              Privacy & Data
            </div>

            <p className="mt-2 text-sm leading-6 text-blue-100/55">
              App does not collect or store your tracker data
              on external servers.
            </p>

            <p className="mt-3 text-sm leading-6 text-blue-100/55">
              All tracker data is stored locally on your computer and
              remains under your control.
            </p>
          </div>

          <div className="h-px bg-white/[0.06]" />

          <div>
            <div className="text-sm font-black text-white">
              Project status
            </div>

            <p className="mt-2 text-sm leading-6 text-blue-100/55">
              This application is provided as a non-commercial
              fan project.
            </p>
          </div>
        </div>
        
      </section>
    </div>
  )
}

export default AboutPage
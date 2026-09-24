type WelcomePageProps = {
  onCreateTracker: () => void
  onImportBackup: () => void
}

function WelcomePage({
  onCreateTracker,
  onImportBackup,
}: WelcomePageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030811] px-6">
      <div className="w-full max-w-3xl">
        <div className="mb-10 text-center">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-sky-300/60">
            Umamusume Personal Competitive Tracker
          </div>

          <h1 className="mt-3 text-4xl font-black text-white">
            Welcome, Trainer
          </h1>

          <p className="mt-3 text-sm leading-6 text-blue-100/50">
            Set up your competitive tracker to get started.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={onCreateTracker}
            className="group rounded-3xl border border-sky-300/15 bg-[#07111f]/95 p-7 text-left shadow-2xl transition hover:border-sky-300/30 hover:bg-[#091728]"
          >
            <div className="text-xl font-black text-white">
              New Competitive Tracker
            </div>

            <p className="mt-3 text-sm leading-6 text-blue-100/50">
              Create a new profile and start your competitive tracker
              from scratch.
            </p>

            <div className="mt-6 text-sm font-black text-sky-300/70 transition group-hover:text-sky-200">
              Create Profile →
            </div>
          </button>

          <button
            type="button"
            onClick={onImportBackup}
            className="group rounded-3xl border border-violet-300/15 bg-[#07111f]/95 p-7 text-left shadow-2xl transition hover:border-violet-300/30 hover:bg-[#091728]"
          >
            <div className="text-xl font-black text-white">
              Import Existing Backup
            </div>

            <p className="mt-3 text-sm leading-6 text-blue-100/50">
              Restore your tracker data from a previously exported
              backup.
            </p>

            <div className="mt-6 text-sm font-black text-violet-300/70 transition group-hover:text-violet-200">
              Import Backup →
            </div>
          </button>
        </div>

        <p className="mt-7 text-center text-xs leading-5 text-blue-100/30">
          Your tracker data is stored locally on your computer.
        </p>
      </div>
    </div>
  )
}

export default WelcomePage
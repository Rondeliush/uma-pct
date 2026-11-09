import "./WelcomePage.css"

type WelcomePageProps = {
  onCreateTracker: () => void
  onImportBackup: () => void
}

function WelcomePage({
  onCreateTracker,
  onImportBackup,
}: WelcomePageProps) {
  return (
    <main className="profile-welcome">
      <div className="welcome-content">
        <div className="welcome-heading">
          <div className="welcome-brand">
            <img
              className="welcome-brand-logo"
              src={`${import.meta.env.BASE_URL}pwa-2-192x192.png`}
              alt=""
              width="96"
              height="96"
            />
            <div className="welcome-brand-copy">
              <div className="welcome-brand-label">UMAMUSUME</div>
              <div className="welcome-brand-title">Personal Competitive Tracker</div>
            </div>
          </div>

          <h1>
            Welcome, Trainer
          </h1>

          <p>
            Set up your competitive tracker to get started.
          </p>
        </div>

        <div className="welcome-actions">
          <button
            type="button"
            onClick={onCreateTracker}
            className="welcome-action"
          >
            <div className="welcome-action-title">
              New Competitive Tracker
            </div>

            <p>
              Create a new profile and start your competitive tracker
              from scratch.
            </p>

            <div className="welcome-action-label">
              Create Profile →
            </div>
          </button>

          <button
            type="button"
            onClick={onImportBackup}
            className="welcome-action welcome-action-import"
          >
            <div className="welcome-action-title">
              Import Existing Backup
            </div>

            <p>
              Restore your tracker data from a previously exported
              backup.
            </p>

            <div className="welcome-action-label">
              Import Backup →
            </div>
          </button>
        </div>

        <p className="welcome-storage-note">
          Your tracker data is stored locally on your computer or mobile.
        </p>
      </div>
    </main>
  )
}

export default WelcomePage

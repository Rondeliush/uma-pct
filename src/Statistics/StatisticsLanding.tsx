import "./StatisticsLanding.css"

type StatisticsLandingProps = {
  onSelect: (section: "events" | "uma" | "tracks") => void
}

function ChoiceArrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </svg>
  )
}

function StatisticsLanding({ onSelect }: StatisticsLandingProps) {
  const assetBase = `${import.meta.env.BASE_URL}Statistic/`

  return (
    <main className="statistics-landing" aria-labelledby="statistics-title">
      <div className="statistics-landing-heading">
        <h1 id="statistics-title">Statistics</h1>
        <p>Choose what you want to analyze.</p>
      </div>

      <div className="statistics-choices">
        <button
          type="button"
          className="statistics-choice statistics-choice-events"
          onClick={() => onSelect("events")}
          aria-label="View Event Statistics"
          aria-describedby="statistics-events-description"
        >
          <img
            className="statistics-choice-background"
            src={`${assetBase}statistic_event_background_2.png`}
            alt=""
            draggable={false}
          />
          <span className="statistics-choice-shade" aria-hidden="true" />
          <span className="statistics-choice-content">
            <span className="statistics-choice-title">EVENTS</span>
            <span
              id="statistics-events-description"
              className="statistics-choice-description"
            >
              View your competitive record across events.
            </span>
            <span className="statistics-choice-cta">
              View Event Statistics
              <ChoiceArrow />
            </span>
          </span>
        </button>

        <button
          type="button"
          className="statistics-choice statistics-choice-uma"
          onClick={() => onSelect("uma")}
          aria-label="View Uma Statistics"
          aria-describedby="statistics-uma-description"
        >
          <img
            className="statistics-choice-background"
            src={`${assetBase}statistic_uma_background.png`}
            alt=""
            draggable={false}
          />
          <span className="statistics-choice-shade" aria-hidden="true" />
          <img
            className="statistics-choice-character"
            src={`${assetBase}symboli-rudolf-racing.png`}
            alt=""
            draggable={false}
          />
          <span className="statistics-choice-content">
            <span className="statistics-choice-title">UMAS</span>
            <span
              id="statistics-uma-description"
              className="statistics-choice-description"
            >
              Explore the competitive history of each Umas.
            </span>
            <span className="statistics-choice-cta">
              View Uma Statistics
              <ChoiceArrow />
            </span>
          </span>
        </button>

        <button
          type="button"
          className="statistics-choice statistics-choice-tracks"
          onClick={() => onSelect("tracks")}
          aria-label="View Track Statistics"
          aria-describedby="statistics-tracks-description"
        >
          <img
            className="statistics-choice-background"
            src={`${assetBase}statistic_track_background.png`}
            alt=""
            draggable={false}
          />
          <span className="statistics-choice-shade" aria-hidden="true" />
          <span className="statistics-choice-content">
            <span className="statistics-choice-title">TRACKS</span>
            <span
              id="statistics-tracks-description"
              className="statistics-choice-description"
            >
              Explore your performance across different racetracks.
            </span>
            <span className="statistics-choice-cta">
              View Track Statistics
              <ChoiceArrow />
            </span>
          </span>
        </button>

        <svg
          className="statistics-choice-divider statistics-choice-divider-events"
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <line
            x1="100"
            y1="0"
            x2="0"
            y2="100"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <svg
          className="statistics-choice-divider statistics-choice-divider-tracks"
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <line
            x1="100"
            y1="0"
            x2="0"
            y2="100"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </main>
  )
}

export default StatisticsLanding

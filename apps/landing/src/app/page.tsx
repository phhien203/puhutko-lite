import { DownloadTabs } from "./download-tabs"

const releasesUrl = "https://github.com/phhien203/puhutko-lite/releases"
const repositoryUrl = "https://github.com/phhien203/puhutko-lite"

const valueProps = [
  {
    title: "Fast keyboard-driven lookups",
    points: [
      "Search and inspect Finnish words without leaving your terminal flow",
      "Keep momentum while studying with instant keyboard-first navigation",
    ],
  },
  {
    title: "Learning feedback and pattern visibility",
    points: [
      "Surface inflections and recurring structures at a glance",
      "Recognize word patterns faster through consistent visual feedback",
    ],
  },
  {
    title: "Word variation coverage",
    points: [
      "Explore multiple word forms and related variants in one compact view",
      "Review Finnish cases and KPT changes side by side",
    ],
  },
  {
    title: "Tags and example support",
    points: [
      "Attach personal context to words with tags",
      "Store your own practical example sentences for quick review",
    ],
  },
]

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-content">
          <div className="hero-copy">
            <p className="lead">
              <span className="lead-primary">
                Interactive Finnish dictionary with command line interface
              </span>
              <br />
              Learn Finnish like a hacker
            </p>
          </div>
          <div className="video-shell hero-video">
            <div className="video-placeholder">
              <p className="video-label">Demo video placeholder</p>
              <p className="video-help">Drop your video embed or player component here later.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Why do you love it</h2>
        <div className="grid">
          {valueProps.map((item) => (
            <article className="card" key={item.title}>
              <div className="feature-copy">
                <h3>{item.title}</h3>
                <ul className="reason-list">
                  {item.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="install" className="section">
        <h2>Install</h2>
        <DownloadTabs />
      </section>

      <footer className="footer">
        <a href={releasesUrl} target="_blank" rel="noreferrer">
          Releases
        </a>
        <a href={repositoryUrl} target="_blank" rel="noreferrer">
          GitHub Repository
        </a>
      </footer>
    </main>
  )
}

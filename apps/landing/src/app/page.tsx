import { DownloadTabs } from "./download-tabs"

const releasesUrl = "https://github.com/phhien203/puhutko-lite/releases"
const repositoryUrl = "https://github.com/phhien203/puhutko-lite"

const valueProps = [
  {
    title: "Fast keyboard-driven lookups",
    description: "Search and inspect Finnish words without leaving your terminal flow",
    demoHint: "Show a quick lookup flow demo here."
  },
  {
    title: "Learning feedback and pattern visibility",
    description: "Surface inflections and recurring structures that help you recognize patterns faster",
    demoHint: "Show inflection and pattern feedback in this demo."
  },
  {
    title: "Word variation coverage",
    description: "Explore multiple word forms and related variants in one compact interface: Finnish cases, KPT gradations",
    demoHint: "Show switching between related word variants."
  },
  {
    title: "Notes, tags, and example support",
    description: "Attach your own context to words with notes, tags, and practical example sentences",
    demoHint: "Show notes/tags/example editing in this slot."
  }
]

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <div className="hero-content">
          <div>
            <h1>puhutko-lite</h1>
            <p className="eyebrow">Terminal-first Finnish learning</p>
            <p className="lead">
              An interactive terminal dictionary that helps you look up Finnish words quickly, understand their
              forms, and keep your own study context close to every entry.
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
          {valueProps.map((item, index) => (
            <article className={`card ${index % 2 === 1 ? "is-reversed" : ""}`} key={item.title}>
              <div className="feature-copy">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <div className="video-shell feature-video">
                <div className="video-placeholder">
                  <p className="video-label">Feature demo placeholder</p>
                  <p className="video-help">{item.demoHint}</p>
                </div>
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

import type { ArtBoardStats } from "@/services/stats";

type Metric = {
  label: string;
  tone: "blue" | "red" | "yellow";
  value: number;
};

export function HomeImpactStatsSection({ stats }: { stats: ArtBoardStats }) {
  const metrics: Metric[] = [
    { label: "Objavljenih umjetnika", tone: "blue", value: stats.artists },
    { label: "Predstavljenih radova", tone: "red", value: stats.artworks },
    { label: "Umjetničkih disciplina", tone: "yellow", value: stats.disciplines },
  ];

  return (
    <section className="home-impact-stats" id="artboard-statistika">
      <span className="home-impact-stats__stars" aria-hidden="true" />

      <div className="home-impact-stats__inner">
        <div className="home-impact-stats__panel">
          {metrics.map((metric) => (
            <article className="home-impact-stats__metric" key={metric.label}>
              <strong className={`home-impact-stats__value home-impact-stats__value--${metric.tone}`}>
                {metric.value}+
              </strong>
              <p>{metric.label}</p>
            </article>
          ))}

          <aside className="home-impact-stats__support">
            <p>Podržano od strane</p>
            <strong>Ministarstva kulture i medija Crne Gore</strong>
            <strong>Sekretarijata za kulturu</strong>
          </aside>
        </div>
      </div>
    </section>
  );
}

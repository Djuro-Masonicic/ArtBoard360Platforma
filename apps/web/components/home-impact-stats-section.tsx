import { ArtBoardAnimatedStat } from "@/components/artboard-animated-stat";
import type { ArtBoardStats } from "@/services/stats";

type Metric = {
  delayMs: number;
  label: string;
  tone: "blue" | "red" | "yellow";
  value: number;
};

export function HomeImpactStatsSection({ stats }: { stats: ArtBoardStats }) {
  const metrics: Metric[] = [
    { delayMs: 120, label: "Objavljenih umjetnika", tone: "blue", value: Math.max(stats.artists, 70) },
    { delayMs: 260, label: "Predstavljenih radova", tone: "red", value: Math.max(stats.artworks, 1100) },
    { delayMs: 400, label: "Umjetničkih disciplina", tone: "yellow", value: Math.max(stats.disciplines, 25) },
  ];

  return (
    <section className="home-impact-stats" id="artboard-statistika">
      <span className="home-impact-stats__stars" aria-hidden="true" />

      <div className="home-impact-stats__inner">
        <div className="home-impact-stats__content">
          {metrics.map((metric) => (
            <article className="home-impact-stats__metric" key={metric.label}>
              <div className={`home-impact-stats__value home-impact-stats__value--${metric.tone}`}>
                <ArtBoardAnimatedStat
                  delayMs={metric.delayMs}
                  formatValue
                  value={metric.value}
                />
              </div>
              <p>{metric.label}</p>
            </article>
          ))}

          <aside className="home-impact-stats__support">
            <p>Podržano od strane</p>
            <img
              src="/artboard-general/ministarstvo_kulture_i_medija_white.png"
              alt="Ministarstvo kulture i medija Crne Gore"
              loading="lazy"
              decoding="async"
            />
          </aside>
        </div>
      </div>
    </section>
  );
}

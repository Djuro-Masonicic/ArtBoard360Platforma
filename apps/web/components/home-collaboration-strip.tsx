const collaboratorTypes = [
  "Institucije",
  "Umjetnici",
  "Kreativci",
  "Kompanije",
  "Kulturne organizacije",
];

export function HomeCollaborationStrip() {
  return (
    <section className="home-collaboration-strip" id="saradnja" aria-labelledby="collaboration-heading">
      <div className="home-collaboration-strip__intro">
        <p>
          <span aria-hidden="true" />
          Sa kim sarađujemo
        </p>
        <h2 id="collaboration-heading">
          Radimo sa pojedincima i organizacijama
          <br />
          koje imaju ideju vrijednu razvoja.
        </h2>
      </div>

      <div className="home-collaboration-strip__marquee">
        <div className="home-collaboration-strip__track">
          {[0, 1].map((groupIndex) => (
            <div
              aria-hidden={groupIndex === 1 ? "true" : undefined}
              className="home-collaboration-strip__group"
              key={groupIndex}
            >
              {collaboratorTypes.map((type) => (
                <span key={`${groupIndex}-${type}`}>
                  <i aria-hidden="true">•</i>
                  {type}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

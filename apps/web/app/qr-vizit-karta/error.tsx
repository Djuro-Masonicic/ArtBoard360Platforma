"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div
      role="alert"
      style={{
        padding: 40,
        minHeight: "100vh",
        background: "#f7f7f9",
        color: "#111318",
      }}
    >
      <h1>QR vizit karta trenutno nije dostupna.</h1>
      <p>Pokušaj ponovo. Sačuvani draft i verzije ostaju na tvom nalogu.</p>
      <button onClick={reset}>Pokušaj ponovo</button>{" "}
      <a href="/artist/dashboard">Nazad na nalog</a>
    </div>
  );
}

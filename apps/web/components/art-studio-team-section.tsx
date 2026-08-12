const teamMembers = [
  {
    description:
      "Osnivačica Art Studio 360 i osoba koja vodi razvoj ArtBoard platforme, kreativni pravac i komunikaciju sa umjetnicima.",
    initials: "IM",
    name: "Ivona Medenica",
    role: "Osnivačica i kreativno vodjstvo",
  },
  {
    description:
      "Saradnik na razvoju digitalne platforme, produkciji funkcionalnosti i tehničkoj infrastrukturi projekta.",
    initials: "Đ",
    name: "Đuro",
    role: "Razvoj platforme",
  },
  {
    description:
      "Saradnik na razvoju projekta, digitalnim procesima i podršci pri izgradnji ArtBoard ekosistema.",
    initials: "N",
    name: "Nikola",
    role: "Projektna i digitalna podrška",
  },
];

export function ArtStudioTeamSection() {
  return (
    <section id="o-studiju" className="bg-[#f8fbff] px-5 py-16 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-[1280px] gap-8 rounded-[42px] border border-[#dde6f2] bg-white p-7 shadow-[0_22px_64px_rgba(37,51,73,0.07)] sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:p-12">
        <div>
          <p className="text-[13px] font-bold uppercase tracking-[0.28em] text-[#8a94a5]">O studiju i timu</p>
          <h2 className="mt-4 text-[2.5rem] font-bold leading-[0.98] tracking-[-0.05em] text-[#2f3138] sm:text-[3.5rem]">
            Art Studio 360 povezuje dizajn, produkciju i digitalne alate<span className="text-[#dc1735]">.</span>
          </h2>
          <p className="mt-6 max-w-[620px] text-[19px] font-medium leading-[1.4] text-[#566174]">
            Studio nastaje kao praktičan kreativni prostor: dio je usmjeren na usluge i projekte, a dio na
            razvoj ArtBoard platforme kao dugoročnog digitalnog proizvoda za umjetničku scenu.
          </p>
        </div>

        <div className="grid gap-4">
          {teamMembers.map((member) => (
            <article
              className="grid gap-4 rounded-[26px] border border-[#e4eaf3] bg-[#f8fbff] p-5 sm:grid-cols-[72px_1fr]"
              key={member.name}
            >
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white text-[20px] font-bold text-[#182fc7] shadow-[0_12px_30px_rgba(37,51,73,0.08)]">
                {member.initials}
              </div>
              <div>
                <h3 className="text-[1.3rem] font-bold text-[#252933]">{member.name}</h3>
                <p className="mt-1 text-[13px] font-bold uppercase tracking-[0.18em] text-[#8a94a5]">{member.role}</p>
                <p className="mt-3 text-[16px] font-medium leading-[1.35] text-[#566174]">{member.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

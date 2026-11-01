import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(connectionString).hostname)) {
  throw new Error("Demo opportunities can only be seeded into the local development database.");
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const now = new Date();
const daysFromNow = (days: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days, 12));
const region = ["ME", "RS", "HR", "BA", "MK", "SI", "XK", "AL"];
const examples: Prisma.OpportunityCreateInput[] = [
  {
    slug: "demo-konkurs-mladi-vizuelni-umjetnici-2026",
    title: "Godišnji konkurs za mlade vizuelne umjetnike 2026",
    type: "OPEN_CALL", organization: "Galerija Kvadrat", organizerType: "INSTITUTION",
    countryCode: "ME", city: "Podgorica", location: "Podgorica, Crna Gora", workMode: "ONSITE",
    disciplines: ["Slikarstvo", "Crtež", "Grafika", "Skulptura"],
    summary: "Konkurs za mlade vizuelne umjetnike iz Crne Gore, uz nagradu i samostalnu izložbu.",
    description: "Primjer konkursa za umjetnike do 35 godina iz Crne Gore. Pobjednik dobija novčanu nagradu i samostalnu izložbu, a pet finalista učestvuje u zajedničkoj izložbi.",
    conditions: "Namijenjeno umjetnicima do 35 godina iz Crne Gore. Potrebno je dostaviti biografiju, portfolio i prijedlog izložbe.",
    compensationKind: "PRIZE", compensationAmount: 1500, compensationCurrency: "EUR",
    compensation: "Nagrada i samostalna izložba u martu 2027.", applicationFee: 0,
    maxAge: 35, eligibleCountries: ["ME"], applicationLanguages: ["ME", "EN"],
    requiredDocuments: ["cv", "portfolio", "bio", "proposal"], coveredCosts: ["Produkcija izložbe", "Katalog"],
    deadlineAt: daysFromNow(2), createdAt: daysFromNow(-19), isPaid: true, isFeatured: true,
    coverImageUrl: "/artstudio-home/5a0e3f10-0402-4c1e-9a11-a5360a5e0402.jpg",
  },
  {
    slug: "demo-konkurs-plakat-sajam-knjiga",
    title: "Konkurs za plakat Međunarodnog sajma knjiga",
    type: "OPEN_CALL", organization: "Sajam knjiga Podgorica", organizerType: "INSTITUTION",
    countryCode: "ME", city: "Online", location: "Online, Crna Gora", workMode: "REMOTE",
    disciplines: ["Grafički dizajn", "Ilustracija"],
    summary: "Idejno rješenje plakata na temu „Knjiga kao most“.",
    description: "Primjer konkursa za rješenje plakata na temu „Knjiga kao most“. Format B1, predaja u PDF-u. Pobjedničko rješenje koristi se za potrebe sajma.",
    conditions: "Bez navedene starosne granice. Prijave su otvorene za umjetnike iz regiona.",
    compensationKind: "PRIZE", compensationAmount: 800, compensationCurrency: "EUR",
    compensation: "Pobjedničko rješenje, plus štampa u 2.000 primjeraka", applicationFee: 0,
    eligibleCountries: region, applicationLanguages: ["ME", "EN"], requiredDocuments: ["sketch", "bio"],
    deadlineAt: daysFromNow(18), createdAt: daysFromNow(-1), isPaid: true,
    coverImageUrl: "/artstudio-home/5a0e3f10-0102-4c1e-9a11-a5360a5e0102.jpg",
  },
  {
    slug: "demo-rezidencija-luka-atelje-uz-more",
    title: "Rezidencija „Luka“: četiri sedmice u ateljeu uz more",
    type: "RESIDENCY", organization: "Udruga Molo", organizerType: "NGO",
    countryCode: "HR", city: "Rijeka", location: "Rijeka, Hrvatska", workMode: "ONSITE",
    disciplines: ["Slikarstvo", "Instalacija", "Mješoviti mediji", "Fotografija"],
    summary: "Program za dva umjetnika iz regiona, uz stipendiju, smještaj i prostor za rad.",
    description: "Primjer četvorosedmične rezidencije uz more. Program je namijenjen umjetnicima koji žele da razviju novi projekat i povežu se s lokalnom zajednicom. Završava se otvorenim ateljeom i razgovorom s publikom.",
    conditions: "Umjetnici iz regiona. Prednost imaju projekti koji istražuju odnos grada, mora i zajednice.",
    compensationKind: "STIPEND", compensationAmount: 1200, compensationCurrency: "EUR",
    compensation: "Stipendija za četiri sedmice boravka", applicationFee: 0,
    eligibleCountries: region, applicationLanguages: ["HR", "EN"], requiredDocuments: ["cv", "portfolio", "proposal"],
    coveredCosts: ["Smještaj", "Atelje", "Materijal za rad"], deadlineAt: daysFromNow(20), createdAt: daysFromNow(-9), isPaid: true, isFeatured: true,
    coverImageUrl: "/artboard-opportunities-optimized.webp",
  },
];

async function main() {
  await prisma.$transaction(async (tx) => {
    for (const example of examples) {
      const existing = await tx.opportunity.findUnique({ where: { slug: example.slug } });
      if (existing && !existing.isDemo) throw new Error("A non-demo opportunity already uses this slug.");
      if (existing) {
        await tx.opportunity.update({ where: { id: existing.id }, data: { coverImageUrl: example.coverImageUrl ?? null } });
        continue;
      }
      await tx.opportunity.create({ data: { ...example, isDemo: true, submissionStatus: "APPROVED", isDraft: false, applicationMethod: "EMAIL", applyEmail: "demo@example.com" } });
    }
  });
  console.log("Three labeled demo opportunities are available. Existing opportunities were preserved.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

import type { Metadata } from "next";

import { ServicesHeroCollage } from "@/components/services-hero-collage";
import { ServicesJugglingBalls } from "@/components/services-juggling-balls";
import { ServicesTestimonialRail } from "@/components/services-testimonial-rail";
import { SiteCtaButton } from "@/components/site-cta-button";

import styles from "./services-page.module.css";

export const metadata: Metadata = {
  title: "Usluge | Art Studio 360",
  description:
    "Dizajn, fotografija, video, digitalni marketing i profesionalne usluge za umjetnike.",
};

const assetRoot = "https://cdn.prod.website-files.com/681b5dac4415aa941af374fe";

const heroImages = [
  `${assetRoot}/687cc9e8daebd9a75c7256a0_img--services-hero-01.webp`,
  `${assetRoot}/687cc9e86da8dd5b2a7c9446_img--services-hero-05.webp`,
  `${assetRoot}/687cc9e841cc245f5ce1aaee_img--services-hero-03.webp`,
  `${assetRoot}/68ac86c07fd60116019b3eba_c4fcf2e315ab2b40a93bcf8434f21ed6_snimanje.webp`,
  `${assetRoot}/68ac88dfdb3de7a645c8c971_06e52f295e18bb250ab0f4625e358c4e_04%20video%20edit%201.webp`,
  `${assetRoot}/687cc9e8e93127d29cda37b3_img--services-hero-02.webp`,
  `${assetRoot}/687cc9e82b208d4435b3c6ca_0168295c48523e07bec7930cd36691ef_img--services-hero-09.webp`,
  `${assetRoot}/68ac87edeab5cd27ab9c23b2_386f498dd40bb0d746329bac7e608734_Branding%2C%20Dizajn%20%282%29%201.webp`,
  `${assetRoot}/68ac86c0503ee2cb8b45c150_30647fcaa8b2a8367a314d5e5aa53ad2_graficki%20dizajn%201.webp`,
];

const services = [
  {
    title: "Fotografija",
    description:
      "Profesionalne fotografije prilagođene različitim potrebama, od promotivnih kampanja do umjetničkih portreta, pružajući posebnu pažnju detaljima i estetici.",
    icon: `${assetRoot}/6845b0a98a93f372dc9faf82_icon--services-photography.png`,
  },
  {
    title: "Video",
    description:
      "Produkcija i montaža videa koji prenose snažnu poruku, uključujući promotivne videe, dokumentarne formate i kratke reklame.",
    icon: `${assetRoot}/6845b0a95b87bb94b76505dd_icon--services-video.png`,
  },
  {
    title: "Grafički dizajn",
    description:
      "Kreiramo logotipe, (re)branding, ilustracije, kao i promotivni dizajn za tvoje projekte. Dizajn prilagođavamo tako da najbolje odrazi tvoj identitet.",
    icon: `${assetRoot}/6845b0a9153a9f313787f9d6_icon--services-design.png`,
  },
  {
    title: "Digitalni marketing",
    description:
      "Osmišljavamo strategije i idejna rješenja za promociju na društvenim mrežama. Pružamo podršku kroz kreiranje vizuala, kampanja i sadržaja koji dopiru do prave publike.",
    icon: `${assetRoot}/6845b0a95173b0a642c351e9_icon--services-marketing.png`,
  },
  {
    title: "Usluge za umjetnike",
    description:
      "Kreiramo umjetnički portfolio u PDF ili online formi, profesionalno fotografišemo tvoje radove i dajemo savjete za unapređenje njihove prezentacije.",
    icon: `${assetRoot}/68b420f57e12c0d5a43887e0_icon--services-portfolio-white.png`,
  },
];

const portfolioImages = [
  { src: `${assetRoot}/68cd97ded342a415469018a2_Posteri%20bijela%20pozadina.jpg`, alt: "Ilustrovani posteri" },
  { src: `${assetRoot}/68cd99d9de2f761450019f76_compressed_8325870%20copy.jpg`, alt: "Vizuelni identitet u enterijeru" },
  { src: `${assetRoot}/68cd97dde8f1a160138d7f0f_Magazin.jpg`, alt: "Dizajn magazina" },
  { src: `${assetRoot}/68cd97dd70c726c01e92fa49_Majica%202.jpg`, alt: "Dizajn majice" },
  { src: `${assetRoot}/68cd96e6de09f2258b4b2e86_compressed_New%20Cover.jpg`, alt: "Brend aplikacije" },
  { src: `${assetRoot}/68cd96e6bd78268dd268e150_compressed_3aa42524-604f-41a4-8ca7-74aa5aa20dd3%20copy.jpg`, alt: "Dizajn ambalaže" },
  { src: `${assetRoot}/68cd96e6fd4c2925933f075d_poster14.jpg`, alt: "Kreativni poster" },
  { src: `${assetRoot}/68cd97e4eb35a203b2210e23_osamu%20dazai%20no%20longer%20human%20book%20(1).jpg`, alt: "Dizajn knjige" },
];

export default function UslugePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Inovativna i kreativna rješenja
            <span>za tvoj brend.</span>
          </h1>
          <p className={styles.heroText}>
            Nudimo širok spektar usluga iz oblasti dizajna, fotografije i videa prilagođenih tvojim
            potrebama. Uz bogato iskustvo i umjetničku strast, kreiramo rješenja koja autentično
            predstavljaju tvoju viziju.
          </p>

          <div className={styles.heroActions}>
            <SiteCtaButton asLink href="https://calendly.com/artstudio360" label="Provjeri dostupnost" />
            <a className={styles.textLink} href="https://www.behance.net/artstudio360" rel="noreferrer" target="_blank">
              <span aria-hidden="true" className={styles.textLinkMark} />
              Vidi Behance portfolio
            </a>
          </div>
        </div>

        <ServicesHeroCollage images={heroImages} />
      </section>

      <section className={styles.experience}>
        <ServicesJugglingBalls />

        <div className={styles.experienceCopy}>
          <h2>
            Kreativnost podržana
            <strong>dugogodišnjim iskustvom.</strong>
          </h2>
          <p>
            Sa dugogodišnjim iskustvom u umjetničkom i kreativnom radu, pomažemo ti da svoj projekat
            i/ili brend podigneš na viši nivo. Posvećene smo osmišljavanju unikatnih rješenja koja
            inspirišu i komuniciraju tvoju priču.
          </p>
        </div>

        <img
          alt="Kreativna direktorica Art Studija 360"
          className={styles.experienceImage}
          src={`${assetRoot}/6873ab3cdd7dd8df43ffd375_16c65481630ebd7140ccff42d992ca67_services--juggling.webp`}
        />
      </section>

      <section className={styles.servicesSection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.servicesHeading}>
            Nudimo
            <strong>
              mnogobrojne usluge<span className={styles.servicesPeriod}>.</span>
            </strong>
          </h2>
        </div>

        <div className={styles.servicesList}>
          {services.map((service) => (
            <article className={styles.serviceRow} key={service.title}>
              <div className={styles.serviceRowInner}>
                <div className={styles.serviceIconWrap}>
                  <img alt="" aria-hidden="true" src={service.icon} />
                </div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.portfolioSection}>
        <div className={styles.portfolioHeading}>
          <h2>
            Svaki projekat je prilika da stvaramo
            <strong>jedinstvene i inspirativne priče</strong>
            koje uspješno povezuju kreativnost i
            <span>
              funkcionalnost<span className={styles.portfolioPeriod}>.</span>
            </span>
          </h2>
        </div>

        <div className={styles.portfolioGrid}>
          {portfolioImages.map((image) => (
            <figure className={styles.portfolioItem} key={image.src}>
              <img alt={image.alt} src={image.src} />
            </figure>
          ))}
        </div>

        <a
          className={`${styles.portfolioButton} site-cta-button inline-flex items-center justify-center whitespace-nowrap`}
          href="https://www.behance.net/artstudio360"
          rel="noreferrer"
          target="_blank"
        >
          <span className="site-cta-button__icon-wrap" aria-hidden="true">
            <span className="site-cta-button__icon-dot" />
            <svg className="site-cta-button__icon" fill="none" viewBox="0 0 12 12">
              <path d="M10.263 4.268c1.334.77 1.334 2.695 0 3.465l-6.425 3.71c-1.334.77-3-.193-3-1.733V2.291c0-1.54 1.666-2.502 3-.732l6.425 3.709Z" fill="currentColor" />
            </svg>
          </span>
          <span className="site-cta-button__label">Vidi Behance portfolio</span>
        </a>
      </section>

      <section className={styles.testimonialsSection}>
        <div className={styles.testimonialsHeading}>
          <h2>
            Cijenjeni od strane ljudi
            <strong>kojima je stalo do kvaliteta.</strong>
          </h2>
        </div>
        <ServicesTestimonialRail />
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <div className={styles.ctaCopy}>
            <h2>
              Imaš projekat
              <strong>na umu?</strong>
            </h2>
            <div className={styles.ctaActions}>
              <SiteCtaButton
                asLink
                className={styles.ctaButton}
                href="https://calendly.com/artstudio360"
                label="Provjeri dostupnost"
              />
              <a className={`${styles.textLink} ${styles.textLinkLight}`} href="https://www.behance.net/artstudio360" rel="noreferrer" target="_blank">
                <span aria-hidden="true" className={styles.textLinkMark} />
                Vidi naš portfolio
              </a>
            </div>
          </div>

          <img
            alt="Art Studio 360 kreativni tim"
            className={styles.ctaImage}
            src={`${assetRoot}/686d26562b0328a3294881c6_c24b6136ac78a4b8ca799a0ce2fe7aae_Blue%20Card%20Graphic.webp`}
          />
        </div>
      </section>
    </div>
  );
}

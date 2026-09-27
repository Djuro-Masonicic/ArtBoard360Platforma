import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass, Megaphone } from "lucide-react";

import { siteRoutes } from "@/lib/site-routes";

export function ArtBoardOpportunitiesSection() {
  return (
    <section className="artboard-opportunities" id="artboard-oglasi" aria-labelledby="artboard-opportunities-title">
      <div className="artboard-opportunities__inner">
        <p className="artboard-opportunities__eyebrow"><span aria-hidden="true" /> Oglasna tabla</p>
        <div className="artboard-opportunities__header">
          <h2 className="artboard-opportunities__title" id="artboard-opportunities-title">
            Lakši put od oglasa<br />do <span>nove saradnje</span>.
          </h2>
          <p className="artboard-opportunities__intro">
            ArtBoard oglasna tabla povezuje umjetnike sa kompanijama, kulturnim organizacijama,
            institucijama i drugim akterima koji traže njihov rad, znanje i iskustvo.
          </p>
        </div>

        <div className="artboard-opportunities__grid">
          <div className="artboard-opportunities__choices">
            <article className="artboard-opportunities__choice artboard-opportunities__choice--artists">
              <div className="artboard-opportunities__choice-head">
                <span className="artboard-opportunities__icon" aria-hidden="true"><Compass size={20} /></span>
                <div>
                  <span className="artboard-opportunities__tag">Za umjetnike i kreativce</span>
                  <h3>Pronađi priliku. Prijavi se lakše.</h3>
                </div>
              </div>
              <p>Pretraži relevantne oglase, filtriraj prilike i izaberi podatke i materijale koje želiš da uključiš u prijavu. Uz ArtBoard profil, Premium korisnici mogu se prijaviti jednim klikom.</p>
              <Link href={siteRoutes.opportunities}>Pogledaj oglase <ArrowRight size={15} aria-hidden="true" /></Link>
            </article>

            <article className="artboard-opportunities__choice artboard-opportunities__choice--partners">
              <div className="artboard-opportunities__choice-head">
                <span className="artboard-opportunities__icon" aria-hidden="true"><Megaphone size={20} /></span>
                <div>
                  <span className="artboard-opportunities__tag">Za poslodavce i organizacije</span>
                  <h3>Pronađi umjetnike za sljedeći projekat.</h3>
                </div>
              </div>
              <p>Objavi poziv, posao, konkurs ili projekat i predstavi priliku umjetnicima čije iskustvo odgovara tvojim potrebama.</p>
              <Link href="mailto:medenica.ivona@yahoo.com?subject=Objava%20oglasa%20na%20ArtBoardu">Objavi oglas besplatno <ArrowRight size={15} aria-hidden="true" /></Link>
            </article>
          </div>

          <div className="artboard-opportunities__image">
            <Image
              src="/artboard-ad/pexels-bertellifotografia-33714927.jpg"
              alt="Snimanje umjetnice u profesionalnom fotografskom studiju"
              fill
              sizes="(max-width: 760px) 100vw, 50vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

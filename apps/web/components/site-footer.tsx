const footerNavigation = [
  { href: "#", label: "O nama" },
  { href: "/", label: "ArtBoard" },
  { href: "/artists", label: "Umjetnici" },
  { href: "#", label: "Usluge" },
  { href: "#", label: "Kontakt" },
  { href: "#", label: "Blog" },
];

const socialLinks = [
  { href: "https://www.instagram.com/", label: "Instagram" },
  { href: "https://www.behance.net/", label: "Behance" },
  { href: "https://www.linkedin.com/", label: "Linkedin" },
];

/**
 * The footer follows the new public-site direction:
 * a soft rounded top shape, a lightweight logo block on the left,
 * and two simple link columns on the right.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer relative mt-24 overflow-hidden text-[#4a4f59]">
      <div className="site-footer__shape" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-[1280px] px-[5vw] pb-20 pt-28 sm:pb-24 sm:pt-32">
        <div className="grid gap-14 lg:grid-cols-[1.45fr_0.7fr_0.7fr] lg:gap-10">
          <div className="flex flex-col gap-12">
            <a className="inline-flex w-fit items-center" href="/" aria-label="Art Studio 360">
              <img
                alt="Art Studio 360 logo"
                className="w-[112px]"
                src="https://cdn.prod.website-files.com/681b5dac4415aa941af374fe/682344cfd8a98907bbb50f8e_7e491909af25e7cd587505a1141c670a_360%20Logo%20Black.svg"
              />
            </a>

            <div className="space-y-10 text-[18px] leading-[1.2] text-[#9ca3af]">
              <p className="max-w-[240px]">
                &copy; 2025 ArtStudio 360
                <br />
                All Rights Reserved
              </p>

              <a className="site-footer__muted-link inline-block underline underline-offset-4" href="#">
                Uslovi korišćenja
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-[18px] font-medium text-[#8d97a6]">Navigacija</p>

            <nav aria-label="Footer navigation" className="flex flex-col gap-4">
              {footerNavigation.map((item) => (
                <a key={item.label} className="site-footer__link" href={item.href}>
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="space-y-6">
            <p className="text-[18px] font-medium text-[#8d97a6]">Društvene mreže</p>

            <div className="flex flex-col gap-4">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  className="site-footer__link inline-flex items-center gap-3"
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{item.label}</span>
                  <span aria-hidden="true" className="site-footer__icon">
                    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M4 12L12 4M6 4H12V10"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

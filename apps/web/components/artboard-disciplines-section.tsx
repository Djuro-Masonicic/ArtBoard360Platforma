import Link from "next/link";
import {
  Box,
  Brush,
  Camera,
  CircleDot,
  Feather,
  Film,
  Frame,
  Gem,
  Globe2,
  Grid3X3,
  Image as ImageIcon,
  Layers3,
  Lightbulb,
  Monitor,
  MousePointer2,
  Palette,
  PenTool,
  Pencil,
  ScanLine,
  Shapes,
  Sparkles,
  Theater,
  UserRound,
  Video,
  WandSparkles,
  Waves,
} from "lucide-react";

import { siteRoutes } from "@/lib/site-routes";

const disciplines = [
  { label: "Slikarstvo", icon: Palette },
  { label: "Crtež", icon: Pencil },
  { label: "Grafika", icon: Layers3 },
  { label: "Skulptura", icon: Box },
  { label: "Fotografija", icon: Camera },
  { label: "Ilustracija", icon: PenTool },
  { label: "Kolaž", icon: Layers3 },
  { label: "Mješoviti mediji", icon: Waves },
  { label: "Mozaik", icon: Grid3X3 },
  { label: "Tekstilna umjetnost", icon: Feather },
  { label: "Umjetnički nakit", icon: Gem },
  { label: "Digitalna umjetnost", icon: Sparkles },
  { label: "3D umjetnost", icon: Shapes },
  { label: "Animacija", icon: Film },
  { label: "Video umjetnost", icon: Video },
  { label: "Instalacija", icon: Frame },
  { label: "Performans", icon: UserRound },
  { label: "Konceptualna umjetnost", icon: Lightbulb },
  { label: "Multimedijalna i interaktivna umjetnost", icon: MousePointer2 },
  { label: "Generativna umjetnost", icon: WandSparkles },
  { label: "Street art i mural", icon: Brush },
  { label: "Land art", icon: Globe2 },
  { label: "Strip", icon: ImageIcon },
  { label: "Kaligrafija", icon: Feather },
  { label: "Grafički dizajn", icon: ScanLine },
  { label: "Scenografija", icon: Theater },
] as const;

const decorations = [
  ["blue", "top-left"],
  ["coral", "upper-left"],
  ["gold", "top-right"],
  ["violet", "middle-left"],
  ["orchid", "middle-right"],
  ["aqua", "bottom-left"],
  ["blue", "bottom-middle"],
  ["coral", "bottom-right"],
] as const;

export function ArtBoardDisciplinesSection() {
  return (
    <section className="artboard-disciplines" aria-labelledby="artboard-disciplines-title">
      <div className="artboard-disciplines__decorations" aria-hidden="true">
        {decorations.map(([tone, position]) => (
          <span className={`artboard-why__ribbon artboard-why__ribbon--${tone} artboard-disciplines__decoration artboard-disciplines__decoration--${position}`} key={position}>
            <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--one" />
            <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--two" />
            <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--three" />
            <span className="artboard-why__ribbon-wave artboard-why__ribbon-wave--four" />
          </span>
        ))}
      </div>

      <div className="artboard-disciplines__inner">
        <p className="artboard-disciplines__eyebrow"><span aria-hidden="true" /> Umjetničke discipline</p>
        <h2 className="artboard-disciplines__title" id="artboard-disciplines-title">
          Različiti izrazi. <span>Zajednički<br /> prostor za umjetnost.</span>
        </h2>
        <p className="artboard-disciplines__intro">
          Bez obzira na medij, tehniku ili fazu karijere, ArtBoard ti pruža prostor da predstaviš svoj rad i postaneš dio zajednice koja raste.
        </p>

        <ul className="artboard-disciplines__list">
          {disciplines.map(({ label, icon: Icon }, index) => (
            <li className={`artboard-disciplines__item artboard-disciplines__item--${["blue", "red", "gold"][index % 3]}`} key={label}>
              <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </li>
          ))}
        </ul>

        <Link className="artboard-disciplines__action" href={siteRoutes.artistApplication}>Prijavi se besplatno</Link>
      </div>
    </section>
  );
}

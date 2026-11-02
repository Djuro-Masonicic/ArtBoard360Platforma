import { ServiceUnavailableException } from '@nestjs/common';
import sharp from 'sharp';

// Stitch the saved pixels, rather than rendering today's profile/template again.
export async function joinPromotionSlides(slides: readonly Buffer[]) {
  try {
    if (slides.length < 2 || slides.length > 11) throw Error('Invalid slide count');
    for (const body of slides) {
      const meta = await sharp(body, { limitInputPixels: 1080 * 1440 }).metadata();
      if (meta.format !== 'png' || meta.width !== 1080 || meta.height !== 1440 || (meta.pages ?? 1) !== 1)
        throw Error('Invalid slide dimensions');
    }
    return await sharp({ create: { width: 1080 * slides.length, height: 1440, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(slides.map((input, index) => ({ input, top: 0, left: index * 1080 })))
      .png().toBuffer();
  } catch {
    throw new ServiceUnavailableException('Spojena slika nije mogla biti pripremljena. Pokušaj ponovo iz istorije.');
  }
}

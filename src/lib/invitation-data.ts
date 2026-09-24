import { getImage } from 'astro:assets';
import { join } from 'node:path';
import sharp from 'sharp';
import { wedding } from '../data/wedding';
import { loadGallery } from './gallery';
import { longDate, time } from './event';

// Build-time data shared by the invitation designs other than the original page (which keeps its own
// copy of this logic so it stays exactly as tagged in v1-classic).
// Probe sizes through getImage attributes: reading properties of an imported image would publish the original file.
export async function prepareInvitation(canonical: URL, site: URL | undefined) {
  const heroSource = (await getImage({ src: wedding.hero.image })).attributes;
  const heroWidth = Math.min(1200, Number(heroSource.width));
  const heroHeight = Math.round(heroWidth * Number(heroSource.height) / Number(heroSource.width));
  const heroWidths = [...new Set([480, 800, heroWidth].filter((w) => w <= heroWidth))];
  // Pre-blurred ~260-byte copy of the cover for the very first paint (same file wedding.ts imports).
  const lqip = 'data:image/webp;base64,' + (await sharp(join(process.cwd(), 'src/assets/photos/hero.jpg')).rotate().resize(32).blur(1.2).webp({ quality: 55 }).toBuffer()).toString('base64');

  const ogWidth = heroWidth;
  const ogHeight = Math.round(ogWidth * 630 / 1200);
  const og = await getImage({ src: wedding.hero.og || wedding.hero.image, width: ogWidth, height: ogHeight, fit: 'cover', position: 'attention', format: 'jpg' });
  // Kakao crops feed images to a square unless told the size, so the share card gets a 3:4 portrait.
  const kakaoImage = await getImage({ src: wedding.hero.kakao || wedding.hero.image, width: 900, height: 1200, fit: 'cover', position: 'top', format: 'jpg' });

  const photos = loadGallery(wedding.gallery, {
    groom: wedding.groom.name,
    bride: wedding.bride.name,
    release: process.env.RELEASE_BUILD === '1',
  });
  const prepared = await Promise.all(photos.map(async (photo) => {
    const source = (await getImage({ src: photo.image })).attributes;
    const sourceWidth = Number(source.width);
    const sourceHeight = Number(source.height);
    const width = Math.min(1600, sourceWidth);
    const full = await getImage({ src: photo.image, width, widths: width >= 1300 ? [1080, width] : [width], format: 'webp' });
    const thumbWidth = Math.min(480, sourceWidth, Math.floor(sourceHeight * 3 / 4));
    return {
      photo,
      thumb: { width: thumbWidth, height: Math.round(thumbWidth * 4 / 3), widths: [...new Set([240, 360, 480].filter((w) => w < thumbWidth).concat(thumbWidth))] },
      data: { id: photo.id, src: full.src, srcset: full.srcSet.attribute, w: Number(full.attributes.width), h: Number(full.attributes.height), alt: photo.alt, caption: photo.caption },
    };
  }));

  const parkingGuide = await Promise.all(wedding.venue.parkingGuide.map(async (item) => {
    const width = Math.min(1440, Number((await getImage({ src: item.image })).attributes.width));
    return { alt: item.alt, image: await getImage({ src: item.image, width, widths: [...new Set([720, 1080, width].filter((w) => w <= width))], format: 'webp' }) };
  }));

  const venueWithHall = [wedding.venue.name, wedding.venue.hall].filter(Boolean).join(' ');
  const accountGroups = (['신랑', '신부'] as const)
    .map((side) => ({ side, items: wedding.accounts.filter((account) => account.side === side) }))
    .filter((group) => group.items.length);

  return {
    hero: { width: heroWidth, height: heroHeight, widths: heroWidths, lqip },
    og: { url: new URL(og.src, site).href, width: ogWidth, height: ogHeight },
    kakao: {
      key: (process.env.KAKAO_JS_KEY || '').trim(),
      image: { url: new URL(kakaoImage.src, site).href, width: Number(kakaoImage.attributes.width), height: Number(kakaoImage.attributes.height) },
      // Kakao share links must stay on the registered domain; 위치 보기 opens this page's own map section.
      mapUrl: new URL('#location', canonical).href,
    },
    photos: prepared,
    parkingGuide,
    venueWithHall,
    summary: longDate + ' ' + time + ' · ' + venueWithHall,
    accountGroups,
  };
}

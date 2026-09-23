import type { ImageMetadata } from 'astro';
import { buildGallery, type GalleryOverride } from './gallery-core';

// Kept apart from gallery-core because import.meta.glob only works under Vite, not in Node-run tests.
// Vite needs a literal pattern here; keep the extensions in sync with scripts/gallery-check.mjs.
const modules = import.meta.glob<ImageMetadata>('../assets/gallery/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  import: 'default',
  caseSensitive: false,
});

export function loadGallery(overrides: Record<string, GalleryOverride>, options: { groom: string; bride: string; release: boolean }) {
  const entries = Object.entries(modules).map(([path, image]) => ({ file: path.split('/').pop()!, image }));
  return buildGallery(entries, overrides, options);
}

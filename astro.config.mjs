import { defineConfig } from 'astro/config';
import { deploymentConfig } from './scripts/deployment-config.mjs';
import { galleryCheck } from './scripts/gallery-check.mjs';

export default defineConfig({
  output: 'static',
  ...deploymentConfig(process.env),
  trailingSlash: 'always',
  // CSS ships inside the HTML: the cover never waits on a second request, and an in-app browser can
  // never pair a fresh page with a stale cached stylesheet (or the reverse).
  build: { inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
  integrations: [galleryCheck()],
});

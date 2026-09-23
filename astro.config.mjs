import { defineConfig } from 'astro/config';
import { deploymentConfig } from './scripts/deployment-config.mjs';
import { galleryCheck } from './scripts/gallery-check.mjs';

export default defineConfig({
  output: 'static',
  ...deploymentConfig(process.env),
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  integrations: [galleryCheck()],
});

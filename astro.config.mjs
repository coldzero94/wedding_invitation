import { defineConfig } from 'astro/config';
import { deploymentConfig } from './scripts/deployment-config.mjs';

export default defineConfig({
  output: 'static',
  ...deploymentConfig(process.env),
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});

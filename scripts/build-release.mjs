import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const astro = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url));
const result = spawnSync(process.execPath, [astro, 'build'], {
  stdio: 'inherit', env: { ...process.env, RELEASE_BUILD: '1' },
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);

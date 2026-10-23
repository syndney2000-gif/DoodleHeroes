import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://doodleheros.com',
  output: 'static',
  /* Emit /guide.html rather than /guide/index.html. Cloudflare Pages serves
     both at the extensionless /guide, but the file form keeps the URL free of
     a trailing-slash redirect, which is what the old site's links point at. */
  build: { format: 'file' },
  trailingSlash: 'never',
});

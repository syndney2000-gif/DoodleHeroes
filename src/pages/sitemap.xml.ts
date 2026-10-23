import type { APIRoute } from 'astro';

/* Pages worth indexing. Play screens are left out on purpose: they're thin
   wrappers around the game, and their overview pages carry the content. */
const pages = import.meta.glob('./**/*.astro');
const skip = new Set(['/404', '/progress', '/island-sketch/play', '/isle-spans/play', '/lighthouse-wiring/play']);

export const GET: APIRoute = ({ site }) => {
  const paths = Object.keys(pages)
    .map((file) => file.replace(/^\.\//, '/').replace(/\.astro$/, '').replace(/\/index$/, '/'))
    .filter((path) => !skip.has(path))
    .sort();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${new URL(p, site).href}</loc></url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};

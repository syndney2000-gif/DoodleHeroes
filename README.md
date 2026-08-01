# Doodle Heroes — Mobile App (PWA)

A kids' game where you doodle a hero and that exact drawing becomes the playable character in a side-scrolling adventure.

## Files
- `index.html` — the game
- `manifest.webmanifest` — app metadata
- `sw.js` — service worker (offline support)
- `icons/*.png` — 6 app icons
- `generate_icons.py` — regenerate icons (optional, only if you want to customize)

### Content pages
- `guide.html` — how to play
- `drawing-tips.html` — drawing tips
- `parents.html` — for parents & teachers
- `about.html` — about & contact
- `privacy.html` — privacy policy
- `assets/site.css` — shared styles for the above (the game has its own inline CSS)
- `ads.txt`, `sitemap.xml`

## Advertising

**Ads run on the content pages only. The game carries none** — no banners over the
play area, no interstitials, nothing mis-tappable mid-jump. This is deliberate:
ads on the fullscreen game shell are what triggered AdSense's "Google-served ads on
screens without publisher-content" policy violation.

The site is treated as child-directed throughout. Every page with ads sets, *before*
the AdSense script loads:

```js
(adsbygoogle = window.adsbygoogle || []).requestNonPersonalizedAds = 1;
(adsbygoogle = window.adsbygoogle || []).tagForChildDirectedTreatment = 1;
```

Those page-level tags are not a substitute for the account settings — the site must
also be marked child-directed in the AdSense UI.

Ad units use Auto ads (no slot IDs). To switch to manual placements later, drop
`<ins class="adsbygoogle" …>` blocks inside a `<div class="ad-slot">`, which is
already styled and renders an "Advertisement" label.

Do not add `hello@doodleheros.com` to a page until that mailbox actually exists —
it appears on `about.html` and `privacy.html`.

## Test on your computer
PWAs need a real HTTP server. From the project folder:

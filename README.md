# Doodle Heroes — Mobile App (PWA)

A kids' game where you doodle a hero and that exact drawing becomes the playable character in a side-scrolling adventure.

## Files
- `manifest.webmanifest` — app metadata
- `sw.js` — service worker (offline support)
- `icons/*.png` — 6 app icons
- `generate_icons.py` — regenerate icons (optional, only if you want to customize)

### Pages
- `index.html` — landing page: the game framed in a stage (iframe of `/play`),
  ads outside the frame, content below
- `play.html` — the fullscreen game itself, ad-free. PWA `start_url`.
- `guide.html` — how to play
- `drawing-tips.html` — drawing tips
- `parents.html` — for parents & teachers
- `about.html` — about & contact
- `privacy.html` — privacy policy
- `assets/site.css` — shared styles for the above (the game has its own inline CSS)
- `ads.txt`, `sitemap.xml`

## Advertising

Every page carries ads **except `play.html`**, which must stay ad-free — a
fullscreen game canvas running ads is exactly what triggered AdSense's
"Google-served ads on screens without publisher-content" violation.

`index.html` monetises the landing page compliantly by putting the game in a
framed stage (an iframe of `/play`) with real content around it and ads outside
the frame. Do not move an ad inside the stage, and do not add the ad script to
`play.html`.

Serving different content to Googlebot than to users is cloaking — so if you ever
make ads conditional, key it off `display-mode`, not user agent.

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

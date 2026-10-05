# The home page (the globe)

The site's front door, `/`, is a plain HTML, CSS and JavaScript page. It uses no framework and nothing from the
Next.js app except the data the app already serves.

It started life as a preview, which is why its folders are still called `preview`. The site as it was before
lives on at `/previous`, and the new page links to it as "Previous site".

## What is where

| Path | What it is |
| --- | --- |
| `preview-src/index.html` | The page: the markup and all of the CSS |
| `app/route.ts` | Serves that page at `/` |
| `app/home-page.json` | The copy of the page that `app/route.ts` reads. Written by `npm run build`. Do not edit it by hand |
| `public/preview/app.js` | The page's code, built from `preview-src/js`. Do not edit it by hand |
| `public/preview/app.js.map` | Lets the browser's developer tools show the original source |
| `public/preview/earth/` | Earth maps: day at 1k, 2k and 4k, night at 1k and 2k (NASA Blue Marble and Earth at Night) |
| `public/preview/data/` | Country and state outlines for the globe (`borders.json`) and the US map (`states.json`) |
| `public/preview/img/` | The photos that ship with the page, each as a 480 px WebP and a 1600 px JPEG |
| `public/preview/fonts/` | Overpass, Yellowtail and Caveat (SIL Open Font License) |
| `public/preview/og.jpg` | The picture shown when the link is shared |
| `preview-src/js/` | The source modules |
| `app/previous/page.tsx` | The previous site's home page |

The old preview addresses, `/preview` and `/preview/index.html`, are sent to `/` by redirects in `next.config.ts`.

## Changing the page

Edit `preview-src/index.html`. `npm run build` copies it into `app/home-page.json` before it builds, so a
deployment always serves the current page. To see an edit under `npm run dev`, run the copy step by hand:

    node preview-src/tools/make-home.mjs

Commit `app/home-page.json` together with `index.html`.

## Changing the code

Edit the files in `preview-src/js`, then rebuild the bundle. Run this from the project root:

    npx --yes esbuild@0.25.12 preview-src/js/app.js --bundle --minify --sourcemap --format=esm --target=es2019 --legal-comments=none --outfile=public/preview/app.js

Commit both the changed source and the rebuilt `app.js` and `app.js.map`.

## The modules

- `app.js`: the page itself. Reads the travel sheet, builds the trip, and keeps the sign, the globe, the replay bar,
  the photos and the lists in step.
- `data.js`: turns sheet rows into clean stops (place names, dates, time zones) and checks photo addresses.
- `model.js`: everything derived from the trip: places, the legs between stops, the replay track, the totals.
- `globe.js`: the camera, the routes and dots drawn over the Earth, and mouse, touch and keyboard handling.
- `earth.js`: draws the Earth. WebGL where the device has a graphics chip, a simpler renderer written in
  JavaScript where it does not. Both show the same day side, night side and city lights.
- `sun.js`, `geo.js`: where the sun is, and sphere maths.
- `viewer.js`: the full-size photo viewer.
- `weather.js`: the current weather where you are, from Open-Meteo.
- `snapshot.js`: a saved copy of the travel sheet. The page opens with it (or with the visitor's own copy from
  their last visit) and then swaps in the live sheet. To refresh it, open `/api/travel-data` on the site, paste
  the result in as `rows`, set `asOf` to today's date, and rebuild.

## Where the data comes from

- `/api/travel-data`: the stops. Asked for as soon as the page starts loading. If the first answer is slow or
  fails (the service behind it goes to sleep when nobody has visited for a while), the page asks again.
- `/api/photos`: photos added on the site. They join the photos that ship with the page.
- `/api/auth/session`: only to show "Signed in as" in the footer.
- `/api/track-visitor`: the same visit count the previous site keeps.
- `api.open-meteo.com`: the weather. Free, no key. If it cannot be reached the weather line is left out.

## Good to know

- The page finds its files (maps, photos, outlines) next to `app.js`, wherever the page itself is served from.
  In `index.html` the links to them are written out in full (`/preview/...`).
- `app/route.ts` compresses the page itself, because Next compresses its own pages but not what a route returns.
- The few letters of the neon wordmark and the sign-off line are embedded in `index.html` as a tiny font, so
  they are there from the first paint. If that text changes to use other letters, the browser fetches the full
  Yellowtail font by itself.
- Photos that ship with the page are listed near the top of `app.js` (`HERO`), by place.
- Adding `?globe=canvas` to the address forces the simpler Earth renderer and `?globe=webgl` forces WebGL.
  Useful when testing.
- `/previous` is marked `noindex`, so search engines list the new page and not the old one.
- When the previous site is retired: delete `app/previous`, the "Previous site" links in `index.html`, and
  whatever else of the old pages is no longer wanted. The Picture Book, sign-in, admin and games pages are
  separate and still in use.

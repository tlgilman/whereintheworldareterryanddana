# The preview page (public/preview)

The page at `/preview/index.html` is plain HTML, CSS and JavaScript. It uses no framework and nothing from the
Next.js app except the data the app already serves. The short address `/preview` is sent there by a redirect in
`next.config.ts` (Next serves files in `public` only by their full name).

## What is where

| Path | What it is |
| --- | --- |
| `public/preview/index.html` | The markup and all of the CSS |
| `public/preview/app.js` | The page's code, built from `preview-src/js`. Do not edit it by hand |
| `public/preview/app.js.map` | Lets the browser's developer tools show the original source |
| `public/preview/earth/` | Earth maps: day at 1k, 2k and 4k, night at 1k and 2k (NASA Blue Marble and Earth at Night) |
| `public/preview/data/` | Country and state outlines for the globe (`borders.json`) and the US map (`states.json`) |
| `public/preview/img/` | The photos that ship with the page, each as a 480 px WebP and a 1600 px JPEG |
| `public/preview/fonts/` | Overpass, Yellowtail and Caveat (SIL Open Font License) |
| `public/preview/og.jpg` | The picture shown when the link is shared |
| `preview-src/js/` | The source modules |

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
- `/api/track-visitor`: the same visit count the current site keeps.
- `api.open-meteo.com`: the weather. Free, no key. If it cannot be reached the weather line is left out.

## Good to know

- The few letters of the neon wordmark and the sign-off line are embedded in `index.html` as a tiny font, so
  they are there from the first paint. If that text changes to use other letters, the browser fetches the full
  Yellowtail font by itself.
- Photos that ship with the page are listed near the top of `app.js` (`HERO`), by place.
- Adding `?globe=canvas` to the address forces the simpler Earth renderer and `?globe=webgl` forces WebGL.
  Useful when testing.
- The page is marked `noindex` while it is a preview. Remove that line from `index.html` when it becomes the
  main site.

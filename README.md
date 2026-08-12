# Frame in Goa

A photo goes in, a Hacker House Goa 2026 graphic comes out. Built for HH Goa Task #01.

Three formats:

- **PFP frame** (1024x1024) - square profile picture wrapped in the HH Goa ring
- **Builder pass** (1600x900) - badge with name, stack and a generated builder class
- **Squad frame** (1600x900) - up to six teammates in one combined frame

## How it works

Everything is drawn on a `<canvas>` in the browser. There is no server round trip
to make the image, so the preview updates as you type and the download is instant.
The photo never leaves the device unless you press Share to X.

A few things worth calling out:

**Any photo works.** Uploads are decoded through `createImageBitmap` with
`imageOrientation: "from-image"` so iPhone photos are not sideways, HEIC files are
converted with `heic-to` (loaded on demand, it is about a megabyte of wasm), and
anything over 2048px is downscaled first so rendering stays quick.

**No manual cropping.** `focalPoint()` in `lib/image.ts` downscales the photo to 72px
wide, scores each pixel for skin tone in YCbCr, and takes the centroid. That becomes
the focal point for the cover fit, so a face sitting in the left third of a landscape
shot still lands in the middle of the circle. If the guess is off, drag the preview or
use the zoom slider.

**Share to X actually shows the graphic.** X does not let you attach an image through
a web intent, so on share the graphic plus a 1200x630 version are uploaded and the
tweet carries a link to `/s/<id>`. That page sets `og:image` to the wide version, which
is what X unfurls. Those two go up as jpeg, about 300KB instead of a megabyte, since
they are only ever looked at; the Download button still gives you a lossless PNG. On
phones there is also a Share Image button that hands the real file to the X app through
the Web Share API.

## Brand

Colours, fonts and the illustration language come from hhgoa.com: green `#0B6839`,
yellow `#FEE101`, pink `#FF0080`, cream `#FFFBE8`, set in Imbue and Victor Mono, with
the rising sun, the cropped palms and the गोवा sticker. The sun, palms and waves are
drawn as canvas paths in `lib/draw.ts` rather than shipped as images, so they scale
cleanly and recolour per theme.

## Running it

```bash
npm install
npm run dev
```

## Deploying

Deploys to Vercel as is. Share links need a Blob store:

1. Vercel dashboard, Storage tab, create a Blob store. **Set Access to Public.**
   Private is the default and it cannot be changed after the store is created, so
   getting this wrong means making a second store. These blobs are social share
   images that X has to fetch anonymously, so a private store fails with
   "Cannot use public access on a private store".
2. Connect it to the project.
3. Redeploy, so the deployment picks up the connection.

Do not add any blob environment variable by hand. Vercel connects Blob over OIDC
and injects `BLOB_STORE_ID`, and `@vercel/blob` authenticates with that plus the
runtime's `VERCEL_OIDC_TOKEN`. There is no token to copy. If you create an empty
`BLOB_READ_WRITE_TOKEN` yourself, Vercel will not overwrite it and the store will
look unconfigured.

With no store, uploads fall back to the local filesystem. Fine in dev, not on
serverless where instances do not share a disk. Everything else (preview, download,
copy caption) works either way.

Set `NEXT_PUBLIC_SITE_URL` if you are on a custom domain, otherwise Vercel's own
env vars are used to build absolute `og:image` URLs.

## Layout

```
app/
  page.tsx              the studio
  s/[id]/page.tsx       share landing, owns the og tags
  api/share/route.ts    accepts the two PNGs, returns an id
  api/i/[id]/[file]     serves them back in local dev only
lib/
  brand.ts              palette, event copy, the three colourways
  draw.ts               sun, palms, waves, arc text, stickers, cover fit
  image.ts              decode, HEIC, downscale, focal point
  render/               one module per format, plus the og composition
```

Not an official HH Goa page.

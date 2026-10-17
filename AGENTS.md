# AGENTS.md

> **`CLAUDE.md` is a symbolic link to this file (`AGENTS.md`).** Edit only this file; never turn `CLAUDE.md` into a regular file or edit it separately. If the link breaks, recreate it from the repo root with `ln -sf AGENTS.md CLAUDE.md`. Claude Code reads `CLAUDE.md` and other tools (Codex, etc.) read `AGENTS.md`, so they all see the same guide.

This is the guide for agents and people working in this repository. When a decision changes or a new way of working appears, update this file in the same commit. The repository is public, so keep anything private out of it.

## At a glance

The wedding invitation for Chanyoung (찬영) and Yeji (예지): Saturday 2027-03-13, 12:10, 발산 더뉴컨벤션 5F 제니스홀 (Zenith Hall). An Astro static site deployed to GitHub Pages at `https://coldzero94.github.io/wedding_invitation/`. Both the repository and the site are public.

| Path | What | Status |
|---|---|---|
| `/v2/` | Movie-theater themed mobile invitation. **The invitation actually sent to guests.** | Actively edited |
| `/v2/print/` | Print page for the 4x6 paper invitation in the same theme (front and back) | Actively edited, `noindex` |
| `/` | The first (classic) invitation | Frozen at tag `v1-classic`. There is an undecided idea to turn it into a page for the 상견례 (meeting of the families) |

Both mobile editions read the facts from `src/data/wedding.ts`. Copy used only by the movie edition lives in `src/data/movie.ts`.

## Key files

- `src/data/wedding.ts`: names, parents' names, date and time, venue, transport, parking guide images, bank accounts, photo settings. Shared by both editions.
- `src/data/movie.ts`: movie-edition-only copy (the quote, credits, film-strip photo numbers and crop positions, the cookie) and the paper invitation copy (`paper`).
- `src/pages/v2/index.astro`, `src/styles/movie.css`, `src/scripts/movie.ts`: the movie edition.
- `src/pages/v2/print.astro`: the paper invitation, styles included in the file.
- `src/lib/invitation-data.ts`: build-time data for the movie edition (cover photo, gallery, share images).
- `src/scripts/invitation.ts`: behaviour shared by both editions (gallery, sharing, account copy, parking guide, zoom limits).
- `src/pages/index.astro`, `src/styles/global.css`: the classic edition (frozen).
- `tests/*.spec.ts`: Playwright tests. `tests/movie.spec.ts` guards the movie and paper decisions.

## Commands

```sh
npm run dev            # dev server
npm run check          # astro check (the deploy workflow runs it too)
npm run build          # local build; the tests use this dist
npm run test:e2e       # Playwright tests (after a build)
npm run photos         # photos-inbox -> src/assets/gallery (strips location data, renumbers)
SITE_URL=https://coldzero94.github.io BASE_PATH=/wedding_invitation npm run build:release   # release build with the real URL
```

Every change must pass `npm run check`, `npm run build` and `npx playwright test`.

- The tests serve the **built `dist`** with `astro preview` on port 4322, so run `npm run build` again after changing code.
- The default browser is the installed Chrome (`channel: 'chrome'`); some tests launch WebKit themselves.
- The release build (`build:release`) checks `isDemo: false`, a real HTTPS URL, a non-empty venue address and more (`src/lib/validate-wedding.ts`). The tests that exercise release mode with fictional data (`tests/release-*.spec.ts`) never touch the real data.
- For print PDFs, run `build:release` with the real URL, then go back to `npm run build` for the tests.

## Deploying

1. Commit, then `git push gh main` (the remote is `gh`, not `origin`).
2. Deploy **always in release mode**: `gh workflow run deploy.yml --repo coldzero94/wedding_invitation --ref main -f mode=release`.
3. Follow it to the end with `gh run watch <id> --repo coldzero94/wedding_invitation --exit-status`, then check the change on the live site.

The KakaoTalk in-app browser caches hard; if an old page shows, tell the user to open the URL with `?v=<number>` appended. The Kakao share key is the repository variable `KAKAO_JS_KEY`.

## Rules

- **Public repository:** original phone photos stay in `photos-inbox/` (ignored by Git). Originals carry location data, so never put them in `src/assets` directly; prepare them with `npm run photos`. Phone numbers were removed from the history on request; don't add them back.
- **Commit messages:** in English, saying what changed and why. No co-author or attribution lines.
- **Check in WebKit:** most guests open the invitation in KakaoTalk on iPhone (WebKit). Check visual changes in WebKit, not only Chromium.
- **The classic edition is frozen:** don't change `src/pages/index.astro` or `src/styles/global.css` for movie-edition work. When shared data or scripts change, check both editions.
- **The mobile cover and the paper front move together:** the cover's title and layout must match the paper front (the couple's rule). Since 2026-10-17 both follow the couple's mock-up: **"Our / First / Page"** (one word a line, Fraunces Bold Italic, pale yellow `#fbeac4`) at the top, and their white hand-drawn doodles (sparkles at both heads, little flowers) on the photo. Earlier phrases (Love Wins All, Welcome to our wedding) were dropped; don't bring them back.
- **Killing processes:** never kill by name pattern (`pkill -f`, `killall`). Once a "cat" pattern also matched "/Appli**cat**ions" and quit every open app. Kill only processes you started, by PID, e.g. `kill $(lsof -ti tcp:4399 -sTCP:LISTEN)`.

## Movie edition (`/v2/`): current decisions

- **Cover:** the whole main photo (gallery 01); "OUR SEASON PICTURES presents" at the top; Groom/Bride, date, venue, the NOW PLAYING button and the billing at the bottom. The title "Our First Page" under "presents"; the date and billing in the title's pale yellow. The film leader (3, 2, 1) plays only on arrival, not on reload.
- **Doodles:** `src/components/Doodles.astro`, shared by the cover and the paper front. Drawn in photo 01's own pixels (viewBox 1200x1800, `xMidYMid slice`), so they stay on the photo as long as it is cropped from its centre (`movie.cover.position` `'50% 50%'`, the paper's `object-position`). The flowers were traced (potrace) from the couple's mock-up; the sparkles are round-capped strokes. With `tuck` (the phone cover, a narrower crop) the side flowers move 60 px in and the grass pair moves up clear of the credits. A new main photo means new doodles.
- **Type:** Fraunces Bold Italic for the title, Rozha One for English and numerals, Noto Serif Display SemiBold italic for the flourishes (Groom/Bride, presents, The End), Pretendard for Korean. Lining numerals.
- **Ticket:** adapted from the couple's olive paper-ticket reference, with a main body and a right-hand stub separated by a vertical perforation and cut-out notches. Front: VIP TICKET, "Our First Page" (the current movie title, never the old "The Greatest Love Story"), date, time, screen, venue, SVG barcode; the stub has ADMIT ONE, a QR to `/v2/`, a flip hint and SEAT "초대석". Type reflows for phones instead of shrinking the supplied bitmap. Tapping flips to a calendar and a countdown in the same silhouette. Hidden faces are also hidden from screen readers; the button has an accessible description of the ceremony details.
- **Ticket motion:** the flip hint stays visible after use. A gentle nudge plays again on either face when at least 65% of the ticket enters the central 76% of the viewport; it rearms only after visibility drops to 20% or less, so small scrolls and toolbar changes don't keep triggering it. `movie.ts` observes the ticket with IntersectionObserver, independently of the one-time `data-arrive` effects. Tapping cancels the nudge for the direct flip, and reduced motion suppresses it.
- **Between the names:** a gold heart SVG instead of an emoji or "&", with hidden text ("그리고"/"and") for screen readers and copying.
- **Directions:** in `wedding.ts` transport text, words wrapped in `[brackets]` are highlighted in gold on the movie edition ([이대서울병원]). The parking guide images open from "주차 안내 보기".
- **Zoom:** the page and the gallery photos can't be zoomed; only the parking guide images can, while they are open.
- **Accounts:** shown hyphenated in each bank's format, copied as digits only.
- **Footer:** only the "처음으로" (back to top) link; the link to the classic edition was removed.
- **Film strips:** `stripTop` and `stripBottom` in `movie.ts` are gallery photo numbers with vertical crop positions (`y`, %). The frames are 150 x 105 px, so only ~47% of a portrait photo shows and heads get cut easily. Set `y` from face and body detection (macOS Vision) so the heads sit ~12% below the frame's top, then check every frame by eye. Update them when `npm run photos` renumbers or replaces the gallery.

## Paper invitation (`/v2/print/`)

- **Size:** trim 102 x 152 mm (4x6 portrait), one 106 x 156 mm sheet per side including 2 mm bleed. Only the trim line (blue) is drawn; text stays 4 mm inside the trim.
- **Front:** matches the couple's mock-up (measured off it in mm): the whole main photo with the doodles; "Our First Page" (Fraunces Bold Italic 11.4 mm, line pitch 12.65 mm, capitals 6.6 mm under the trim); at the foot the date, venue, a short dash and the names in Noto Serif Display SemiBold (upright) 8 pt, `#fbeac4` (the mock-up's is about 7 pt; 8 pt is the minimum). The shade, measured off the mock-up too: none down to the dress, then darker to black at the trim.
- **Back:** white, split into top and bottom halves. Top: WEDDING INVITATION, Colossians 3:14, the greeting, both families (아들/딸). Bottom: the LOCATION list (자차, 주차, 대중교통; 이대서울병원 without emphasis), and under it a cream movie ticket as wide as the list ("SCAN TO WATCH" on the body, a 13 mm QR code to `/v2/` past the perforation).
- **Type size:** nothing printed is under 8 pt (a test checks it).
- **Margins:** top and bottom margins are equal measured on the ink, not the text boxes. Front: about 11 mm from the trim to the end of the billing, as on the mock-up. Back: about 12.4 mm top and bottom.
- **PDF pitfalls:** `text-shadow` shows as dark boxes in macOS Preview, and repeating CSS gradients (e.g. a barcode) break up in PDFs. Don't use them.
- **Checking:** run `build:release` with the real URL, print to PDF, render each page with `pdfseparate` and `sips -s format png` (Quartz, as macOS Preview draws it) and look at it. Decode the QR and confirm it points to `/v2/`. Capture PNGs one sheet at a time (together, a 1 px row of the neighbouring sheet leaks in).
- **Deliverables:** update `청첩장_4x6.pdf`, `1_앞면_인쇄선.png` and `2_뒷면_인쇄선.png` in the folder the user chose (currently `~/Downloads/movie-invitation-print/`).
- **Vector front:** `1_앞면_벡터.pdf` (print), `1_앞면_벡터_재단선.pdf` (with trim line), `1_앞면_벡터.svg`. A hand-built SVG: the text as font outlines (Fraunces title, Noto Serif Display billing; extracted with opentype.js, positions measured from the print page), the doodles as their paths, the photo as the original JPEG, the shade as an SVG gradient. Converting the PDF to SVG with `pdftocairo` breaks the masks; don't use it. Rebuild these files whenever the front changes. The original photo is 1200 x 1800, about 288 dpi at card size.

## Technical notes (so these don't happen again)

- **Cover size (KakaoTalk):** the in-app toolbar can resize the webview itself, changing even `100svh` and making the `object-fit: cover` photo zoom in and out during scrolling. The cover's inline script stores its initial CSS minimum in `--cover-height` before the entrance; only a width change (rotation / split view) measures it again. Don't update it on height-only or `visualViewport` resize events. Keep the CSS `svh` fallback for JavaScript-free visits.
- **Cover text (KakaoTalk):** safe-area insets can also change as the toolbar moves. Live `env(safe-area-inset-bottom)` padding shifted the entire names/date block after the photo height was fixed. The same script freezes the studio's top padding and the credits block's bottom padding in `--cover-padding-top` / `--cover-padding-bottom`, and remeasures on width changes. Keep the `env()` CSS fallbacks. The toolbar regression tests check every cover text box as well as the photo, and substitute controllable safe-area values because desktop browser emulation cannot change native insets.
- **Cover flicker (WebKit):** declare the cover's entrance transitions only after `html.cover-ready` is set. Declared from the start, WebKit paints the cover, hides it and shows it again. A cover that is ready at once on a revisit is shown finished via `cover-instant`.
- **Inline CSS:** `inlineStylesheets: 'always'` in `astro.config.mjs` keeps the KakaoTalk in-app browser from pairing new HTML with stale CSS. Leave it on.
- **clip-path animation:** WebKit won't animate to `clip-path: none`, so both ends use `inset()`.
- **Ticket flip:** WebKit sometimes ignores `backface-visibility`, so the faces swap `visibility` halfway through the flip.
- **Back to top and shared links:** in-page navigation never leaves a `#` in the URL, and `#invitation` is stripped from shared URLs, so a shared link always opens on the cover.
- **Kakao share card:** the image is 3:4 (`kakao.jpg`) and its size is passed along; without the size Kakao crops it square. The deploy domain must be registered under [Platform > Web] in the Kakao Developers app.
- **Centring script fonts:** script strokes overhang the text box, so box-centred lines look off-centre. If a script title comes back, measure each line's ink and correct it (previously the `nudge` values in `movie.ts`).
- **Font licenses:** the licenses (OFL) of the fonts shipped with the site live in `public/licenses/`. Keep the folder in step when fonts are added or removed (currently Fraunces, Rozha One, Noto Serif Display, Cormorant Garamond, Pretendard).

## Other folders

- `research/`: research and mock-ups from the planning stage. Written for the classic edition, so parts differ from the current structure; reference only.
- `output/qr/`: QR code from `npm run qr -- https://coldzero94.github.io/wedding_invitation/v2/`, pointing to `/v2/` (regenerated 2026-10-17; it used to point to `/`). The paper invitation builds its own QR to `/v2/`. Any QR code for guests points to `/v2/`, never `/`.
- `README.md`: Korean usage guide for the couple (addresses, adding photos, changing details). Partly written for the classic edition. Keep agent instructions here in AGENTS.md, not in README.

## Photos and `photos-inbox/`

`photos-inbox/` (ignored by Git) holds the originals. Originals carry GPS data and must never be committed; only the prepared copies go into `src/assets`.

- **Gallery source:** the 34 top-level image files in `photos-inbox/`: 01 and 02 are the two photos added for the cover (2026-09-24), 03-34 the photographer's retouched set from Google Drive (replaced 2026-10-17; the earlier versions were deleted on request), named `NN-label-originalname.ext` (e.g. `01-main-laugh.jpeg`, `05-casual-MGA_9878.jpg`). The name order (numeric) is the gallery order. The couple's order (2026-10-17): 01-02 the cover photos, then 노을공원 in the dress (03-13), 노을공원 casual (14-22, ending with the two solo portraits), and 동작대교 at night (23-34); within each group, the shooting order (the MGA numbers, which wrap from 9999 to 0000). Only top-level files are used; subfolders are skipped.
- **`npm run photos`:** rotates by EXIF, fits the long side to 2560 px, saves JPEG (quality 85), strips all metadata including GPS, converts HEIC (macOS only), then **replaces the whole gallery** with `src/assets/gallery/01.jpg`… It builds everything before replacing, so a failure leaves the gallery untouched.
- **Renumbering:** adding, removing or reordering photos renumbers the gallery. Then update the photo numbers in `movie.ts` (`cover.photo`, `stripTop`, `stripBottom`, `poster`, `cookie`) and any `gallery` overrides in `wedding.ts`, and re-check the cover, the film strips and the paper front.
- **01 is the main photo:** used for the movie cover (`movie.cover.photo`), the paper front, and first in the gallery. Its original is 1200 x 1800.
- **`photos-inbox/parking/`:** originals of the two parking guide images; the prepared copies are `src/assets/parking/01-notice.jpg` and `02-route.jpg` (background matched to the site's ivory).
- **`photos-inbox/family/`:** two family photos and their composites (`가족사진_합성.jpg`; `가족사진_투명배경.png` with a transparent background) for the planned 상견례 page. Not used on the site.
- **Classic cover and share images:** `src/assets/photos/hero.jpg` (`npm run photos -- --hero <file>`), `og.jpg` and `kakao.jpg` (the Kakao image is 3:4).
- Don't delete or rename files in `photos-inbox/` without asking: it is the only copy of the originals on this machine besides the couple's phones.

## In progress or awaiting a decision

- Turning the classic edition (`/`) into a story page to show at the 상견례. Drafts exist for Chanyoung's introduction, the family introduction and the letters to the parents; Yeji's part is pending. The address (how public it is) and personal-information exposure must be decided first.
- Whether to drop "presents" from "OUR SEASON PICTURES presents" at the top of the mobile cover.

# Backdraft Suppressors — Help Center

Static prototype of the Help Center page. No build step, no dependencies.

    python3 -m http.server 4321
    # http://127.0.0.1:4321/

## Files

| File | What's in it |
|------|--------------|
| `index.html` | All content and page structure |
| `styles.css` | Brand tokens in `:root` — change colours/fonts there |
| `app.js` | Search/filter, expand-collapse, deep links, back-to-top |
| `assets/logo.png` | Store logo, pulled from the theme and made transparent |
| `assets/watermark.png` | The Outlier mark used as the background watermark |

## Design

Matched to the live BigCommerce theme on backdraftsuppressors.com, read off the
rendered site rather than guessed:

| | Site | Used here |
|---|---|---|
| Container | 1230px / 15px gutter | same |
| Body text | Helvetica 14px / 21px, `#4e4e4e` | same |
| Headings | Barlow 700, uppercase, `0.25px` | same |
| Nav & buttons | Roboto Condensed 700 uppercase | same |
| Buttons | `#333` fill, white text, 2px radius, 14px 39px | same |
| Footer | `#333` | same |
| Alternating bands | white / `#f9f9f9` | same |

Three families, no more: **Barlow** headings, **Roboto Condensed** nav, buttons,
table headers and small uppercase labels, **Helvetica** body — exactly the set
the theme loads.

**Type scale: 42 / 32 / 22 / 18 / 14.** Nothing sits between those steps.
All headings are `#333`; body is `#4e4e4e`; muted text is `#6e6e6e`.

The one deliberate exception is the Contact Us heading, at 16px in muted grey:
the brief asks for that section to draw "the least attention".

Two departures from the theme:

- **Muted grey is `#6e6e6e`, not the theme's `#989898`.** The theme value is
  2.9:1 on white and fails WCAG AA; this one is 5.1:1 and looks the same next to
  the body grey.
- **No red anywhere.** The brand is monochrome, so red was the loudest thing on
  the page. Standalone statements the documents set apart — safety notes, "is
  full-auto rated", "is not full-auto rated" — are bold with a left rule, all of
  them, so paired cards read as a pair. The "HubSpot link pending" flags are
  neutral grey chips.

Fonts load from the same Google Fonts families the theme already requests, so
there is no extra font payload when this is dropped into the store.

## Store chrome

The page carries the site's own header, breadcrumb and footer so it reads as a
continuation of backdraftsuppressors.com rather than a page that happens to
share its colours: logo + store search + Sign in / Register + cart, the
`SHOP ALL / SUPPRESSORS / ADAPTERS / APPAREL / AMMUNITION` bar,
`Home / Help Center` breadcrumb, newsletter block, and the `#333` footer with
Outlier USA LLC, the category and information columns, socials, payment row.

In the real BigCommerce template none of this is ours — the theme supplies the
header and footer, and this markup gets deleted. It exists so the prototype can
be reviewed as a finished page. The one piece that stays is the sticky
**Help Center section nav** under the hero.

The store search and newsletter forms point at the real endpoints
(`/search.php`, `/subscribe.php`) so they behave sensibly if anyone clicks them.

## Logo

`assets/logo.png` is the theme's own logo (`bdbigger…original.png`, 300×135),
converted from a white-background raster to transparent black artwork — the
source is pure black and white, so inverting luminance into the alpha channel is
exact. It sits in the header as a plain image, no animation.

## Background watermark

The product shots carry a large, very light Outlier mark behind the
suppressors. The page carries the same one.

`assets/watermark.png` is the real lockup — the oval badge over the wide
OUTLIER wordmark — taken from getoutlier.com's own logo file, not
reconstructed from the header logo (that one is a different, tighter lockup
where the wordmark is no wider than the badge). The source is white-ground
black artwork at 300×150, the largest the CDN serves; it is upscaled 3× to
874×483, which is the size it actually renders at, so the browser never has to
scale it. White becomes transparent through the same luminance-to-alpha
conversion as the logo. Stored as greyscale + alpha rather than RGBA — it is
one colour with a varying mask, so the extra channels were carrying nothing:
66 KB instead of 120 KB. The ™ under the wordmark's right end is drawn in, as
the product shots have it and the logo file does not.

It sits in `body::before`, fixed to the viewport, so the page moves over one
continuous mark rather than repeating it per band. For that to be visible the
page background had to move to `<html>` — a `z-index: -1` child of a painted
`<body>` paints *underneath* body's own background — and the content bands are
painted at 80% alpha so the mark reads through them.

**The tone is matched, not guessed.** On the product photos the watermark
measures `#f1f1f1` against white: black at about 5.5%. Read through bands at
80% alpha it is cut to a fifth, so the layer is laid down at 27% to land back
on the same value. Rendered page pixels come out at 241 on the white bands and
236 on the `#f9f9f9` bands — a 14-level drop either way, the same as the photo.

Content panels are translucent too — `--panel` at 55% white, `--panel-alt` at
62% — so the mark reads through the cards instead of being blanked out by them.
The store header, the sticky section nav and the footer stay opaque: they are
the site's furniture, not content.

If the mark ever needs to be lighter or heavier, the `opacity` on
`body::before` is the only number to touch; how much of it reaches through a
card is `--panel`.

## Motion

Entrances only, nothing decorative, and all of it additive: with JavaScript off
nothing is ever hidden, and `prefers-reduced-motion: reduce` turns the whole lot
off without changing the layout.

- **Hero** — eyebrow, heading, lede, search and the four tiles rise in on load,
  staggered 60–70ms apart.
- **Scroll reveal** — section headings, order cards, guide steps, FAQ questions,
  the warranty panel and the contact block fade up as they come into view, via
  `IntersectionObserver`. Only elements that start *below the fold* get the
  hidden state, so nothing above it can flash.
- **Accordion** — `<details>` shows and hides instantly, so the close is animated
  to height before `open` is dropped. The `+` marker is two bars; the vertical
  one collapses into the `–`.
- **Sticky section nav** — picks up a shadow once it sticks, and underlines the
  section you are currently reading.
- **Tiles** lift on hover; **back to top** fades in past 600px.

Deep links are the one case the observer cannot cover — landing on
`#faq-serial` skips everything above it. `openFromHash` clears the hidden state
across the target's whole section, so a linked answer is never invisible.

The store chrome deliberately does not animate. It is the site's furniture and
should feel identical to every other page.

## Sections, in page order

1. **Hero + search** — filters the FAQ *and* the guide as you type
2. **Order Status, Changes, Returns & Cancellations** — the four highlighted items, unnumbered
3. **Guide to Buying a Suppressor & HUB Adapter** — read straight through, with a
   sticky contents list that highlights the section you are in
4. **FAQ** — three category cards with a jump strip, collapsible, unnumbered
5. **Lifetime Warranty**
6. **Contact Us** — deliberately quiet: small type, bottom of page, no accent colour

## Step headings

The document writes the step and the title as **one heading line** —
`STEP 2: CHOOSE YOUR LENGTH` — so the page does the same. One size, one line,
no separate badge.

Numbering runs **1–10, continuously**. The document skips 9 (it goes 1–8, then
10 and 11); the client asked for that closed up, so "Place your Backdraft order"
is Step 9 and "Complete the required transfer process" is Step 10. That is the
only departure from the document's numbering and it was their call. The wording
of every heading is untouched. Section ids follow: `#g-9`, `#g-10`.

The contents list beside the guide uses short one-line labels, so it stays
scannable; the full heading is on the section itself.

The brief's "does NOT need to be numbered" applies to the Q&A, which carries no
numbers.

## The guide opens on demand

Most visitors come for one answer, so the guide stays out of their way. The
section shows its heading and the three intro paragraphs, then the button:

> **GUIDE TO BUYING A SUPPRESSOR & HUB ADAPTER**
> Buying a suppressor can feel complicated…
> The good news? …
> This guide will walk you through the process…
> [ See the full guide ]

Everything below that — the contents list and all seventeen sections — is
`display: none` until the button is pressed, when it becomes "Hide the guide"
in the same spot. The page is **6,600px** with the guide shut and **14,092px**
with it open; more than half the page is guide.

It also opens itself whenever something needs it to: the
"Guide to Buying a Suppressor and HUB Adapter" tile, the section nav, a deep
link into a step (`…#g-8`), and any search — guide hits are useless while the
guide is hidden.

The collapse only applies when JavaScript has run —
`.js .guide-collapse.is-collapsed`. With JS off the whole guide is simply there.

## Caching while reviewing

`styles.css` and `app.js` are linked with a `?v=` query, and the local server
sends `Cache-Control: no-store`, because a stale stylesheet showed the guide's
collapsed button above fully visible content during review. Start the server
with `scratchpad/serve.py` rather than plain `python3 -m http.server`, or bump
the `?v=` number after a CSS change.

## Reading

The guide is a document, not an accordion — it reads top to bottom. What helps
without hiding anything:

- **Sticky contents list** beside the guide, marking the section in view.
- **Tighter paragraph spacing inside guide steps.** The source writes one
  sentence per paragraph; at full paragraph spacing those scatter. Spacing
  around tables, spec rows and callouts stays wide.
- **Panels fill the container; prose inside is capped.** On a wide screen a
  900px card inside a 1230px container left a dead strip down the right. The
  cards now span the full container and the text inside stops at 820px, so
  lines stay readable without the empty column.
- **Every answer and step has a stable id**, so support can link straight to
  one: `…/help#faq-serial`, `…/help#g-hub`. A linked FAQ answer opens itself.

## What is mine and what is yours

Two files track this so nothing gets mistaken for client copy:

- **`MY TEXT — needs your approval.md`** — every sentence on the page that is
  not from the documents or the brief. Five visible sentences plus navigation
  labels. Rewrite any of them and they drop straight in.
- **`DRAFT — HUB adapter section (needs client approval).md`** — the HUB adapter
  section is **not on the page**. The brief asks for a guide to buying a
  suppressor *and HUB adapter*, but neither document covers buying the adapter.
  I drafted one; it has been pulled until the client writes or approves it.
  The markup is kept in `DRAFT — HUB adapter markup.html`.

## Content rule

**The text in the two source documents is the client's. It is reproduced word
for word.** Contractions, punctuation, sentence breaks and capitalisation are
theirs, including the places where the two documents differ from each other
(`Cam-Lock` / `1/2-28` in the FAQ versus `CAM-LOK` / `1/2x28` in the guide,
`FFL / SOT` versus `FFL/SOT`). Do not tidy these.

A paragraph-by-paragraph diff against both `.docx` files leaves **zero**
unexplained differences. The only deliberate omissions are:

| Omitted | Why |
|---|---|
| `1.`, `2.`, `23a.` … before each question | The brief: the Q&A does not need to be numbered |
| `1.`–`4.` on the Order Status cards | The brief numbers them; on the page they are four headings without digits |
| `STEP 1:`, `STEP 2:` … prefixes merged into the headings | Rendered as a separate badge above each heading instead. The numbering runs 1–10 after the client asked for the document's gap at 9 to be closed |
| `Dealer Change Form: https://…` printed as text | The URL is on the button instead |
| `(link pending from Katie)` | Shown as the orange "link pending" flag |
| Document title `Suppressor FAQ` | The section heading reads "Frequently Asked Questions" |

Two sections of the guide are also surfaced twice, once in the guide where the
document puts them and once in their own dedicated section, because the brief
asks for both: "What if I want to change my order?" and "Backdraft lifetime
warranty".

Everything added beyond the documents is confined to the **"Which HUB adapter
do I need?"** block — see above.

## Checks

    fe-lint .    # CSS + markup: clean
    # axe-core wcag2a + wcag2aa: no violations
    # no horizontal scroll at 390px
    # no console errors, no failed requests

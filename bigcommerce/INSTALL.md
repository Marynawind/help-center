# Help Center — installing into the BigCommerce theme

Written for: whoever has Stencil CLI access to the backdraftsuppressors.com
theme.

## What is in this folder

```
templates/pages/custom/page/help-center.html   the page
assets/css/help-center.css                     its styles
assets/js/help-center.js                       its behaviour
assets/img/help-center-watermark.png           the Outlier watermark

snippets/help-button.html                      the site-wide Help button
assets/css/help-button.css                     its styles
```

Copy the four page files to the same paths inside the theme. The button is a
separate, optional step — see below.

## Then, in the store admin

1. **Storefront → Web Pages → Create a Web Page**
2. Page type **Contact Form or Web Page → Web Page**
3. Page name: `Help Center`
4. Leave the content editor **empty** — the content lives in the template
5. Under **Template Layout File**, choose **help-center**
6. Save, then push the theme (`stencil push`) if the template is new

The template only appears in that dropdown after the theme carrying it has been
pushed.

## The Help button on every page

A tab fixed to the right edge of the window, so it stays in place while the
page scrolls. On a phone it becomes a round button clear of the bottom-right
corner, because a full-height tab would cover too much of a small screen.

1. Copy `assets/css/help-button.css` into the theme.
2. Open `templates/layout/base.html`.
3. Paste the contents of `snippets/help-button.html` immediately before
   `</body>`.
4. If the Help Center page ends up on a URL other than `/help-center/`, change
   the `href` in that block.

It hides itself on the Help Center page, so the button never points at the page
you are already reading.

Everything is prefixed `hcb-` and sits at `z-index: 900`, which is below a
typical modal or cookie banner and above page content. Lower the number if it
covers a chat widget.

## Why nothing collides with the theme

The page and the theme share one document, so two things had to hold: nothing
here may leak out, and nothing there may reach in.

- **Every class is prefixed `hc-`.** Scoping alone is not enough — a theme rule
  like `.btn { … !important }` beats `.help-center .btn`. A name that does not
  exist in the theme cannot be overridden at all.
- **Every selector is scoped to `.hc-root`**, the wrapper around the whole
  page. The only unscoped rule is `:root`, which declares custom properties.
- **A guard block** re-establishes colour, family and spacing on bare elements
  (`p`, `li`, `td`…) inside the root, because a theme that styles elements
  directly beats inheritance from the wrapper.
- **The script looks nothing up outside the root.** It exits immediately if
  `.hc-root` is not on the page.

This was tested against a deliberately hostile stand-in theme — serif fonts,
red headings, `content-box` sizing, a 300px `.wrap`, `.btn` forced yellow with
`!important` — and both sides rendered exactly as they should.

## Fonts

The template loads Barlow and Roboto Condensed from Google Fonts. The theme
already requests both, but not every weight this page uses: it needs
Barlow 600 and Roboto Condensed 700, and the theme asks for Barlow 700 and
Roboto Condensed 400/600.

If you would rather not have the extra request, drop the three `<link>` tags
and add the missing weights to the theme's own font call instead.

## Editing the text later

The copy is in the template, so changes are a theme edit and a push. If the
team needs to edit it from the admin, the next step is to move each Q&A into a
widget or a HubDB-style store — say so and it can be reworked that way.

## Rebuilding

The page files are generated. `snippets/help-button.html` and
`assets/css/help-button.css` are hand-written and are not touched by the build.

Do not hand-edit the generated files:

```
python3 build-bigcommerce.py
```

from `index.html`, `styles.css` and `app.js` in the project root, which are the
standalone page. Edit those, rebuild, copy across.

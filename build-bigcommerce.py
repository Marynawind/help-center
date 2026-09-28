#!/usr/bin/env python3
"""Build the BigCommerce Stencil bundle from the standalone page.

The store theme and this page share a document, so two things must hold:
nothing here may leak out, and nothing there may reach in. Scoping alone is
not enough — a theme rule like `.btn { ... !important }` still wins over
`.help-center .btn`. So every class is prefixed `hc-` as well, which makes a
collision impossible rather than merely unlikely.

Run from the project root:  python3 build-bigcommerce.py
"""
import base64, os, re, shutil

ROOT_CLASS = 'hc-root'
PREFIX = 'hc-'
OUT = 'bigcommerce'

SRC_HTML, SRC_CSS, SRC_JS = 'index.html', 'styles.css', 'app.js'
SRC_WATERMARK = 'assets/watermark.png'

SKIP = {'png', 'css', 'js', 'com', 'html', 'mjs'}


def class_names():
    html, css, js = (open(f).read() for f in (SRC_HTML, SRC_CSS, SRC_JS))
    names = {c for m in re.findall(r'class="([^"]+)"', html) for c in m.split()}
    names |= set(re.findall(r'\.([a-zA-Z][\w-]*)', css))
    names |= set(re.findall(r"classList\.(?:add|remove|toggle|contains)\('([\w-]+)'", js))
    return sorted(n for n in names if n not in SKIP)


NAMES = class_names()
# Longest first, so `.faq-cat-title` is not half-rewritten by `.faq-cat`.
ORDERED = sorted(NAMES, key=len, reverse=True)


def rename_in_css(css):
    for n in ORDERED:
        css = re.sub(r'\.' + re.escape(n) + r'(?![\w-])', '.' + PREFIX + n, css)
    return css


def rename_in_html(html):
    def fix(m):
        classes = [PREFIX + c if c in NAMES else c for c in m.group(1).split()]
        return 'class="%s"' % ' '.join(classes)
    return re.sub(r'class="([^"]+)"', fix, html)


def rename_in_js(js):
    for n in ORDERED:
        js = js.replace("'." + n + "'", "'." + PREFIX + n + "'")
        js = js.replace("'." + n + " ", "'." + PREFIX + n + " ")
        js = js.replace(" ." + n + "'", " ." + PREFIX + n + "'")
        js = js.replace("'" + n + "'", "'" + PREFIX + n + "'")
    return js


# ---------------------------------------------------------------- CSS scoping
def split_top(css):
    out, i, n = [], 0, len(css)
    while i < n:
        if css.startswith('/*', i):
            j = css.find('*/', i + 2); j = n if j == -1 else j + 2
            out.append(('comment', css[i:j])); i = j
        elif css[i] in ' \t\r\n':
            j = i
            while j < n and css[j] in ' \t\r\n': j += 1
            out.append(('ws', css[i:j])); i = j
        else:
            j = css.find('{', i)
            if j == -1:
                out.append(('text', css[i:])); break
            depth, k = 0, j
            while k < n:
                if css[k] == '{': depth += 1
                elif css[k] == '}':
                    depth -= 1
                    if depth == 0: break
                k += 1
            out.append(('rule', css[i:k + 1])); i = k + 1
    return out


def scope_selector(sel):
    R = '.' + ROOT_CLASS
    out = []
    for p in (x.strip() for x in sel.split(',')):
        if p == ':root':
            out.append(p)
        elif p in ('html', 'body'):
            out.append(R)
        elif p.startswith(('html::', 'body::')):
            out.append(R + p[4:])
        elif p.startswith(('html.', 'body.', 'html ', 'body ')):
            out.append(R + p[4:])
        elif p.startswith('.' + PREFIX + 'js ') or p.startswith('.js '):
            out.append(R + '.is-js ' + p.split(' ', 1)[1])
        elif p.startswith(R):
            out.append(p)
        else:
            out.append(R + ' ' + p)
    return ',\n'.join(out)


def scope(css):
    out = []
    for kind, text in split_top(css):
        if kind == 'rule' and not text.lstrip().startswith('@'):
            i = text.index('{')
            out.append(scope_selector(text[:i].strip()) + ' ' + text[i:])
        elif kind == 'rule':
            i, j = text.index('{'), text.rindex('}')
            out.append(text[:i + 1] + scope(text[i + 1:j]) + '}')
        else:
            out.append(text)
    return ''.join(out)


def build():
    for d in ('templates/pages/custom/page', 'assets/css', 'assets/js', 'assets/img'):
        os.makedirs(os.path.join(OUT, d), exist_ok=True)

    # ---- stylesheet
    css = scope(rename_in_css(open(SRC_CSS).read()))
    css = css.replace('url("assets/watermark.png")',
                      'url("../img/help-center-watermark.png")')
    # Standalone, the watermark sits on <body> over a painted <html>. Embedded
    # there is no such pair: the root must paint its own background, and it
    # must form a stacking context, or the z-index:-1 watermark lands beneath
    # that background instead of above it.
    css = css.replace('.%s {\n  margin: 0;\n  background: transparent;' % ROOT_CLASS,
                      '.%s {\n  margin: 0;\n  position: relative;\n  z-index: 0;\n'
                      '  background: var(--bg);' % ROOT_CLASS)
    # A theme that styles bare elements (`p { color: … }`) beats inheritance
    # from the root, so re-establish those properties inside the page. Each
    # rule here is (0,1,0) or (0,1,1); every generated rule is at least as
    # specific and comes later, so nothing of ours is affected.
    guard = """/* ---------- Guard against the theme reaching in ---------- */
.%(root)s * {
  color: inherit;
  font-family: inherit;
  letter-spacing: normal;
}
.%(root)s p,
.%(root)s li,
.%(root)s dt,
.%(root)s dd,
.%(root)s td,
.%(root)s th,
.%(root)s span,
.%(root)s summary { font-size: inherit; line-height: inherit; }
.%(root)s a { text-decoration: underline; }
.%(root)s strong, .%(root)s b { font-weight: bold; }
.%(root)s em, .%(root)s i { font-style: italic; }
.%(root)s ul, .%(root)s ol { list-style: none; }
.%(root)s table { border-collapse: collapse; }
.%(root)s img, .%(root)s svg { max-width: 100%%; }

""" % {'root': ROOT_CLASS}

    marker = '/* ---------- Headings ---------- */'
    css = css.replace(marker, guard + marker, 1) if marker in css else guard + css

    open(os.path.join(OUT, 'assets/css/help-center.css'), 'w').write(
        "/* Backdraft Suppressors — Help Center\n"
        "   Generated by build-bigcommerce.py. Edit styles.css and rebuild.\n"
        "   Every selector is scoped to .%s and every class is prefixed\n"
        "   `%s`, so the theme and this page cannot reach each other.\n"
        "   The watermark path is relative to this file: assets/css -> assets/img. */\n\n"
        % (ROOT_CLASS, PREFIX) + css)

    # ---- script
    js = rename_in_js(open(SRC_JS).read())
    js = js.replace("var root = document.querySelector('.%shelp-center');" % PREFIX,
                    "var root = document.querySelector('.%s');" % ROOT_CLASS)
    js = js.replace("""  document.documentElement.classList.add('js');

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(s));
  };""",
"""  /* Everything is looked up inside the page root, so this script cannot
     touch the theme's markup and the theme cannot confuse it. */
  var root = document.querySelector('.%s');
  if (!root) return;
  root.classList.add('is-js');

  var $  = function (s, c) { return (c || root).querySelector(s); };
  var $$ = function (s, c) {
    return Array.prototype.slice.call((c || root).querySelectorAll(s));
  };""" % ROOT_CLASS)
    js = js.replace("    var el = document.getElementById(id);\n    if (!el) return;",
                    "    var el = document.getElementById(id);\n    if (!el || !root.contains(el)) return;")
    open(os.path.join(OUT, 'assets/js/help-center.js'), 'w').write(
        "/* Backdraft Suppressors — Help Center\n"
        "   Generated by build-bigcommerce.py. Edit app.js and rebuild. */\n" +
        js[js.index('(function ()'):])

    # ---- template
    html = open(SRC_HTML).read()
    body = html[html.index('<main id="main">'):html.index('</main>') + len('</main>')]
    to_top = re.search(r'<button class="to-top".*?</button>', html, re.S).group(0)
    body = rename_in_html(body + '\n  ' + to_top)
    body = body.replace('<main id="main">', '<div class="%s" id="help-center">' % ROOT_CLASS)
    body = body.replace('</main>', '')
    body = body.rstrip() + '\n</div>\n'

    tpl = ('{{!--\n'
           '    Backdraft Suppressors — Help Center\n\n'
           '    Custom page template. See bigcommerce/INSTALL.md.\n'
           '--}}\n'
           '{{#partial "page"}}\n\n'
           '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
           '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
           '<link href="https://fonts.googleapis.com/css?family=Roboto+Condensed:400,600,700%7CBarlow:400,600,700&display=swap" rel="stylesheet">\n'
           "<link rel=\"stylesheet\" href=\"{{cdn 'assets/css/help-center.css'}}\">\n\n"
           + body +
           "\n<script src=\"{{cdn 'assets/js/help-center.js'}}\" defer></script>\n\n"
           '{{/partial}}\n'
           '{{> layout/base}}\n')
    open(os.path.join(OUT, 'templates/pages/custom/page/help-center.html'), 'w').write(tpl)

    shutil.copy(SRC_WATERMARK, os.path.join(OUT, 'assets/img/help-center-watermark.png'))
    print('built %d classes prefixed, scoped to .%s' % (len(NAMES), ROOT_CLASS))


# --------------------------------------------------------------- single file
def build_single():
    """Two self-contained files: everything inlined, no assets to upload."""
    os.makedirs('single-page', exist_ok=True)
    watermark = base64.b64encode(open(SRC_WATERMARK, 'rb').read()).decode()
    data_uri = 'data:image/png;base64,' + watermark
    fonts = ('https://fonts.googleapis.com/css?family='
             'Roboto+Condensed:400,600,700%7CBarlow:400,600,700&display=swap')

    # ---- standalone: a complete document
    html = open(SRC_HTML).read()
    css = open(SRC_CSS).read().replace('url("assets/watermark.png")',
                                       'url("%s")' % data_uri)
    js = open(SRC_JS).read()
    doc = html
    # A plain replacement — re.sub would read backslashes in the code as escapes.
    doc = re.sub(r'\n<link rel="stylesheet" href="styles\.css[^"]*">',
                 lambda m: '\n<style>\n' + css + '\n</style>', doc)
    doc = re.sub(r'\n<script src="app\.js[^"]*"></script>',
                 lambda m: '\n<script>\n' + js + '\n</script>', doc)
    open('single-page/help-center.html', 'w').write(doc)

    # ---- embed: scoped, no <html>/<head>/<body>, for a page content editor
    tpl = open(os.path.join(OUT, 'templates/pages/custom/page/help-center.html')).read()
    inner = tpl[tpl.index('{{#partial "page"}}') + len('{{#partial "page"}}'):
                tpl.index('{{/partial}}')]
    scoped_css = open(os.path.join(OUT, 'assets/css/help-center.css')).read()
    scoped_css = scoped_css.replace('url("../img/help-center-watermark.png")',
                                    'url("%s")' % data_uri)
    scoped_js = open(os.path.join(OUT, 'assets/js/help-center.js')).read()
    # drop the asset links; the styles and script come inline instead
    inner = re.sub(r'<link rel="preconnect"[^>]*>\n', '', inner)
    inner = re.sub(r'<link href="https://fonts\.googleapis[^>]*>\n', '', inner)
    inner = re.sub(r'<link rel="stylesheet" href="\{\{cdn[^>]*>\n', '', inner)
    inner = re.sub(r'<script src="\{\{cdn[^>]*></script>\n', '', inner)
    embed = ('<!-- Backdraft Suppressors — Help Center\n'
             '     One block: markup, styles and script, with the watermark\n'
             '     inlined. Paste into the page editor in SOURCE/HTML mode —\n'
             '     a visual editor will strip the <style> and <script>. -->\n'
             '<style>\n@import url("%s");\n\n%s\n</style>\n'
             % (fonts, scoped_css)
             + inner.strip() + '\n\n<script>\n' + scoped_js + '\n</script>\n')
    open('single-page/help-center-embed.html', 'w').write(embed)

    for f in ('single-page/help-center.html', 'single-page/help-center-embed.html'):
        print('%-38s %6.0f KB' % (f, os.path.getsize(f) / 1024))


if __name__ == '__main__':
    build()
    build_single()

# Preview assets

`mdi-paths.json` contains the SVG path data for the small subset of Material
Design icons used in the synthetic design and component previews. Source:
https://github.com/Templarian/MaterialDesign/tree/master/svg . The accompanying
Apache 2.0 license is `MaterialDesign-LICENSE.txt`. These are preview stand-ins
for the same `mdi:` icons supplied by Home Assistant in production.

Font licenses are in `frontend/fonts/`. Exact static Inter 400/500/600 and
Cormorant Garamond 400/500 fonts are embedded through `frontend/echo-fonts.js`; the font
sources are Google Fonts' static TTF distributions, subset to Latin and encoded
as WOFF2. The design test validates their actual rendered face names.

# Light and dark themes

Cards follow `hass.themes.darkMode` on each Home Assistant update. Home Assistant resolves the profile Light, Dark, or Auto selection; cards do not read the OS preference independently. Missing theme data falls back to light. Each card toggles `echo-dark`, which selects the shared CSS palette without rebuilding controls or restarting templates. Nested cards receive the same hass object.

Install the rebuilt `dist/ha-simply-cards.js` using your existing resource URL, then refresh the frontend cache. No card YAML changes or backend services are required. Explicit Entity icon/background colors and custom Jinja output stay unchanged, even when they match a built-in hex color. Built-in appearance templates adapt locally after their server response; no theme data is sent to Jinja.

Dashboard backgrounds are outside the cards. Remove a fixed view background such as `#F7F8FA`, or use:

```yaml
background: var(--primary-background-color)
```

The palette uses porcelain and limestone surfaces, champagne and sage accents, and charcoal text. Cooling, heating and warning colors retain their distinct meanings. Real media artwork keeps its original colors; empty artwork uses a pastel gradient with a muted counterpart in dark mode. White artwork icons and switch thumbs remain white. The editor already uses Home Assistant CSS variables. This implementation follows HA mode while keeping the cards’ own visual identity; it does not inherit every arbitrary theme color.

## Compatibility token mapping

Legacy names remain stable. See [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) for the current visual system.

| Legacy token suffix | Light value | Dark value |
| --- | --- | --- |
| 202732 | #1D302E | #F3F1EC |
| 202734 | #1D302E | #F3F1EC |
| 253041 | #1D302E | #F3F1EC |
| 263140 | #1D302E | #F3F1EC |
| 293646 | #1D302E | #E9E2D7 |
| 818996 | #7A807D | #B9B6AF |
| ffffff | #FFFDF9 | #242625 |
| fff9ef | #E9E2D7 | #383B33 |
| 18212e | #1D302E | #F7F4ED |
| 24303e | #1D302E | #F3F1EC |
| 8a929e | #7A807D | #B9B6AF |
| 89919d | #7A807D | #B9B6AF |
| a0a6b0 | #72736C | #B9B6AF |
| e9f2fe | #FFFDF9 | #343A33 |
| bcd1eb | #E9E2D7 | #242625 |
| 475a73 | #7A807D | #B9B6AF |
| 20334c | #1D302E | #F3F1EC |
| 61748d | #7A807D | #B9B6AF |
| f3bd35 | #B29673 | #D5B78E |
| f2f4f7 | #E9E2D7 | #444A41 |
| fafbfd | #FFFDF9 | #282C29 |
| e6f0ff | #E6F0FF | #223D60 |
| 3478f6 | #3478F6 | #82B4FF |
| fde9df | #FDE9DF | #4B3027 |
| ee773b | #EE773B | #FFAD80 |
| e6f4ef | #E2ECE3 | #34463D |
| fff0cd | #EDE3D3 | #44391F |
| f0f2f5 | #E9E2D7 | #444A41 |
| 2a9477 | #2D725C | #9BD5B9 |
| c68b14 | #9A794B | #D5B78E |
| 8b93a0 | #72736C | #B9B6AF |
| e5a51a | #B29673 | #C7A87C |
| d8dde4 | #D6CEC2 | #555C51 |
| e4f5ec | #E2ECE3 | #34463D |
| fdece3 | #FDECE3 | #493127 |
| 21926d | #2D725C | #9BD5B9 |
| c97445 | #C97445 | #F5B18A |

## Verification and preview

Run `npm test`, `npm run build`, and `npm run test:bundle`. Set `ECHO_BROWSER_PATH` if Playwright’s bundled browser is unavailable. Open `tests/preview.html?mode=comparison` through a local HTTP server for all public types, variants and legacy Fan/Security cards paired side by side. `node tests/theme.cjs` writes `tests/theme-comparison.png` and verifies live switching, effective mode precedence, stable DOM, nested propagation and preservation of explicit colors. Preview icons and backend state are mocked; validate the final installation in Home Assistant.

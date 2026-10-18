# Light and dark themes

Cards follow `hass.themes.darkMode` on each Home Assistant update. Home Assistant resolves the profile Light, Dark, or Auto selection; cards do not read the OS preference independently. Missing theme data falls back to light. Each card toggles `echo-dark`, which selects the shared CSS palette without rebuilding controls or restarting templates. Nested cards receive the same hass object.

Install the rebuilt `dist/ha-simply-cards.js` using your existing resource URL, then refresh the frontend cache. No card YAML changes or backend services are required. Explicit Entity icon/background colors and custom Jinja output stay unchanged, even when they match a built-in hex color. Built-in appearance templates adapt locally after their server response; no theme data is sent to Jinja.

Dashboard backgrounds are outside the cards. Remove a fixed view background such as `#F7F8FA`, or use:

```yaml
background: var(--primary-background-color)
```

The palette retains warm header tones, blue weather tones and the existing state color meanings. Artwork, the artwork placeholder gradient, white artwork icons and white switch thumbs retain their original colors. The editor already uses Home Assistant CSS variables. This implementation follows HA mode while keeping the cards’ own visual identity; it does not inherit every arbitrary theme color.

## Existing palette and dark equivalents

| Existing light color | Dark equivalent |
| --- | --- |
| `#202732` | `#E7EDF5` |
| `#202734` | `#E7EDF5` |
| `#253041` | `#E7EDF5` |
| `#263140` | `#E7EDF5` |
| `#293646` | `#DCE5F0` |
| `#818996` | `#ADB8C7` |
| `#FFFFFF` | `#202731` |
| `#FFF9EF` | `#302C28` |
| `#18212E` | `#F0F3F7` |
| `#24303E` | `#E7EDF5` |
| `#8A929E` | `#ADB8C7` |
| `#89919D` | `#ADB8C7` |
| `#A0A6B0` | `#9EABBD` |
| `#E9F2FE` | `#253C58` |
| `#BCD1EB` | `#172A43` |
| `#475A73` | `#BDCEE4` |
| `#20334C` | `#E4EFFD` |
| `#61748D` | `#A8BDD7` |
| `#F3BD35` | `#FFD166` |
| `#F2F4F7` | `#303B49` |
| `#FAFBFD` | `#26313E` |
| `#E6F0FF` | `#223D60` |
| `#3478F6` | `#82B4FF` |
| `#FDE9DF` | `#4B3027` |
| `#EE773B` | `#FFAD80` |
| `#E6F4EF` | `#203E35` |
| `#FFF0CD` | `#44391F` |
| `#F0F2F5` | `#303945` |
| `#2A9477` | `#76D6B2` |
| `#C68B14` | `#F4CC71` |
| `#8B93A0` | `#B0BAC8` |
| `#E5A51A` | `#D9AA43` |
| `#D8DDE4` | `#4C596B` |
| `#E4F5EC` | `#203D33` |
| `#FDECE3` | `#493127` |
| `#21926D` | `#79D7AE` |
| `#C97445` | `#F5B18A` |

Shadow: `rgba(30,40,60,0.045)` → `rgba(0,0,0,0.24)`. The unchanged artwork gradient is `#b9b2e4`, `#edafbf`, `#f4c89a`; the switch thumb stays `white` and its shadow stays `#0002`.

## Verification and preview

Run `npm test`, `npm run build`, and `npm run test:bundle`. Set `ECHO_BROWSER_PATH` if Playwright’s bundled browser is unavailable. Open `tests/preview.html?mode=comparison` through a local HTTP server for all public types, variants and legacy Fan/Security cards paired side by side. `node tests/theme.cjs` writes `tests/theme-comparison.png` and verifies live switching, effective mode precedence, stable DOM, nested propagation and preservation of explicit colors. Preview icons and backend state are mocked; validate the final installation in Home Assistant.

# Simply Cards design system

The visual direction uses quiet surfaces, warm
neutrals, restrained accents, generous spacing, and photography for navigation.
This document is the design source of truth. AGENTS.md points contributors here.
Design-language updates do not authorize dashboard rearrangement. New components,
the horizontal entity layout, and alternate header arrangements are opt-in.
Preserve existing dashboard layouts and entity orientation unless requested.
Weather imagery and condition-specific light/dark treatments follow the supplied
[ATELIER reference](weather-assets/reference.png); see [WEATHER.md](WEATHER.md).
Keep gradients for the room/time header and empty media artwork.

## Palette

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| Porcelain | #FFFDF9 | #242625 | Card surface |
| Limestone | #E9E2D7 | #444A41 | Recessed controls and tracks |
| Champagne | #B29673 | #C7A87C | Lighting, selection, warm accents |
| Sage | #2D725C | #9BD5B9 | Positive state accents |
| Charcoal | #1D302E | #F3F1EC | Primary text |
| Canvas | #F5F3EE | #171A19 | Suggested dashboard background |
| Secondary text | #7A807D | #B9B6AF | Descriptions and labels |

Hex values are sampled approximations of the supplied swatches, not a claim to
recover original design file values. Dark mode uses green charcoal, warm pale
text, and lighter accents rather than simply inverting the light theme.
Keep cooling blue, heating orange, and warning amber distinct for familiar Home
Assistant semantics. Positive entity states use sage, lights use warm champagne
tones, and inactive states use limestone. Explicit user colors remain literal.
Lighting Control cards use a warmer active gold in light mode: icon #B5811F,
badge #FFF0CE, and switch/slider #D3A039. Dark-mode Control colors are #D5B78E,
#44391F, and #E5BA78 respectively. These semantic Control colors do not alter
Entity-card appearance defaults.
Built-in legacy `--echo-color-*` names remain stable; their values are mapped in
`frontend/echo-theme.js`. Read those names as compatibility identifiers.

## Typography

| Element | Family | Weight |
| --- | --- | --- |
| Room title and weather condition | Cormorant Garamond | 400 |
| Greeting | Inter | 500 |
| Navigation and secondary descriptions | Inter | 400 |
| Section headings and card labels | Inter | 500 |
| Temperature and numbers | Inter | 500–600 |

Exact static Latin webfont faces are embedded in the JavaScript resource, with OFL licenses
under `frontend/fonts/`. No Google Fonts request is made at runtime. Other scripts
fall back to Segoe UI / Arial or Georgia. Override `--echo-font-interface` and
`--echo-font-display` on an ancestor to use a household theme's fonts.
Reserve the serif for the room title and weather condition only. All other text,
including greeting, Music, Security, labels, descriptions, time, date, and numeric
readings, uses Inter. Shared production styles live in `frontend/echo-design.js`.
The expanded type/icon proportions scale with each card's allocated CSS height,
down to 65% of its reference size, before switching to the compact layout.
Validate the demo at both 1280×800 and 960×600 CSS pixels (the latter models
133% effective display scale). Media artwork must reserve room for the actual
four transport buttons and their gaps; controls must never overlap.

## Shape, hierarchy, and interaction

- Control/group cards use 28px rounding; entity rows/tiles use 20px rounding.
  Native grid sizing remains supported.
- Image Buttons use 16px corners, edge-to-edge photos, a dark scrim, white labels,
  a small icon at the upper left, and a champagne inset ring when selected.
- Scene headings use Inter 500 at 17px/22px; descriptions use Inter 400 at
  13px/18px. Use a 26px icon in a 44px tap target, 12px vertical padding,
  and 4px text-row gaps. The content needs at least 116px height; prefer 132px.
- Use 12–20px internal spacing; keep numeric readings prominent and descriptions
  secondary. Avoid bold labels everywhere, saturated backgrounds, and heavy shadows.
- Horizontal entity rows place a circular 44px icon left of two left-aligned lines:
  name above state. Use these for Home Status; use vertical tiles for compact grids.
- Card and icon each support tap, hold, and double tap through the shared action
  system, including confirmation, keyboard activation, and preview suppression.
- Use readable, quiet photographs. The dark overlay provides text contrast;
  choose photos whose detail does not interfere with labels. Missing photos fall
  back to charcoal. Do not bake labels or controls into photographs.

## Home Assistant usage

Dark mode follows `hass.themes.darkMode` live, including nested cards. Set the
dashboard canvas through your HA theme (`primary-background-color`) to match the
canvas above; cards do not change Home Assistant's global theme.

```yaml
type: custom:echo-image-button-card
entity: scene.example
image: /local/example-room.jpg
icon: mdi:sofa-outline
heading: Relax
subheading: Dim lights, cozy mood
selected: true
tap_action:
  action: perform-action
  perform_action: scene.turn_on
  target:
    entity_id: scene.example
icon_tap_action:
  action: more-info
```

For rooms, replace the tap action with `action: navigate` and
`navigation_path: /lovelace/example-room`. Entity is optional for navigation;
provide it for toggle and more-info actions. Service actions can use their explicit
target even without a card entity or when a scene has never been activated. `image` accepts relative,
HTTP, or HTTPS URLs. Both action targets also support `hold_action` and
`double_tap_action` (prefix with `icon_` for the icon). Actions default to none.
`selected` is an explicit dashboard setting, since scenes do not expose a
reliable currently-active state.

```yaml
type: custom:echo-entity-card
entity: lock.example
name: Example entry
layout: horizontal
```

The existing `vertical: false` setting remains supported; `layout` takes priority.
Horizontal rows advertise one native grid row; you can retain two for more space.
The visual editors expose both new card fields and actions.

## Preview

`tests/luxury-preview.html` renders the actual cards at Echo Show size in light
and dark modes. `tests/luxury-dark-960x480.png` is the captured dark mock.
Preview photography is replaced by a local architectural SVG illustration so the
fixture is deterministic and offline. Use actual room photos in production.

`tests/design-preview.html` is a fictional dashboard fixture with synthetic IDs,
generic labels, local MDI paths, and no private deployment configuration. It
renders the production styles directly. Run `node tests/design.cjs` to capture
both themes and verify typography, layout, and media-icon centering.

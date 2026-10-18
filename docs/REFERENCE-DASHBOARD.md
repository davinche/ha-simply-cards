# Reference dashboard cookbook

[Importable dashboard YAML](../examples/reference-dashboard.yaml) contains five
scrollable Sections views, 37 top-level card examples and 48 card instances
including Container children. It covers all ten public/compatibility card types.
It requires Simply Cards, not layout-card, card-mod, or a custom theme.

## Install

1. Create a new empty dashboard in Home Assistant, take control if prompted,
   open its raw configuration editor, and paste the complete YAML. This is a
   dashboard document with `title` and `views`, not an individual card.
2. Replace the nine `.example` entity IDs with your own weather, switch,
   dimmable light, fan, thermostat, media player, two locks, and garage cover.
   Keep any actual deployment-specific copy outside this public repository.
3. Install beta.9 or newer. Image Buttons reference `image: weather:cloudy`; the
   existing bundled
   photograph is reused without a file upload. Normal image URLs remain supported.
4. Switch Home Assistant light/dark mode to compare the same examples. The view
   background uses `light-dark()`; on browsers that do not support it, use
   `background: var(--primary-background-color)` instead.

Navigation examples use relative paths such as `./controls`, so they stay within
the imported dashboard. Scene-style Image Buttons are inactive. Other explicitly
configured control actions operate the mapped entities when tapped; this is a
functional reference, not a device simulator.

## Contents

| View | Examples |
| --- | --- |
| Headers and Weather | Automatic/stacked/compact headers, static/Jinja text, hidden date, weather gradient/images, stacked/inline weather, hidden humidity |
| Controls | Switch, brightness slider, slider-disabled light, fan speed, fan power, original Fan alias |
| Climate and Media | Read-only thermostat presentation, temperature buttons, optional HVAC cycling, wide/tall/short media allocations |
| Entities and Groups | Vertical/horizontal entities, state attributes, hidden state, explicit colors, entity pictures, Jinja appearance, 1/2/3-column containers, square tiles, original Security group |
| Images and Actions | Weather-photo Image Buttons, selected ring, navigation, no-image fallback, card/icon gestures, service data, confirmation, external URL, explicit no-action |

States and media artwork are live. Two examples using the same entity display
the same state; the YAML does not force an entity on or off. Pictures appear
only when the entity exposes `entity_picture`. Sliders require brightness or fan
percentage support. The selected Image Button ring is configured, not inferred
from scene state.

## Range thermostats

Only enable this variant if your climate entity exposes `target_temp_low` and
`target_temp_high`; the main catalog does not assume one exists:

```yaml
type: custom:echo-climate-card
entity: climate.example
show_temperature_control: true
temperature_target: low # Use high for the cooling maximum.
```

HVAC cycling examples require the entity to support both configured modes.
Remove `hvac_modes` and use `icon_tap_action: {action: none}` if it does not.

## Boundaries and verification

Internal `echo-art-card`, `echo-media-action-card`, `echo-fan-power-card`, and
`echo-security-tile-card` elements are composed inside public cards and are not
included as standalone configuration targets.

`tests/catalog.cjs` parses the public YAML and renders that exact configuration
through the existing Home Assistant mock harness, in both themes at 1280px and
800px. It checks registered-type coverage, synthetic entity IDs, image loading,
viewport width, and card-content bounds; captures are written to
`tests/catalog-1-light.png` through `tests/catalog-5-dark.png` and ignored by Git.
The mock models the cookbook's Jinja expressions; it does not run a Home
Assistant server, fetch live state, or prove native Sections/editor behavior.
Check those after importing. Reference changes do not alter room dashboards.

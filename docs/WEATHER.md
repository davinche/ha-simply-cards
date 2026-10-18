# ATELIER weather card

Condition backgrounds belong to `custom:echo-weather-card` (the Outside card),
not the thermostat / `custom:echo-climate-card`.

```yaml
type: custom:echo-weather-card
entity: weather.example
weather_images: true
```

The visual editor exposes **Condition background images (ATELIER)**. This is
opt-in: omitting the option retains a gradient weather card. Header and music
placeholders retain gradients, and enabling weather images does not change the
dashboard composition or entity-card orientation.

## Assets and state mapping

The supplied `atelier_weather_v3_1` pack covers the [15 Home Assistant weather
conditions](https://www.home-assistant.io/integrations/weather/#condition-mapping)
and two fallback states. Images are embedded unchanged in
`frontend/echo-weather-images.js` so the existing single-file HACS release works
offline without extra image installation or external requests. This adds about
4.3 MB of uncompressed JavaScript to the resource; browsers can cache the bundle.

The original reference sheet and icon manifest are preserved under
`docs/weather-assets/`. Condition names, icon tone families, and fallback wording
follow that sheet. `windy-variant` displays **Windy** while retaining its own image
and MDI icon. Unknown or unsupported condition values select the unknown image.

| State | Display | MDI icon |
| --- | --- | --- |
| clear-night | Clear Night | weather-night |
| cloudy | Cloudy | weather-cloudy |
| fog | Fog | weather-fog |
| hail | Hail | weather-hail |
| lightning | Lightning | weather-lightning |
| lightning-rainy | Lightning Rainy | weather-lightning-rainy |
| partlycloudy | Partly Cloudy | weather-partly-cloudy |
| pouring | Pouring | weather-pouring |
| rainy | Rainy | weather-rainy |
| snowy | Snowy | weather-snowy |
| snowy-rainy | Snowy Rainy | weather-snowy-rainy |
| sunny | Sunny | weather-sunny |
| windy | Windy | weather-windy |
| windy-variant | Windy | weather-windy-variant |
| exceptional | Exceptional | alert-outline |
| unknown | Unknown | help-circle-outline |
| unavailable | Unavailable | cloud-off-outline |

Unknown and unavailable states show `--` plus the configured temperature unit,
with **No data available** or **Weather service unavailable**, respectively.
User-authored label, condition, temperature, humidity, and icon templates remain
supported. Only exact previous shipped default templates are upgraded to the
complete condition mapping; custom template sources are preserved.

## Theme and typography

The same condition image is used in both themes. A theme-aware horizontal scrim
keeps the text side readable while leaving the landscape visible on the right.
Light mode uses charcoal primary text and gray secondary text; dark mode uses
warm white primary text and pale gray secondary text. Icon colors follow the
reference's neutral, moon, amber, rain-blue, or snow-blue family.

The weather condition uses Cormorant Garamond Regular. Label, temperature, and
humidity use Inter. The room title is the only other
serif element. Images and foreground colors react to weather state and Home
Assistant theme changes without rebuilding the card.

## Verification and previews

`node tests/weather.cjs` verifies all 17 assets and icons in both themes, image
dimensions, fallback messages, zero/Celsius values, theme switching, custom
templates, image opt-out, and media icon centering. Add `--bundle` to exercise the
built release.

The test captures fictional 1280 × 800 demo dashboards for Sunny, Snowy, and
Lightning Rainy in both themes at
`tests/design-weather-<state>-<light|dark>-1280x800.png`.

The visual system, weather imagery, and media centering are implemented in the
component source. Public fixtures contain only synthetic data. Physical-device
and live Home Assistant validation remain separate from browser verification.

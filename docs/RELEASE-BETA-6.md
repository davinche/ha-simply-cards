# v0.1.1-beta.6

- New shared light/dark visual system with exact bundled Inter Regular, Medium,
  and SemiBold faces. Cormorant Garamond Regular is reserved for room titles and
  weather conditions; other interface text uses Inter.
- New Image Button card with image, icon, heading, description, selection border,
  visual editor, and separate card/icon tap, hold, and double-tap actions.
- Optional horizontal Entity layout. Existing entities remain vertical unless
  explicitly configured otherwise.
- Optional ATELIER condition imagery for Weather cards: all 15 weather conditions
  plus unknown/unavailable fallbacks, matching icons, and theme-aware text/scrims.
- Fixed media-button icon centering and grouped playback controls in larger card
  allocations. Compact and portrait layouts remain supported.
- Public fixtures use fictional labels and synthetic IDs. Private deployment
  reviews are excluded; CI includes a privacy-pattern check.

## Configuration

Enable embedded weather imagery:

```yaml
type: custom:echo-weather-card
entity: weather.example
weather_images: true
```

Opt into a horizontal entity:

```yaml
type: custom:echo-entity-card
entity: sensor.example
layout: horizontal
```

Add `custom:echo-image-button-card` through the picker or see
`docs/DESIGN-SYSTEM.md` for its action configuration.

Existing custom-element names, entity configurations, actions, and dashboard
composition remain supported. This update does not add scene rows or rearrange
dashboards. Explicit custom colors and template sources remain supported.

The weather photographs and fonts are embedded for offline use, so the
uncompressed resource is approximately 4.5 MB. No separate image installation is
required. After updating through HACS, fully reload dashboard browsers.

## Validation

Source and release-bundle browser suites cover editor round trips, gestures,
responsive layouts, exact rendered fonts, all 17 weather assets in both themes,
fallback behavior, theme switching, and media-icon alignment. Privacy patterns
and staged-file review are checked before publication.

This remains a prerelease. Browser tests use simulated Home Assistant state;
physical-device and live Home Assistant verification remain separate checks.

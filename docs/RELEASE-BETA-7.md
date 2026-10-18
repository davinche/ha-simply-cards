# v0.1.1-beta.7

- Fixed inconsistent typography and icon proportions on displays with a smaller
  effective CSS viewport. The expanded design now scales with card height,
  instead of abruptly falling back at 180px.
- Fixed overlapping media transport buttons. Artwork sizing now reserves the
  full control-row width, and buttons adapt to narrower allocations.
- Added light/dark regression captures at 1280×800 and 960×600 CSS pixels,
  including checks for design hierarchy and control spacing.

Existing dashboard composition, entity orientation, and explicit compact/stacked
layout choices are preserved. Weather backgrounds remain opt-in through
`weather_images: true` or the visual editor's ATELIER image checkbox.

After updating through HACS, fully reload dashboard browsers. Automated source
and bundled browser checks cover simulated Home Assistant layouts; physical
device verification remains pending.

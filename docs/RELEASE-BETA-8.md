# v0.1.1-beta.8

- Restored distinct on/off icon and badge colors for Control cards. Lighting
  uses warm gold when active; fan controls retain their sage state colors.
- Warmer yellow-gold active lighting controls in light mode, with a pale yellow
  icon background. Dedicated Control colors preserve Entity-card defaults.
- Consistent brightness/fan slider tracks, progress fills, and thumbs in light
  and dark mode, including progress updates while dragging.
- Added on/off color regression checks and rendered Control comparisons with
  and without brightness sliders. Visual verification is now documented as a
  contributor requirement.

The approved serif remains Cormorant Garamond Regular 400. Dashboard composition
and default slider visibility are unchanged. Enable `slider: true` on a Control
card backed by a dimmable light or supported fan to display its slider.

After updating through HACS, fully close and reopen dashboard browsers. These
changes do not modify dashboard YAML. Weather imagery remains opt-in through
`weather_images: true`.

Validation covers source and bundled browser suites, simulated light/dark
dashboards, toggle state transitions, slider interactions, and privacy checks.
Physical Echo Show and live Home Assistant verification remain pending.

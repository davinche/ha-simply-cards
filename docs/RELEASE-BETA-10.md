# v0.1.1-beta.10

Two opt-in typography settings make compact dashboards more consistent:

```yaml
# Header card
title_weight: 500

# Control or original Fan card
compact_labels: true
```

The header option uses a real bundled Cormorant Garamond Medium 500 face rather
than synthetic bold. Its Latin subset adds approximately 24 KB of font data.
Header weight remains Regular 400 by default; weather text is unchanged.

Compact labels use Inter 500 at 16px with 22px line height, consistently for
toggle-only controls and controls with a brightness/fan slider. The same option
works with the original Fan alias. Both settings are exposed in visual editors.

Existing layouts and typography remain unchanged unless the options are enabled.
Source and bundled browser tests check the actual rendered Medium face, matching
labels, editor round trips, default restoration and clipping at 800x400 and
960x480 in both themes. Approved compact previews match the implementation;
large-dashboard renders match their pre-change baselines.

Update through HACS and fully reopen dashboard browsers before applying the
new options. Physical Echo Show and live Home Assistant verification remain
pending. Public examples and tests contain synthetic entities only.

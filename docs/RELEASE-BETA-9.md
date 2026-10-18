# v0.1.1-beta.9

Image Button now supports the bundled weather photographs directly:

```yaml
type: custom:echo-image-button-card
heading: Relax
subheading: Warm lights, quiet mood
icon: mdi:sofa-outline
image: weather:cloudy
```

No image upload or separate asset installation is needed. All bundled weather
condition keys are supported, including unknown/unavailable. HTTP(S) and local
image URLs continue to work. Invalid weather keys use the dark fallback surface.

The public reference dashboard now includes five labeled views with 37 top-level
examples (48 card instances including nested children), using placeholder entities.
It covers all ten public/compatibility card types and common layouts, sliders,
templates, groups, gestures, confirmation, and Image Button options.

Validation includes source and release-bundle browser suites; all bundled images
are decoded in Image Buttons in both themes. The exact public reference YAML is
parsed and rendered at 1280px and 800px, with image loading and content bounds
checked. Private deployment YAML and personal entity/user IDs are excluded.

Update to this beta through HACS, then fully close and reopen dashboard browsers.
Existing `image: weather:cloudy` configurations will then load the photograph.
The image key is static: it selects a bundled image, not a live weather entity.
Physical-device and live Home Assistant verification remain pending.

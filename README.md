# HA Simply Cards

Reusable custom Home Assistant dashboard cards with visual editors, optional Jinja text, and native Grid/Sections sizing. Cards render their own design; native cards are configuration references, not rendering wrappers.

The repository is named HA Simply Cards. Existing `custom:echo-…-card` types are deliberately retained so installed dashboards do not need renaming.

Cards automatically follow Home Assistant’s light/dark setting. See [the palette, integration details and comparison preview](docs/THEMING.md).

## Install through HACS

The repository must be public, and its first release must finish building before installation. HACS does not install the editable source directory.

1. In HACS, open the menu → **Custom repositories**.
2. Add `https://github.com/davinche/ha-simply-cards` with type **Dashboard**.
3. Find **HA Simply Cards**, download the latest release, and reload the browser.
4. Check Settings → Dashboards → Resources. If HACS has not added the resource, add `/hacsfiles/ha-simply-cards/ha-simply-cards.js` as **JavaScript module**. Keep any version query HACS supplies.
5. Open dashboard editing, add a card, and choose an Echo card from the picker.

Only one resource is needed: each release bundles all source modules into one JavaScript file. Node.js and build dependencies are not needed on Home Assistant. Packaging follows the [HACS Dashboard repository requirements](https://www.hacs.dev/docs/publish/plugin/).

### Migrate from the manually installed Echo cards

1. Back up your current dashboard YAML and four frontend files.
2. Install HA Simply Cards through HACS.
3. Remove the old `/local/echo-cards/echo-cards.js?...` resource entry. Keep only the HACS resource above. **Do not load both implementations**: they register the same custom elements.
4. Fully close and reopen dashboard browser pages, including both Echo browsers. A simple partial navigation does not replace already registered custom elements.
5. Existing card types, entities, actions, templates and layout options remain valid. You do not need to replace dashboard YAML just to migrate installation.

HACS updates component code, not dashboard configuration. Back up and maintain your own views separately. Keep old frontend files until migration is verified; they are unused once their resource entry is removed.

## Cards

| Picker | YAML type | Purpose |
| --- | --- | --- |
| Echo Header | `custom:echo-header-card` | Title, clock, date and greeting |
| Echo Weather | `custom:echo-weather-card` | Condition, temperature, humidity and icon |
| Echo Control | `custom:echo-toggle-card` | On/off, optional fan-speed/light-brightness slider |
| Echo Climate | `custom:echo-climate-card` | Thermostat display and optional temperature buttons |
| Echo Media | `custom:echo-media-card` | Player metadata, transport and mute |
| Echo Entity | `custom:echo-entity-card` | One generic entity with configurable gestures |
| Echo Container | `custom:echo-container-card` | Any number of child cards, retaining the custom group appearance |

Old Fan and grouped Security types remain compatibility aliases, not new picker choices. Entity/Container are the generic replacements for new configurations. Native Tile features and Assist actions are not implemented.

## Configuration

Use the visual editor and native Sections **Layout** tab to allocate dimensions. For a native Grid card, its parent controls the allocation. No device profile, theme or legacy-sizing mode is required. Legacy layout-card positioning, if used, stays entirely in view YAML.

```yaml
type: custom:echo-toggle-card
entity: light.example
name: Reading Light
slider: true
grid_options:
  columns: 6
  rows: 3
```

Sliders default to hidden. Enable one only when the entity supports brightness or fan percentage. Zero brightness turns a light off. Slider changes do not replace the independent on/off action.

Control cards support independent card and icon tap, hold and double-tap actions in the visual editor, including slider-enabled controls and the legacy Fan alias. Existing defaults are retained: plain card tap toggles; slider-card power toggles and the remaining card body has no tap action; hold opens more-info. An unconfigured icon follows its power/card action; explicitly configuring any icon gesture isolates the icon, with unspecified icon gestures doing nothing. The slider power switch remains a dedicated toggle even when body taps are customized or disabled. Sliders and power share a pending-command guard. Actions match Entity cards: none, more-info, toggle, perform-action, navigate and URL, with optional confirmation. Holds use the same release behavior across cards; previews suppress actions, including nested controls.

Media artwork is square and grows with its allocation, up to 320px, while reserving room for metadata and controls. Landscape artwork and transport controls share a bottom edge. Portrait and narrow cards stack artwork, metadata and controls; very short narrow allocations hide artwork to keep text and transport usable. Fan title/state/speed controls stay together at the bottom, with power at the top. Native Grid/Sections sizing defaults are unchanged.

### Text sources

Header, Weather and Climate text fields are prefilled native Jinja editors that accept plain text too. Each value has one source under `templates`; a blank source hides its text. Missing source keys receive defaults. Existing Name/room values migrate into the corresponding source when it is absent.

```yaml
type: custom:echo-header-card
templates:
  title: Home
  time: "{{ now().strftime('%I:%M %p').lstrip('0') }}"
```

Default time/date/greeting use Home Assistant's timezone. Templates receive `entity`, `config` and `temperature_unit`. Weather icon templates return `mdi:` IDs. Output is text, not HTML. Pending templates display `…`; errors display `—` rather than another text source. Actual Home Assistant Jinja execution is not simulated by the tests.

Changing an entity resets these fields to defaults **including customized sources**:

- Weather: condition, temperature, humidity, icon; label is preserved.
- Climate: title, status, target_temperature, current_temperature; target_label and hint are preserved.
- Header: no automatic text reset.

### Presentation arrangements

- Header `header_layout`: `auto` (unchanged responsive default), `stacked` (greeting above title, date below, clock beside title), `compact` (greeting below clock).
- Weather `weather_layout`: `stacked` (unchanged default) or `inline` (temperature beside condition).
- Slider-enabled Control titles truncate with ellipsis instead of overlapping controls; `name` provides a shorter label.

These are opt-in visual-editor options, not device profiles. Parent grid dimensions still determine card size. The stacked Header is designed for allocations at least around 80px tall with enough width for the chosen time/title format. Existing native layouts keep their default arrangement unless you change it.

### Thermostat

```yaml
type: custom:echo-climate-card
entity: climate.example
show_temperature_control: true
hvac_modes: [cool, heat]
icon_tap_action:
  action: none
templates:
  title: Home Temperature
```

The approved variant places smaller minus/plus buttons beside the target readout on the right. Commands use actual entity attributes, not displayed template text. Limits and steps follow the entity. The icon is blue when the entity's HVAC mode state is `cool`, not based on `hvac_action`. Icon tapping defaults to none; the editor supports mode cycling and other actions. Restrict `hvac_modes` when your system should cycle only through specific modes. Single-setpoint systems do not need `temperature_target`; range systems can choose `low` or `high` without changing the other endpoint. Unsupported/off/unavailable controls disable adjustment.

### Entity and Container

Entity supports name/icon overrides, independent icon color (`color`) and icon-circle background (`background_color`), state content, entity pictures, state hiding, horizontal orientation and independent card/icon tap, hold and double-tap actions. Both colors default to state-based colors; choose them in the visual editor or supply CSS colors such as `#FFE4B5` or Home Assistant color names. Custom overrides stay fixed across states, including unavailable; clearing an override or selecting `state` restores the automatic colors. All gestures default to none. Actions include more-info, toggle, perform-action, navigate and URL. Container accepts arbitrary child cards through its visual editor. It is not limited to three children or any entity domain.

Use `examples/reference-dashboard.yaml` as a generic reference; replace placeholder entities before testing. Production dashboards, user IDs and credentials are not included. Browser fixtures use synthetic entity/user IDs only.

## Updates and development

After publishing a new release, use HACS **Update**, then fully reload dashboard browsers. HACS update discovery is not instantaneous; refresh repository information if needed. Never manually edit installed `/www/community/ha-simply-cards/` files: upgrades replace them.

See [maintainer instructions](docs/MAINTAINING.md) for the edit → test → push → release workflow, prereleases and rollback. No license has been selected for this project; choose one explicitly before inviting redistribution/contributions.

import { themeStyle } from './echo-theme.js';
import { designStyle, sizeDesign } from './echo-design.js';
import { weatherAppearance, weatherImageStyle } from './echo-weather.js';
import { startTemplates, stopTemplates, templateValue } from './echo-templates.js';
import { cardStyles } from './echo-styles.js';
import { stubConfig, sliderCapability, textFields, normalizeTextConfig } from './echo-card-editor.js';
import './echo-entity-cards.js';
import { runCardAction, bindCardGestures, cancelCardGestures, bindGestures, syncActionAccessibility } from './echo-actions.js';

const gridDefaults = {
  header: { columns: 12, rows: 2, min_columns: 9, min_rows: 1 },
  weather: { columns: 6, rows: 2, min_columns: 6, min_rows: 1 },
  toggle: { columns: 6, rows: 2, min_columns: 6, min_rows: 2 },
  climate: { columns: 12, rows: 2, min_columns: 12, min_rows: 2 },
  media: { columns: 12, rows: 3, min_columns: 12, min_rows: 2 },
  security: { columns: 12, rows: 4, min_columns: 12, min_rows: 3 },
  fan: { columns: 6, rows: 3, min_columns: 6, min_rows: 2 },
};

export const available = entity => !!entity && !['unknown', 'unavailable'].includes(entity.state);
export const climateColors = entity => entity?.state === 'cool'
  ? { background: 'var(--echo-color-e6f0ff,#E6F0FF)', color: 'var(--echo-color-3478f6,#3478F6)' }
  : { background: 'var(--echo-color-fde9df,#FDE9DF)', color: 'var(--echo-color-ee773b,#EE773B)' };
export function fanValues(entity) {
  const step = Number(entity?.attributes.percentage_step);
  const steps = Number.isFinite(step) && step > 0 ? Math.max(1, Math.min(100, Math.round(100 / step))) : 100;
  const reported = Number(entity?.attributes.percentage);
  const percentage = entity?.state === 'off' ? 0 : Number.isFinite(reported) ? Math.max(0, Math.min(100, reported)) : 0;
  return { steps, percentage, position: Math.round(percentage * steps / 100) };
}
export const fanPercentage = (position, steps) => Math.floor(Math.max(0, Math.min(steps, Number(position))) * 100 / steps);
const capitalize = value => value.charAt(0).toUpperCase() + value.slice(1);
const baseStyle = `
:host{display:block;height:100%;min-width:0;min-height:0;margin:0!important;font-family:var(--echo-font-interface,Inter,"Segoe UI",Arial,sans-serif);-webkit-tap-highlight-color:transparent}
:host{--echo-unit:1px}
*{box-sizing:border-box}
[hidden]{display:none!important}
ha-card{display:block;position:relative;font:inherit;color:var(--echo-color-202732,#202732);--ha-card-border-width:0px}
.grid{display:grid;width:100%;height:100%;align-items:center;text-align:center}
.img-cell{grid-area:i;display:flex;align-items:center;justify-content:center;overflow:hidden}
ha-icon{display:block;height:auto;aspect-ratio:1;--mdc-icon-size:100%}
.name{grid-area:n;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.label{grid-area:l;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-field]{min-width:0}
[data-field="greeting"]{font-family:var(--echo-font-display,"Cormorant Garamond",Georgia,serif);font-weight:400}
[role="button"]{cursor:pointer;touch-action:manipulation;outline:none}
[role="button"]:focus-visible{outline:3px solid var(--echo-color-3478f6,#3478F6);outline-offset:-3px}
[aria-disabled="true"]{cursor:default}
.toggle{width:calc(46 * var(--echo-unit,1px));height:calc(26 * var(--echo-unit,1px));border-radius:calc(20 * var(--echo-unit,1px));padding:calc(3 * var(--echo-unit,1px));display:flex;background:var(--toggle-background,var(--echo-color-d8dde4,#D8DDE4));pointer-events:none}
.toggle.on{justify-content:flex-end}
.toggle span{width:calc(20 * var(--echo-unit,1px));height:calc(20 * var(--echo-unit,1px));border-radius:50%;background:white;box-shadow:0 calc(1 * var(--echo-unit,1px)) calc(3 * var(--echo-unit,1px)) #0002}
.info{text-align:left;overflow:hidden;width:100%}
.info strong,.info span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.info strong{font-size:var(--media-heading,19px);font-weight:500;color:var(--echo-color-202734,#202734)}
.info span{font-size:var(--media-status,14px);line-height:22px;color:var(--echo-color-89919d,#89919D)}
.security-heading{display:flex;align-items:center;gap:10px;font-size:19px;font-weight:500;color:var(--echo-color-24303e,#24303E)}
.security-heading ha-icon{width:24px}
.fan-speed{display:grid;grid-template-rows:18px 44px;width:100%;text-align:left}
.fan-speed>span{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--echo-color-818996,#818996)}
.fan-speed output{font-size:13px;font-weight:500;color:var(--echo-color-2a9477,#2A9477)}
.fan-speed input{margin:0;width:100%;height:44px;accent-color:var(--echo-color-2a9477,#2A9477)}
img{display:block}
`;

const nativeStyle = `
:host{height:100%;contain:size;contain-intrinsic-size:0px var(--echo-natural-height);contain-intrinsic-block-size:var(--echo-natural-height);--echo-unit:1px;--media-heading:19px;--media-status:14px}
ha-card{height:100%;min-height:0}
:host([auto-rows]){height:auto}
:host([kind="header"]) ha-card{padding:12px 18px}
:host([kind="header"]) .grid{grid-template-rows:20px minmax(0,1fr) 20px}
:host([kind="header"]) [data-field="room"]{font-size:30px;line-height:34px}
:host([kind="header"]) [data-field="clock"]{font-size:26px}
:host([kind="header"]) [data-field="greeting"],:host([kind="header"]) [data-field="date"]{font-size:14px}
:host([kind="toggle"]) ha-card{padding:12px}
:host([kind="toggle"]) .grid{grid-template-rows:40px minmax(0,1fr) 19px}
:host([kind="toggle"]) .img-cell{width:40px;height:40px}
:host([kind="toggle"]) .name{font-size:18px;line-height:24px;margin-top:3px}
:host([kind="toggle"]) .label{font-size:14px;line-height:20px;margin-top:0}
:host([kind="weather"]) ha-card{padding:12px}
:host([kind="weather"]) .grid{grid-template-columns:52px minmax(0,1fr);column-gap:10px}
:host([kind="weather"]) .img-cell{width:48px;height:48px}
:host([kind="weather"]) ha-icon{width:42px}
:host([kind="weather"]) [data-field="eyebrow"]{font-size:13px}
:host([kind="weather"]) [data-field="condition"]{font-size:19px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:100%}
:host([kind="weather"]) [data-field="temperature"]{font-size:22px}
:host([kind="weather"]) [data-field="humidity"]{font-size:12px}
:host([kind="media"]){--echo-media-control-size:44px;--echo-media-art-limit:320px;--echo-media-min-text-width:200px;--echo-media-gap:16px}
:host([kind="media"]) ha-card{padding:16px}
:host([kind="fan"]) ha-card{padding:14px}
:host([width="narrow"][kind="header"]) .grid{grid-template-areas:"greeting clock" "room room" "date date"}
:host([width="narrow"][kind="header"]) [data-field="room"]{font-size:26px;line-height:30px}
:host([width="narrow"][kind="header"]) [data-field="clock"]{font-size:22px}
:host([width="narrow"][kind="weather"]) .grid{grid-template-columns:36px minmax(0,1fr);column-gap:6px}
:host([width="narrow"][kind="weather"]) .img-cell,:host([width="narrow"][kind="weather"]) ha-icon{width:34px;height:34px}
:host([width="narrow"][kind="weather"]) [data-field="condition"]{font-size:16px}
:host([width="narrow"][kind="climate"]) ha-card{padding:12px}
:host([width="narrow"][kind="climate"]) .grid{grid-template-columns:52px minmax(0,1fr) auto}
:host([width="narrow"][kind="climate"]) .img-cell{width:44px;height:44px}
:host([width="narrow"][kind="climate"]) .name{font-size:14px}
:host([width="narrow"][kind="climate"]) [data-field="current"]{font-size:24px}
:host([width="narrow"][kind="security"]) ha-card{padding:12px}
:host([width="narrow"][kind="security"]) .grid{column-gap:6px}
`;

const adaptiveStyle = `
:host([height="short"][kind="header"]) ha-card{padding:6px 12px}
:host([height="short"][kind="header"]) .grid{grid-template-areas:"room clock" "date greeting";grid-template-rows:24px 16px;column-gap:8px}
:host([height="short"][kind="header"]) [data-field="room"]{font-size:22px;line-height:24px}
:host([height="short"][kind="header"]) [data-field="clock"]{font-size:22px}
:host([height="short"][kind="header"]) [data-field="date"],:host([height="short"][kind="header"]) [data-field="greeting"]{font-size:11px;line-height:16px;white-space:nowrap}
:host([height="short"][kind="header"]) [data-field="greeting"]{justify-self:end}
:host([height="short"][kind="weather"]) ha-card{padding:4px 8px}
:host([height="short"][kind="weather"]) .grid{grid-template-columns:32px minmax(0,1fr);column-gap:6px;row-gap:0}
:host([height="short"][kind="weather"]) .img-cell,:host([height="short"][kind="weather"]) ha-icon{width:30px;height:30px}
:host([height="short"][kind="weather"]) [data-field="eyebrow"],:host([height="short"][kind="weather"]) [data-field="humidity"]{font-size:10px;line-height:10px}
:host([height="short"][kind="weather"]) [data-field="condition"]{font-size:14px;line-height:14px}
:host([height="short"][kind="weather"]) [data-field="temperature"]{font-size:14px;line-height:12px}
:host([height="short"][kind="fan"]) ha-card{padding:8px 10px}
:host([height="short"][kind="fan"]) .grid{grid-template-areas:"power power" "title status" "speed speed";grid-template-columns:minmax(0,1fr) auto;grid-template-rows:minmax(32px,1fr) 20px 52px}
:host([height="short"][kind="fan"]) [data-field="power"]{height:32px;--echo-power-size:32px}
:host([height="short"][kind="fan"]) [data-field="title"]{font-size:15px;line-height:20px;align-self:center}
:host([height="short"][kind="fan"]) [data-field="status"]{font-size:12px;line-height:20px;align-self:center;justify-self:end}
:host([height="short"][kind="fan"]) .fan-speed{grid-template-rows:12px 40px}
:host([height="short"][kind="fan"]) .fan-speed input{height:40px}
:host([height="short"][kind="fan"]) .fan-speed>span{font-size:11px}
:host([height="short"][kind="media"]){--media-heading:16px;--media-status:13px;--echo-media-control-size:40px}
:host([height="short"][kind="media"]) ha-card{padding:8px 12px}
:host([height="short"][kind="security"]) ha-card{padding:12px}
:host([height="short"][kind="security"]) .grid{grid-template-rows:28px minmax(0,1fr)}
`;

const climateControlStyle = `
:host([temperature-control]) .grid{grid-template-columns:66px minmax(0,1fr) auto;column-gap:12px}
:host([temperature-control]) [data-field="current"]{display:grid;grid-template-columns:44px minmax(68px,auto) 44px;grid-template-rows:14px 44px;column-gap:4px;row-gap:2px;align-items:center}
.temperature-caption{grid-column:2;grid-row:1;font-size:12px;line-height:14px;font-weight:400;color:var(--echo-color-89919d,#89919D);text-align:center}
.temperature-readout{grid-column:2;grid-row:2;display:flex;align-items:center;justify-content:center;height:44px;font:inherit;font-size:31px;line-height:1;white-space:nowrap}
.temperature-adjust{grid-row:2;position:relative;isolation:isolate;display:grid;place-items:center;width:44px;height:44px;border:0;padding:0;background:transparent;color:var(--echo-color-293646,#293646);font:inherit;font-size:24px;line-height:1;cursor:pointer}
.temperature-adjust::before{content:"";position:absolute;width:36px;height:36px;border-radius:50%;background:var(--echo-color-f2f4f7,#F2F4F7);z-index:-1}
.temperature-adjust:disabled{opacity:.4;cursor:default}
.temperature-adjust:focus-visible{outline:3px solid var(--echo-color-3478f6,#3478F6);border-radius:50%}
.temperature-adjust:first-of-type{grid-column:1}.temperature-adjust:last-of-type{grid-column:3}
:host([width="narrow"][temperature-control]) .grid{grid-template-columns:44px minmax(0,1fr) auto;column-gap:8px}
:host([width="narrow"][temperature-control]) .temperature-readout{font-size:27px}
`;

const presentationStyle = `
:host([kind="media"]) .grid{grid-template-areas:"art info info info info" "art previous play next volume";grid-template-columns:var(--echo-art-width) repeat(4,minmax(0,1fr));grid-template-rows:minmax(0,1fr) var(--echo-action-size,44px);column-gap:var(--echo-media-gap);row-gap:var(--echo-media-gap)}
:host([kind="media"]) [data-field="art"]{width:var(--echo-art-width);height:var(--echo-art-height);align-self:end}
:host([kind="media"]) [data-field="info"]{align-self:end}
:host([kind="media"][media-layout="stacked"]) .grid{grid-template-areas:"art art art art" "info info info info" "previous play next volume";grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:minmax(0,1fr) auto var(--echo-action-size,44px)}
:host([kind="media"][media-layout="stacked"]) [data-field="art"]{justify-self:center;align-self:center}
:host([kind="media"][media-layout="stacked"]) .info{text-align:center}
:host([kind="media"][media-layout="compact"]) .grid{grid-template-areas:"info info info info" "previous play next volume";grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:minmax(0,1fr) var(--echo-action-size)}
:host([kind="media"][media-layout="compact"]) [data-field="art"]{display:none}
:host([kind="fan"]) [data-field="title"]{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}
:host([kind="header"][header-layout="stacked"]) ha-card{padding:8px 20px}
:host([kind="header"][header-layout="stacked"]) .grid{grid-template-areas:"greeting greeting" "room clock" "date date";grid-template-rows:16px minmax(0,1fr) 16px;column-gap:8px}
:host([kind="header"][header-layout="stacked"]) [data-field="greeting"]{justify-self:start;font-size:14px;line-height:16px}
:host([kind="header"][header-layout="stacked"]) [data-field="date"]{font-size:12px;line-height:16px}
:host([kind="header"][header-layout="stacked"]) [data-field="room"]{font-size:28px;line-height:30px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
:host([kind="header"][header-layout="stacked"]) [data-field="clock"]{font-size:28px;line-height:30px}
:host([kind="header"][header-layout="compact"]) ha-card{padding:6px 12px}
:host([kind="header"][header-layout="compact"]) .grid{grid-template-areas:"room clock" "date greeting";grid-template-rows:24px 16px;column-gap:8px}
:host([kind="header"][header-layout="compact"]) [data-field="room"],:host([kind="header"][header-layout="compact"]) [data-field="clock"]{font-size:22px;line-height:24px}
:host([kind="header"][header-layout="compact"]) [data-field="date"],:host([kind="header"][header-layout="compact"]) [data-field="greeting"]{font-size:11px;line-height:16px;white-space:nowrap}
:host([kind="header"][header-layout="compact"]) [data-field="greeting"]{justify-self:end}
:host([kind="weather"][weather-layout="inline"]) ha-card{padding:10px 14px}
:host([kind="weather"][weather-layout="inline"]) .grid{grid-template-areas:"i eyebrow" "i summary" "i humidity";grid-template-columns:48px minmax(0,1fr);grid-template-rows:repeat(3,min-content);column-gap:12px;row-gap:2px}
:host([kind="weather"][weather-layout="inline"]) .img-cell,:host([kind="weather"][weather-layout="inline"]) ha-icon{width:44px;height:44px}
:host([kind="weather"][weather-layout="inline"]) [data-field="summary"]{display:flex;align-items:center;justify-self:stretch;min-width:0;overflow:hidden;white-space:nowrap;text-align:left}
:host([kind="weather"][weather-layout="inline"]) [data-field="condition"]{flex:0 1 auto;min-width:0;font-size:16px;line-height:20px;align-self:center}
:host([kind="weather"][weather-layout="inline"]) [data-field="temperature"]{flex:none;font-size:16px;line-height:20px;font-weight:500}
.weather-separator{flex:none;white-space:pre;font-size:16px;line-height:20px;color:var(--echo-color-20334c,#20334C)}
:host([kind="weather"][weather-layout="inline"]) [data-field="eyebrow"]{font-size:12px;line-height:16px}
:host([kind="weather"][weather-layout="inline"]) [data-field="humidity"]{font-size:12px;line-height:16px}
`;

class EchoCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.fields = {};
    this.childrenCards = [];
    this.editing = false;
  }

  setConfig(config) {
    config = normalizeTextConfig(this.kind, config, this.config);
    if (['echo-toggle-card', 'echo-fan-card'].includes(this.localName)) {
      this._renderKind = (config.slider ?? this.localName === 'echo-fan-card') ? 'fan' : 'toggle';
    }
    if (!cardStyles[this.kind]) throw new Error(`Unknown card kind: ${this.kind}`);
    if (!['header', 'security'].includes(this.kind) && !config.entity) throw new Error(`echo-${this.kind}: entity is required`);
    if (this.kind === 'security' && (!Array.isArray(config.items) || config.items.length !== 3 || config.items.some(item => !item.entity))) {
      throw new Error('echo-security: items must contain three entities');
    }
    cancelCardGestures(this);
    this.cleanups = [];
    this.stopSizing();
    this.stopTemplates();
    this.editing = false;
    this.config = { ...config };
    delete this.config.profile;
    delete this.config.density;
    delete this.config.sizing;
    delete this.config.height;
    this.removeAttribute('sizing');
    this.setAttribute('kind', this.kind);
    if (this.kind === 'header') this.setAttribute('header-layout', ['stacked', 'compact'].includes(config.header_layout) ? config.header_layout : 'auto');
    if (this.kind === 'weather') this.setAttribute('weather-layout', config.weather_layout === 'inline' ? 'inline' : 'stacked');
    this.toggleAttribute('auto-rows', config.grid_options?.rows === 'auto');
    this.style.setProperty('--echo-natural-height', `${this.getGridOptions().rows * 64 - 8}px`);
    this.toggleAttribute('temperature-control', this.kind === 'climate' && config.show_temperature_control === true);
    this.temperatureReadout = null;
    this.temperatureButtons = null;
    this.pendingTemperature = null;
    this.fields = {};
    this.childrenCards = [];
    this.range = null;
    this.weatherSeparator = null;
    this.output = null;
    this.iconCell = null;
    this.shadowRoot.replaceChildren();
    const style = document.createElement('style');
    style.textContent = themeStyle + baseStyle + '\n' + cardStyles[this.kind] + (gridDefaults[this.kind] ? nativeStyle + adaptiveStyle : '') + presentationStyle + (this.kind === 'weather' ? weatherImageStyle : '') + (this.kind === 'climate' ? climateControlStyle : '')
      + (this.kind === 'media-action' ? '\nha-card{width:var(--echo-action-size,48px);height:var(--echo-action-size,48px)}' : '')
      + (this.kind === 'fan-power' ? '\nha-card,.grid{height:var(--echo-power-size,44px)}.grid{grid-template-rows:var(--echo-power-size,44px)}.img-cell{width:var(--echo-power-size,44px);height:var(--echo-power-size,44px)}' : '')
      + (this.kind === 'art' ? '\nha-card{width:var(--echo-art-width,100px);height:var(--echo-art-height,118px)}' : '') + designStyle;
    this.toggleAttribute('primary-action', this.kind === 'media-action' && this.config.service === 'media_play_pause');
    this.shell = document.createElement('ha-card');
    this.grid = document.createElement('div');
    this.grid.className = 'grid';
    this.shell.append(this.grid);
    this.shadowRoot.append(style, this.shell);
    this.build();
    this.update();
    this.startSizing();
    this.startTemplates();
  }

  set hass(value) {
    this._hass = value;
    this.toggleAttribute('echo-dark', !!value?.themes?.darkMode);
    this.startTemplates();
    this.update();
  }

  get hass() { return this._hass; }
  get entity() { return this._hass?.states[this.config?.entity]; }
  getCardSize() { return Math.ceil((this.getGridOptions().rows * 64 - 8) / 50); }
  getGridOptions() {
    return { ...(gridDefaults[this.kind] || { columns: 12, rows: 3 }) };
  }
  set layout(value) { this._layout = value; if (value) this.setAttribute('layout', value); else this.removeAttribute('layout'); }
  get layout() { return this._layout; }
  connectedCallback() { this.startSizing(); this.startTemplates(); this.update(); }
  disconnectedCallback() { this.stopSizing(); this.stopTemplates(); cancelCardGestures(this); }
  set preview(value) { this._preview = !!value; for (const card of this.childrenCards) card.preview = value; this.update(); }
  get preview() { return this.actionOwner?.preview || this._preview; }
  set pending(value) { if (this.actionOwner) this.actionOwner.pending = value; else this._pending = value; }
  get pending() { return this.actionOwner ? this.actionOwner.pending : this._pending; }
  runAction(key) { return runCardAction(this, key); }
  controlGestures(defaultTap = 'toggle') {
    this.gestureDefaults = { tap_action: { action: defaultTap }, hold_action: { action: 'more-info' } };
    this.shell.setAttribute('aria-label', this.config.name || this.config.entity);
    bindCardGestures(this, this.shell);
    if (this.iconCell && ['tap', 'hold', 'double_tap'].some(gesture => this.config[`icon_${gesture}_action`] !== undefined)) {
      this.iconCell.setAttribute('aria-label', `${this.config.name || this.config.entity} icon`);
      bindCardGestures(this, this.iconCell, 'icon_');
    }
  }
  startSizing() {
    if (!this.isConnected || !this.config || (!gridDefaults[this.kind] && this.kind !== 'security-tile') || this.resizeObserver) return;
    this.resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      const designScale = sizeDesign(this, height);
      this.setAttribute('width', width < 440 ? 'narrow' : 'wide');
      const threshold = { header: 100, weather: 90, fan: 170, media: 160, security: 235 }[this.kind] || 0;
      this.setAttribute('height', height < threshold ? 'short' : 'tall');
      if (this.kind === 'media') {
        const style = getComputedStyle(this.shell);
        const tokens = getComputedStyle(this);
        const availableWidth = width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const availableHeight = height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        const gap = parseFloat(tokens.getPropertyValue('--echo-media-gap'));
        const desiredAction = parseFloat(tokens.getPropertyValue('--echo-media-control-size')) * designScale;
        // Reserve 48px of artwork where possible; fit all four controls even in portrait.
        const action = Math.min(desiredAction, Math.max(40, (availableWidth - 48 - 4 * gap) / 4), (availableWidth - 3 * gap) / 4);
        const limit = parseFloat(tokens.getPropertyValue('--echo-media-art-limit'));
        const minText = Math.max(parseFloat(tokens.getPropertyValue('--echo-media-min-text-width')), 4 * action + 3 * gap);
        const stacked = height > width || availableWidth < minText + gap + 48;
        this.setAttribute('media-layout', stacked ? 'stacked' : 'landscape');
        const infoHeight = this.info.scrollHeight;
        const size = Math.max(0, Math.min(limit, stacked ? availableWidth : availableWidth - gap - minText,
          stacked ? availableHeight - action - infoHeight - 2 * gap : availableHeight));
        // Text and transport remain visible when a short/narrow allocation
        // cannot fit useful artwork. Never leave an invisible grid track.
        if (stacked && size < 32) this.setAttribute('media-layout', 'compact');
        this.style.setProperty('--echo-art-width', `${size}px`);
        this.style.setProperty('--echo-art-height', `${size}px`);
        this.style.setProperty('--echo-action-size', `${action}px`);
      }
    });
    this.resizeObserver.observe(this);
  }
  stopSizing() { this.resizeObserver?.disconnect(); this.resizeObserver = null; }

  stopTemplates() { stopTemplates(this); }
  startTemplates() {
    if (this.config && textFields[this.kind]) startTemplates(this, Object.fromEntries(Object.keys(textFields[this.kind]).map(key => [key, this.config.templates[key]])));
  }

  field(name, className = '', tag = 'div') {
    const element = document.createElement(tag);
    element.dataset.field = name;
    element.style.gridArea = name;
    element.className = className;
    this.fields[name] = element;
    this.grid.append(element);
    return element;
  }

  text(name, value) {
    const slot = this.kind === 'climate' ? { n: 'title', l: 'status', current: 'current_temperature', hint: this.temperatureReadout ? 'current_temperature' : 'hint' }[name] || name
      : { room: 'title', clock: 'time', eyebrow: 'label' }[name] || name;
    if (this.fields[name]) this.fields[name].textContent = textFields[this.kind]?.[slot] ? this.displayText(slot) : value;
  }
  displayText(slot) { return templateValue(this, this.config.templates[slot], slot); }
  icon() {
    this.iconCell = document.createElement('div');
    this.iconCell.className = 'img-cell';
    this.iconElement = document.createElement('ha-icon');
    this.iconCell.append(this.iconElement);
    this.grid.append(this.iconCell);
  }
  setIcon(value) { this.iconElement?.setAttribute('icon', value); }
  stateColors(background, color) {
    this.style.setProperty('--state-background', background);
    this.style.setProperty('--state-color', color);
  }
  nested(field, kind, config) {
    const wrapper = this.field(field);
    const child = document.createElement(`echo-${kind}-card`);
    if (this.kind === 'fan' && kind === 'fan-power') child.actionOwner = this;
    child.preview = this.preview;
    child.setConfig(config);
    wrapper.append(child);
    this.childrenCards.push(child);
  }
  button(action, hold = null, label = null) {
    this.action = action;
    this.shell.setAttribute('aria-label', label || this.config.name || this.config.entity || this.kind);
    const callbacks = { tap: action, hold };
    this.cleanups.push(bindGestures(this.shell, {
      configured: gesture => !!callbacks[gesture],
      run: gesture => { if (!this.preview) callbacks[gesture]?.(); },
    }));
  }
  moreInfo() {
    if (this.preview) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: this.config.entity }, bubbles: true, composed: true }));
  }
  async service(domain, service, data = {}) {
    if (this.preview || !this._hass || !available(this.entity) || this.pending) return;
    this.pending = true;
    (this.actionOwner || this).update();
    try {
      await this._hass.callService(domain, service, { entity_id: this.config.entity, ...data });
    } catch (error) {
      this.dispatchEvent(new CustomEvent('hass-notification', {
        detail: { message: error?.message || 'Home Assistant could not complete the action.' }, bubbles: true, composed: true,
      }));
    } finally {
      this.pending = false;
      (this.actionOwner || this).update();
    }
  }

  temperatureTarget() {
    const attributes = this.entity?.attributes || {};
    const rangeTarget = { low: 'target_temp_low', high: 'target_temp_high' }[this.config.temperature_target];
    const key = rangeTarget || 'temperature';
    const value = attributes[key];
    const unit = this._hass?.config?.unit_system?.temperature || '°F';
    const step = Number(attributes.target_temp_step) > 0 ? Number(attributes.target_temp_step) : unit === '°F' ? 1 : 0.5;
    let minimum = Number.isFinite(attributes.min_temp) ? attributes.min_temp : -Infinity;
    let maximum = Number.isFinite(attributes.max_temp) ? attributes.max_temp : Infinity;
    if (key === 'target_temp_low' && Number.isFinite(attributes.target_temp_high)) maximum = Math.min(maximum, attributes.target_temp_high);
    if (key === 'target_temp_high' && Number.isFinite(attributes.target_temp_low)) minimum = Math.max(minimum, attributes.target_temp_low);
    const supported = (attributes.supported_features == null || !!(attributes.supported_features & (rangeTarget ? 2 : 1)))
      && (!rangeTarget || Number.isFinite(attributes.target_temp_low) && Number.isFinite(attributes.target_temp_high)) && minimum <= maximum;
    return { key, value: Number.isFinite(value) ? value : null, step, minimum, maximum, supported };
  }
  async adjustTemperature(direction) {
    const target = this.temperatureTarget();
    if (this.preview || this.pending || !available(this.entity) || this.entity.state === 'off' || !target.supported || target.value == null || this.temperatureRequest) return;
    const next = Number(Math.max(target.minimum, Math.min(target.maximum, target.value + direction * target.step)).toFixed(3));
    if (next === target.value) return;
    const data = target.key === 'temperature' ? { temperature: next } : {
      target_temp_low: this.entity.attributes.target_temp_low,
      target_temp_high: this.entity.attributes.target_temp_high,
      [target.key]: next,
    };
    this.temperatureRequest = true;
    this.update();
    await this.service('climate', 'set_temperature', data);
    this.temperatureRequest = false;
    this.update();
  }
  buildTemperatureControls() {
    const container = this.fields.current;
    this.temperatureCaption = document.createElement('span');
    this.temperatureCaption.className = 'temperature-caption';
    this.temperatureReadout = document.createElement('output');
    this.temperatureReadout.className = 'temperature-readout';
    this.temperatureReadout.setAttribute('aria-live', 'polite');
    this.temperatureButtons = [-1, 1].map(direction => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'temperature-adjust';
      button.textContent = direction < 0 ? '−' : '+';
      button.setAttribute('aria-label', `${direction < 0 ? 'Decrease' : 'Increase'} target temperature`);
      for (const eventName of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup']) button.addEventListener(eventName, event => event.stopPropagation());
      button.addEventListener('click', () => this.adjustTemperature(direction));
      return button;
    });
    container.append(this.temperatureCaption, this.temperatureButtons[0], this.temperatureReadout, this.temperatureButtons[1]);
  }

  build() {
    const kind = this.kind;
    if (kind === 'header') {
      for (const field of ['greeting', 'room', 'date', 'clock']) this.field(field);
    } else if (kind === 'weather') {
      this.toggleAttribute('weather-image', this.config.weather_images === true);
      this.removeAttribute('weather-fallback');
      this.weatherPhoto = null;
      if (this.config.weather_images === true) {
        this.weatherPhoto = document.createElement('img');
        this.weatherPhoto.className = 'weather-photo'; this.weatherPhoto.alt = '';
        this.weatherPhoto.addEventListener('error', () => { this.weatherPhoto.hidden = true; });
        const scrim = document.createElement('div'); scrim.className = 'weather-scrim';
        this.shell.prepend(this.weatherPhoto, scrim);
      }
      this.icon();
      for (const field of ['eyebrow', 'condition', 'temperature', 'humidity']) this.field(field);
      if (this.config.weather_layout === 'inline') {
        const summary = this.field('summary');
        this.weatherSeparator = document.createElement('span');
        this.weatherSeparator.className = 'weather-separator';
        this.weatherSeparator.textContent = ' · ';
        this.weatherSeparator.setAttribute('aria-hidden', 'true');
        for (const field of ['condition', 'temperature']) this.fields[field].style.gridArea = 'auto';
        summary.append(this.fields.condition, this.weatherSeparator, this.fields.temperature);
      }
      this.button(() => this.moreInfo());
    } else if (['toggle', 'fan-power', 'climate', 'security-tile', 'media-action', 'art'].includes(kind)) {
      this.icon();
      if (['toggle', 'climate', 'security-tile'].includes(kind)) {
        this.field('n', 'name');
        this.field('l', 'label');
      }
      if (['toggle', 'fan-power'].includes(kind)) {
        this.field('toggle', 'toggle').append(document.createElement('span'));
        this.controlGestures();
      } else if (kind === 'climate') {
        this.field('current');
        this.field('hint');
        if (this.config.show_temperature_control) this.buildTemperatureControls();
        const iconAction = this.config.icon_tap_action?.action || 'none';
        if (iconAction !== 'none') {
          this.iconCell.setAttribute('role', 'button');
          this.iconCell.tabIndex = 0;
          this.iconCell.setAttribute('aria-label', this.config.name || 'Thermostat icon');
        }
        for (const eventName of ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup']) this.iconCell.addEventListener(eventName, event => event.stopPropagation());
        this.iconCell.addEventListener('click', () => runCardAction(this, 'icon_tap_action'));
        this.iconCell.addEventListener('keydown', event => {
          if (!event.repeat && ['Enter', ' '].includes(event.key)) { event.preventDefault(); runCardAction(this, 'icon_tap_action'); }
        });
        this.button(() => this.moreInfo());
      } else if (kind === 'media-action') {
        this.button(() => {
          const data = this.config.service === 'volume_mute' ? { is_volume_muted: this.entity?.attributes.is_volume_muted !== true } : {};
          this.service('media_player', this.config.service, data);
        }, this.config.service === 'volume_mute' ? () => this.moreInfo() : null, this.config.name);
      } else {
        if (kind === 'art') {
          this.picture = document.createElement('img');
          this.pictureUrl = undefined;
          this.picture.alt = '';
          this.picture.hidden = true;
          this.picture.addEventListener('error', () => { this.picture.hidden = true; this.iconElement.hidden = false; });
          this.iconCell.append(this.picture);
        }
        this.button(() => this.moreInfo(), kind === 'security-tile' ? () => this.moreInfo() : null);
      }
    } else if (kind === 'media') {
      this.nested('art', 'art', { entity: this.config.entity });
      this.info = this.field('info', 'info');
      this.heading = document.createElement('strong');
      this.status = document.createElement('span');
      this.info.append(this.heading, this.status);
      for (const [field, service, icon, name] of [
        ['previous', 'media_previous_track', 'mdi:skip-previous', 'Previous track'],
        ['play', 'media_play_pause', 'mdi:play', 'Play or pause'],
        ['next', 'media_next_track', 'mdi:skip-next', 'Next track'],
        ['volume', 'volume_mute', 'mdi:volume-high', 'Mute or unmute'],
      ]) this.nested(field, 'media-action', { entity: this.config.entity, service, icon, name });
      this.button(() => this.moreInfo());
    } else if (kind === 'security') {
      const heading = this.field('heading', 'security-heading');
      const icon = document.createElement('ha-icon');
      icon.setAttribute('icon', 'mdi:shield-home-outline');
      this.securityTitle = document.createTextNode(this.config.name || 'Security');
      this.securityIcon = icon;
      heading.append(icon, this.securityTitle);
      this.config.items.forEach((item, index) => this.nested(['front', 'back', 'garage'][index], 'security-tile', item));
    } else if (kind === 'fan') {
      const light = this.config.entity.startsWith('light.');
      this.nested('power', 'fan-power', { ...this.config, tap_action: { action: 'toggle' }, double_tap_action: { action: 'none' }, icon: this.config.icon || (light ? 'mdi:lightbulb' : 'mdi:fan'), name: this.config.name || 'Power' });
      this.controlGestures('none');
      this.field('title');
      this.field('status');
      const speed = this.field('speed', 'fan-speed', 'label');
      const caption = document.createElement('span');
      this.output = document.createElement('output');
      caption.append(document.createTextNode(light ? 'Brightness' : 'Speed'), this.output);
      this.range = document.createElement('input');
      this.range.type = 'range';
      this.range.min = '0';
      this.range.step = '1';
      this.range.setAttribute('aria-label', 'Ceiling fan speed');
      speed.append(caption, this.range);
      for (const eventName of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'keydown', 'keyup']) {
        this.range.addEventListener(eventName, event => event.stopPropagation());
      }
      this.range.addEventListener('input', () => {
        this.editing = true;
        this.output.textContent = fanPercentage(this.range.value, Number(this.range.max)) + '%';
      });
      this.range.addEventListener('change', event => {
        event.stopPropagation();
        const percentage = fanPercentage(this.range.value, Number(this.range.max));
        this.editing = false;
        if (!sliderCapability(this.entity)) return;
        if (this.config.entity.startsWith('light.')) {
          if (percentage === 0) this.service('light', 'turn_off');
          else this.service('light', 'turn_on', { brightness_pct: percentage });
        } else this.service('fan', 'set_percentage', { percentage });
      });
      this.range.addEventListener('blur', () => { this.editing = false; if (this.range?.isConnected) this.update(); });
      this.range.addEventListener('pointercancel', () => { this.editing = false; this.update(); });
    }
  }

  update() {
    if (!this.config || !this.shell) return;
    const entity = this.entity;
    const state = entity?.state;
    const attributes = entity?.attributes || {};
    const on = state === 'on';
    const status = on ? 'On' : state === 'off' ? 'Off' : 'Unavailable';
    this.text('n', this.config.name || attributes.friendly_name || this.config.entity);
    if (this.kind === 'header') {
      for (const field of ['greeting', 'room', 'date', 'clock']) this.text(field);
    } else if (this.kind === 'weather') {
      if (this.weatherPhoto) {
        const appearance = weatherAppearance(state, this.hasAttribute('echo-dark'));
        this.toggleAttribute('weather-fallback', ['unknown', 'unavailable'].includes(appearance.key));
        this.style.setProperty('--echo-weather-icon', appearance.color);
        if (this.weatherPhoto.getAttribute('src') !== appearance.image) {
          this.weatherPhoto.hidden = false;
          this.weatherPhoto.src = appearance.image;
        }
      }
      const icon = this.displayText('icon');
      this.setIcon(icon === '…' || icon === '—' ? '' : icon);
      for (const field of ['eyebrow', 'condition', 'temperature', 'humidity']) this.text(field);
      if (this.weatherSeparator) this.weatherSeparator.hidden = !this.fields.condition.textContent || !this.fields.temperature.textContent;
    } else if (['toggle', 'fan-power'].includes(this.kind)) {
      const fan = this.config.entity.startsWith('fan.');
      this.stateColors(on ? (fan ? 'var(--echo-color-e6f4ef,#E6F4EF)' : 'var(--echo-color-fff0cd,#FFF0CD)') : 'var(--echo-color-f0f2f5,#F0F2F5)', on ? (fan ? 'var(--echo-color-2a9477,#2A9477)' : 'var(--echo-color-c68b14,#C68B14)') : 'var(--echo-color-8b93a0,#8B93A0)');
      this.setIcon(this.config.icon || (fan ? 'mdi:fan' : 'mdi:lightbulb'));
      this.text('l', status);
      this.fields.toggle.classList.toggle('on', on);
      this.style.setProperty('--toggle-background', on ? (fan ? 'var(--echo-color-2a9477,#2A9477)' : 'var(--echo-color-e5a51a,#E5A51A)') : 'var(--echo-color-d8dde4,#D8DDE4)');
      syncActionAccessibility(this, this.shell);
      if (this.iconCell.hasAttribute('role')) syncActionAccessibility(this, this.iconCell, 'icon_');
    } else if (this.kind === 'climate') {
      this.shell.setAttribute('aria-label', this.displayText('title') || this.config.entity);
      const colors = climateColors(entity);
      this.stateColors(colors.background, colors.color);
      this.setIcon(this.config.icon || 'mdi:thermometer');
      this.text('l');
      if (!this.temperatureReadout) this.text('current');
      this.text('hint');
      if (this.temperatureReadout) {
        const target = this.temperatureTarget();
        this.temperatureCaption.textContent = this.displayText('target_label');
        this.temperatureReadout.textContent = this.displayText('target_temperature');
        const disabled = this.preview || !available(entity) || state === 'off' || !target.supported || target.value == null || this.pending || this.temperatureRequest;
        this.temperatureButtons[0].disabled = disabled || target.value <= target.minimum;
        this.temperatureButtons[1].disabled = disabled || target.value >= target.maximum;
        this.temperatureReadout.setAttribute('aria-label', `Target temperature ${this.temperatureReadout.textContent}`);
      }
    } else if (this.kind === 'security-tile') {
      const secure = ['locked', 'closed'].includes(state);
      this.stateColors(secure ? 'var(--echo-color-e4f5ec,#E4F5EC)' : 'var(--echo-color-fdece3,#FDECE3)', secure ? 'var(--echo-color-21926d,#21926D)' : 'var(--echo-color-c97445,#C97445)');
      this.setIcon(this.config.icon || attributes.icon || (this.config.entity.startsWith('cover.')
        ? (state === 'closed' ? 'mdi:garage' : 'mdi:garage-open') : (state === 'locked' ? 'mdi:lock-outline' : 'mdi:lock-open-outline')));
      this.text('l', capitalize(state || 'unknown'));
    } else if (this.kind === 'art') {
      this.setIcon('mdi:music-note');
      const picture = attributes.entity_picture;
      let url = null;
      if (picture) {
        try {
          const candidate = new URL(picture, this._hass?.hassUrl?.('/') || location.href);
          if (['http:', 'https:'].includes(candidate.protocol)) url = candidate.href;
        } catch {}
      }
      if (url !== this.pictureUrl) {
        this.pictureUrl = url;
        this.picture.hidden = !url;
        this.iconElement.hidden = !!url;
        if (url) this.picture.src = url;
        else this.picture.removeAttribute('src');
      }
    } else if (this.kind === 'media-action') {
      this.setIcon(this.config.service === 'media_play_pause' ? (state === 'playing' ? 'mdi:pause' : 'mdi:play')
        : this.config.service === 'volume_mute' ? (attributes.is_volume_muted === true ? 'mdi:volume-off' : 'mdi:volume-high') : this.config.icon);
      this.shell.setAttribute('aria-disabled', String(this.preview || this.pending || !available(entity)));
      if (this.config.service === 'volume_mute') this.shell.setAttribute('aria-pressed', String(attributes.is_volume_muted === true));
    } else if (this.kind === 'media') {
      const album = attributes.media_album_name;
      this.heading.textContent = this.config.name || (typeof album === 'string' && album.trim() ? album.trim() : ['playing', 'paused'].includes(state) ? 'Now Playing' : 'Music');
      this.status.textContent = attributes.media_title || (state === 'playing' ? 'Playing' : state === 'paused' ? 'Paused' : !available(entity) ? 'Unavailable' : 'Nothing playing');
    } else if (this.kind === 'security') {
      this.securityTitle.textContent = this.config.name || 'Security';
      this.securityIcon.setAttribute('icon', this.config.icon || 'mdi:shield-home-outline');
    } else if (this.kind === 'fan') {
      const light = this.config.entity.startsWith('light.');
      const name = this.config.name || attributes.friendly_name || (light ? 'Light' : 'Fan');
      this.text('title', name);
      this.range.setAttribute('aria-label', `${name} ${light ? 'brightness' : 'speed'}`);
      this.text('status', status);
      const capable = sliderCapability(entity);
      this.fields.speed.hidden = !capable && available(entity);
      this.range.disabled = this.preview || this.pending || !available(entity) || !capable;
      syncActionAccessibility(this, this.shell);
      this.range.style.accentColor = light ? 'var(--echo-color-e5a51a,#E5A51A)' : 'var(--echo-color-2a9477,#2A9477)';
      this.output.style.color = light ? 'var(--echo-color-c68b14,#C68B14)' : 'var(--echo-color-2a9477,#2A9477)';
      if (!this.editing || !available(entity)) {
        const brightness = state === 'off' ? 0 : Math.max(0, Math.min(100, Math.round((Number(attributes.brightness) || 0) * 100 / 255)));
        const values = light ? { steps: 100, percentage: brightness, position: brightness } : fanValues(entity);
        this.range.max = String(values.steps);
        this.range.value = String(values.position);
        this.output.textContent = available(entity) ? Math.round(values.percentage) + '%' : '--';
      }
    }
    for (const child of this.childrenCards) child.hass = this._hass;
  }
}

const publicKinds = ['header', 'weather', 'toggle', 'climate', 'media'];
for (const kind of [...publicKinds, 'fan', 'security', 'security-tile', 'fan-power', 'art', 'media-action']) {
  const tag = `echo-${kind}-card`;
  if (!customElements.get(tag)) customElements.define(tag, class extends EchoCard {
    get kind() { return this._renderKind || kind; }
    static getConfigElement() { return document.createElement('echo-card-editor'); }
    static getStubConfig(hass, entities, fallback) { return stubConfig(kind, hass, entities, fallback); }
  });
}
window.customCards = (window.customCards || []).filter(card => !['echo-security-card', 'echo-fan-card'].includes(card.type));
for (const kind of publicKinds) {
  const type = `echo-${kind}-card`;
  if (!window.customCards.some(card => card.type === type)) window.customCards.push({ type, name: kind === 'toggle' ? 'Echo Control' : `Echo ${capitalize(kind)}`, description: `Reusable ${kind} card that adapts to its allocated space.`, preview: false });
}

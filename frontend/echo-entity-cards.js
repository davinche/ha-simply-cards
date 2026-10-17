import { gestures, actionNames, usable, bindCardGestures, cancelCardGestures, runCardAction } from './echo-actions.js';
import { cardStyles } from './echo-styles.js';

const emit = (node, name, detail) => node.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
const resolveColor = (value, fallback) => !value || value === 'state' ? fallback
  : CSS.supports('color', value) ? value : `var(--${value}-color,${fallback})`;
const sharedStyle = `
:host{display:block;height:100%;min-height:0;min-width:0;font-family:var(--paper-font-body1_-_font-family,Roboto,Arial,sans-serif)}
*{box-sizing:border-box}[hidden]{display:none!important}
ha-card{display:block;position:relative;font:inherit;color:#202732}
.grid{display:grid;width:100%;height:100%;align-items:center;text-align:center;min-width:0;min-height:0}
.img-cell{grid-area:i;display:flex;align-items:center;justify-content:center;overflow:hidden}
ha-icon{display:block;height:auto;aspect-ratio:1;--mdc-icon-size:100%}
.name{grid-area:n;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.label{grid-area:l;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
[role=button]{cursor:pointer;touch-action:manipulation;outline:none}
[role=button]:focus-visible{outline:3px solid #3478F6;outline-offset:-3px}
`;

class EchoStyledCard extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); this.childrenCards = []; }
  setConfig(config) {
    if (this.kind === 'entity' && !config.entity) throw new Error('Specify an entity');
    if (this.kind === 'container' && !Array.isArray(config.cards)) throw new Error('Container requires a cards list');
    if (config.columns !== undefined && (!Number.isInteger(config.columns) || config.columns < 1)) throw new Error('columns must be a positive integer');
    this.cancelGestures?.();
    this.config = { ...config };
    delete this.config.profile;
    delete this.config.density;
    delete this.config.sizing;
    delete this.config.height;
    this.render();
    this.update();
    this.ready = this.configureChildren ? this.configureChildren() : Promise.resolve();
  }
  shellWith(styles) {
    const style = document.createElement('style');
    style.textContent = sharedStyle + styles + `:host{contain:size;contain-intrinsic-size:0px ${this.getCardSize() * 50}px;contain-intrinsic-block-size:${this.getCardSize() * 50}px}`;
    this.shell = document.createElement('ha-card');
    this.grid = document.createElement('div');
    this.grid.className = 'grid';
    this.shell.append(this.grid);
    this.shadowRoot.replaceChildren(style, this.shell);
  }
  set hass(value) { this._hass = value; this.update(); for (const card of this.childrenCards) card.hass = value; }
  get hass() { return this._hass; }
  set layout(value) { this._layout = value; }
  get layout() { return this._layout; }
  set preview(value) { this._preview = value; for (const card of this.childrenCards) card.preview = value; }
  get preview() { return this._preview; }
  disconnectedCallback() { this.cancelGestures?.(); }
  update() {}
}

class EchoEntityCard extends EchoStyledCard {
  get kind() { return 'entity'; }
  getCardSize() { return 3; }
  getGridOptions() { return { columns: 6, rows: 2, min_columns: 3, min_rows: 2 }; }
  render() {
    this.shellWith(cardStyles['security-tile'] + `
.img-cell{position:relative}img{width:100%;height:100%;object-fit:cover}
:host([horizontal]) .grid{grid-template-areas:"i n" "i l";grid-template-columns:50px minmax(0,1fr);column-gap:12px}
:host([horizontal]) .name,:host([horizontal]) .label{justify-self:start;text-align:left}
`);
    this.toggleAttribute('horizontal', this.config.vertical === false);
    this.iconCell = document.createElement('div');
    this.iconCell.className = 'img-cell';
    this.icon = document.createElement('ha-icon');
    this.picture = document.createElement('img');
    this.pictureUrl = undefined;
    this.picture.alt = '';
    this.picture.hidden = true;
    this.picture.addEventListener('error', () => { this.picture.hidden = true; this.icon.hidden = false; });
    this.iconCell.append(this.icon, this.picture);
    this.nameElement = document.createElement('div');
    this.nameElement.className = 'name';
    this.stateElement = document.createElement('div');
    this.stateElement.className = 'label';
    this.grid.append(this.iconCell, this.nameElement, this.stateElement);
    this.cleanups = [];
    this.bindGestures(this.shell, '');
    this.bindGestures(this.iconCell, 'icon_');
  }
  update() {
    if (!this.config || !this.icon) return;
    const entity = this._hass?.states[this.config.entity];
    const attributes = entity?.attributes || {};
    const state = entity?.state || 'unavailable';
    const domain = this.config.entity.split('.')[0];
    const positive = ['locked', 'closed', 'on', 'playing', 'home'].includes(state);
    const inactive = ['off', 'idle', 'standby'].includes(state);
    let color = positive ? '#21926D' : inactive ? '#8B93A0' : '#C97445';
    let background = positive ? '#E4F5EC' : inactive ? '#F0F2F5' : '#FDECE3';
    if (!usable(entity)) { color = '#8B93A0'; background = '#F0F2F5'; }
    color = resolveColor(this.config.color, color);
    background = resolveColor(this.config.background_color, background);
    this.style.setProperty('--state-color', color);
    this.style.setProperty('--state-background', background);
    const defaults = { lock: state === 'locked' ? 'mdi:lock-outline' : 'mdi:lock-open-outline', cover: state === 'closed' ? 'mdi:garage' : 'mdi:garage-open', light: 'mdi:lightbulb', switch: 'mdi:power', fan: 'mdi:fan', sensor: 'mdi:eye', binary_sensor: 'mdi:checkbox-marked-circle-outline', climate: 'mdi:thermometer', media_player: 'mdi:music' };
    this.icon.setAttribute('icon', this.config.icon || attributes.icon || defaults[domain] || 'mdi:information-outline');
    this.nameElement.textContent = this.config.name || attributes.friendly_name || this.config.entity;
    const fields = this.config.state_content == null ? ['state'] : [].concat(this.config.state_content);
    this.stateElement.textContent = fields.map(field => field === 'state'
      ? ((entity && this._hass?.formatEntityState?.(entity)) || state.charAt(0).toUpperCase() + state.slice(1))
      : (entity && this._hass?.formatEntityAttributeValue?.(entity, field)) ?? attributes[field] ?? '').join(' · ');
    this.stateElement.hidden = !!this.config.hide_state;
    let pictureUrl = null;
    if (this.config.show_entity_picture && attributes.entity_picture) {
      try {
        const candidate = new URL(attributes.entity_picture, this._hass?.hassUrl?.('/') || location.href);
        if (['http:', 'https:'].includes(candidate.protocol)) pictureUrl = candidate.href;
      } catch {}
    }
    if (pictureUrl !== this.pictureUrl) {
      this.pictureUrl = pictureUrl;
      this.picture.hidden = !pictureUrl;
      this.icon.hidden = !!pictureUrl;
      if (pictureUrl) this.picture.src = pictureUrl;
      else this.picture.removeAttribute('src');
    }
    this.shell.setAttribute('aria-label', this.nameElement.textContent);
    this.iconCell.setAttribute('aria-label', `${this.nameElement.textContent} icon`);
    this.shell.setAttribute('aria-busy', String(!!this.pending));
  }
  bindGestures(element, prefix) { bindCardGestures(this, element, prefix); }
  cancelGestures() { cancelCardGestures(this); }
  runAction(key) { return runCardAction(this, key); }
  static getConfigElement() { return document.createElement('echo-entity-editor'); }
  static getStubConfig(hass, entities = [], fallback = []) { return { entity: [...entities, ...fallback, ...Object.keys(hass?.states || {})][0] || '', tap_action: { action: 'none' } }; }
}

class EchoContainerCard extends EchoStyledCard {
  get kind() { return 'container'; }
  getCardSize() { return Math.ceil((Math.max(1, Math.ceil((this.config?.cards.length || 0) / (this.config?.columns || 3))) * 150 + 34 + (this.config?.title ? 46 : 0)) / 50); }
  getGridOptions() {
    const rowCount = Math.max(1, Math.ceil((this.config?.cards.length || 0) / (this.config?.columns || 3)));
    const minimumRows = Math.ceil((rowCount * 114 + 24 + (this.config?.title ? 36 : 0)) / 64);
    return { columns: 12, rows: Math.max(minimumRows, Math.ceil(this.getCardSize() * 50 / 64)), min_columns: 3, min_rows: minimumRows };
  }
  render() {
    this.shellWith(cardStyles.security + `
.grid{display:flex;flex-direction:column;align-items:stretch;text-align:left;gap:8px}
.heading-row{display:flex;align-items:center;flex:0 0 38px}
.heading{display:flex;align-items:center;gap:10px;font-size:19px;font-weight:700;color:#24303E}
.heading ha-icon{width:24px}.children{display:grid;gap:10px;grid-template-columns:repeat(${this.config.columns || 3},minmax(0,1fr));grid-auto-rows:minmax(114px,1fr);flex:1;min-height:0}
.children>*{display:block;min-width:0;min-height:0;height:100%}
:host([square]) .children>*{aspect-ratio:1;height:auto}
:host([short]) ha-card,:host([narrow]) ha-card{padding:12px}
:host([short]) .heading-row{flex-basis:28px}
:host([narrow]) .children{column-gap:6px}
`);
    this.toggleAttribute('square', this.config.square === true);
    if (this.config.title) {
      const headingRow = document.createElement('div');
      headingRow.className = 'heading-row';
      const heading = document.createElement('div');
      heading.className = 'heading';
      if (this.config.icon) { const icon = document.createElement('ha-icon'); icon.setAttribute('icon', this.config.icon); heading.append(icon); }
      heading.append(document.createTextNode(this.config.title));
      headingRow.append(heading);
      this.grid.append(headingRow);
    }
    this.content = document.createElement('div');
    this.content.className = 'children';
    this.grid.append(this.content);
  }
  connectedCallback() {
    this.resizeObserver = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      this.toggleAttribute('short', height < 235);
      this.toggleAttribute('narrow', width < 440);
    });
    this.resizeObserver.observe(this);
  }
  disconnectedCallback() { super.disconnectedCallback(); this.resizeObserver?.disconnect(); this.resizeObserver = null; }
  async configureChildren() {
    const revision = this.revision = (this.revision || 0) + 1;
    this.childrenCards = [];
    try {
      const configs = this.config.cards;
      const needsHelpers = configs.some(config => !config.type?.startsWith('custom:echo-'));
      const helpers = needsHelpers ? await window.loadCardHelpers() : null;
      if (revision !== this.revision) return;
      const children = configs.map(config => {
        if (config.type?.startsWith('custom:echo-')) {
          const child = document.createElement(config.type.slice(7));
          if (!child.setConfig) throw new Error(`Unknown card: ${config.type}`);
          child.setAttribute('nested', '');
          child.setConfig(config);
          return child;
        }
        return helpers.createCardElement(config);
      });
      this.childrenCards = children;
      for (const child of children) { child.hass = this._hass; child.preview = this.preview; }
      this.content.replaceChildren(...children);
      await Promise.all(children.map(child => child.ready));
      if (revision === this.revision) emit(this, 'card-updated', {});
    } catch (error) {
      if (revision !== this.revision) return;
      this.content.textContent = error.message;
      this.content.setAttribute('role', 'alert');
    }
  }
  static getConfigElement() { return document.createElement('echo-container-editor'); }
  static getStubConfig() { return { columns: 3, cards: [] }; }
}


class EchoGenericEditor extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  setConfig(config) {
    const previousType = this.config?.type;
    this.config = structuredClone(config);
    delete this.config.profile;
    delete this.config.density;
    delete this.config.sizing;
    delete this.config.height;
    if (this.form && previousType === this.config.type) {
      this.form.data = { ...this.defaults, ...this.config };
      if (this.config.type !== 'custom:echo-container-card') return;
      if (this.childEditors.length === this.config.cards.length + 1) {
        this.config.cards.forEach((card, index) => { this.childEditors[index].value = card; });
        return;
      }
    }
    this.render();
  }
  set hass(value) { this._hass = value; if (this.form) this.form.hass = value; for (const child of this.childEditors || []) child.hass = value; }
  get hass() { return this._hass; }
  set lovelace(value) { this._lovelace = value; for (const child of this.childEditors || []) child.lovelace = value; }
  get lovelace() { return this._lovelace; }
  changed(config) { this.config = config; emit(this, 'config-changed', { config: structuredClone(config) }); }
  render() {
    const container = this.config.type === 'custom:echo-container-card';
    const fields = container ? [
      { name: 'title', selector: { text: {} } }, { name: 'icon', selector: { icon: {} } },
      { name: 'columns', selector: { number: { min: 1, mode: 'box' } } }, { name: 'square', selector: { boolean: {} } },
    ] : [
      { name: 'entity', required: true, selector: { entity: {} } }, { name: 'name', selector: { text: {} } },
      { name: 'icon', selector: { icon: {} } }, { name: 'color', selector: { ui_color: { include_state: true, default_color: 'state' } } },
      { name: 'background_color', selector: { ui_color: { include_state: true, default_color: 'state' } } },
      { name: 'hide_state', selector: { boolean: {} } }, { name: 'show_entity_picture', selector: { boolean: {} } },
      { name: 'vertical', selector: { boolean: {} } },
      { name: 'state_content', selector: { ui_state_content: {} }, context: { filter_entity: 'entity' } },
      ...['', 'icon_'].flatMap(prefix => gestures.map(gesture => ({ name: `${prefix}${gesture}_action`, selector: { ui_action: { default_action: 'none', actions: actionNames } }, context: { entity_id: 'entity' } }))),
    ];
    this.form = document.createElement('ha-form');
    this.form.hass = this._hass;
    this.form.schema = fields;
    const defaults = container ? { columns: 3, square: false } : { vertical: true, ...Object.fromEntries(['', 'icon_'].flatMap(prefix => gestures.map(gesture => [`${prefix}${gesture}_action`, { action: 'none' }])))};
    this.defaults = defaults;
    this.form.data = { ...defaults, ...this.config };
    this.form.computeLabel = schema => ({ color: 'Icon color', background_color: 'Icon background color' }[schema.name] || schema.name.replace(/_/g, ' ').replace(/^./, character => character.toUpperCase()));
    this.form.addEventListener('value-changed', event => {
      event.stopPropagation();
      const next = { ...this.config };
      for (const field of fields) {
        const value = event.detail.value[field.name];
        if (value === undefined || value === '') delete next[field.name];
        else next[field.name] = value;
      }
      this.changed(next);
    });
    this.shadowRoot.replaceChildren(this.form);
    this.childEditors = [];
    if (!container) return;
    const controls = document.createElement('div');
    const button = (label, handler) => {
      const element = document.createElement('button'); element.type = 'button'; element.textContent = label;
      element.addEventListener('click', handler); return element;
    };
    this.config.cards.forEach((config, index) => {
      const section = document.createElement('fieldset');
      const legend = document.createElement('legend'); legend.textContent = `Card ${index + 1}`;
      section.append(legend);
      const editor = document.createElement('hui-card-element-editor');
      editor.hass = this._hass; editor.lovelace = this.lovelace; editor.value = config;
      editor.addEventListener('config-changed', event => {
        event.stopPropagation();
        const cards = [...this.config.cards]; cards[index] = event.detail.config;
        this.changed({ ...this.config, cards });
      });
      section.append(editor, button('Remove', () => {
        this.changed({ ...this.config, cards: this.config.cards.filter((_, position) => position !== index) }); this.render();
      }));
      if (index > 0) section.append(button('Move up', () => {
        const cards = [...this.config.cards]; [cards[index - 1], cards[index]] = [cards[index], cards[index - 1]];
        this.changed({ ...this.config, cards }); this.render();
      }));
      controls.append(section); this.childEditors.push(editor);
    });
    controls.append(button('Add entity', () => {
      const stub = EchoEntityCard.getStubConfig(this.hass);
      this.changed({ ...this.config, cards: [...this.config.cards, { type: 'custom:echo-entity-card', ...stub }] }); this.render();
    }));
    const picker = document.createElement('hui-card-picker');
    picker.hass = this.hass; picker.lovelace = this.lovelace;
    const addCard = config => { this.changed({ ...this.config, cards: [...this.config.cards, config] }); this.render(); };
    picker.cardPicked = addCard;
    picker.addEventListener('config-changed', event => { event.stopPropagation(); addCard(event.detail.config); });
    const details = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Add another card type';
    details.append(summary, picker); controls.append(details); this.childEditors.push(picker);
    this.shadowRoot.append(controls);
  }
}

customElements.define('echo-entity-card', EchoEntityCard);
customElements.define('echo-container-card', EchoContainerCard);
customElements.define('echo-entity-editor', class extends EchoGenericEditor {});
customElements.define('echo-container-editor', class extends EchoGenericEditor {});
window.customCards = window.customCards || [];
for (const [kind, description] of [['entity', 'One entity with the original Echo appearance and configurable actions.'], ['container', 'The original Echo group appearance with any number of child cards.']]) {
  const type = `echo-${kind}-card`;
  if (!window.customCards.some(card => card.type === type)) window.customCards.push({ type, name: `Echo ${kind.charAt(0).toUpperCase() + kind.slice(1)}`, description, preview: false });
}

const domains = {
  weather: ['weather'], toggle: ['light', 'switch', 'input_boolean', 'fan'], climate: ['climate'],
  media: ['media_player'], fan: ['fan'], security: ['lock', 'cover'],
};

export const textFields = {
  header: { title: 'Title', time: 'Time', date: 'Date', greeting: 'Greeting' },
  weather: { label: 'Label', condition: 'Condition', temperature: 'Temperature', humidity: 'Humidity', icon: 'Weather icon' },
  climate: { title: 'Title', status: 'Mode / status', target_temperature: 'Target temperature', current_temperature: 'Current temperature', target_label: 'Target label', hint: 'Hint' },
};
export const entityTextFields = {
  header: [], weather: ['condition', 'temperature', 'humidity', 'icon'],
  climate: ['title', 'status', 'target_temperature', 'current_temperature'],
};
const targetValue = "state_attr(entity, 'target_temp_low' if config.get('temperature_target') == 'low' else 'target_temp_high' if config.get('temperature_target') == 'high' else 'temperature')";
const targetText = `{% set value = ${targetValue} %}{{ ('%g' | format(value | round(3))) ~ temperature_unit if value is number else '—' }}`;
export function templateDefaults(kind) {
  if (kind === 'header') return {
    title: 'Home',
    time: "{{ now().strftime('%I:%M %p').lstrip('0') }}",
    date: "{{ now().strftime('%A, %B') }} {{ now().day }}",
    greeting: "{{ 'Good morning' if now().hour < 12 else 'Good afternoon' if now().hour < 17 else 'Good evening' }}",
  };
  if (kind === 'weather') return {
    label: 'Outside',
    condition: "{{ 'Partly Cloudy' if states(entity) == 'partlycloudy' else states(entity) | replace('-', ' ') | title }}",
    temperature: "{% set value = state_attr(entity, 'temperature') %}{{ (value | round(0) | int | string) ~ (state_attr(entity, 'temperature_unit') or temperature_unit) if value is number else '--' }}",
    humidity: "{% set value = state_attr(entity, 'humidity') %}{{ 'Humidity ' ~ value ~ '%' if value is not none else '' }}",
    icon: "{{ {'clear-night': 'mdi:weather-night', 'sunny': 'mdi:weather-sunny', 'partlycloudy': 'mdi:weather-partly-cloudy', 'cloudy': 'mdi:weather-cloudy', 'rainy': 'mdi:weather-rainy', 'pouring': 'mdi:weather-pouring', 'snowy': 'mdi:weather-snowy', 'lightning': 'mdi:weather-lightning'}.get(states(entity), 'mdi:weather-partly-cloudy') }}",
  };
  if (kind === 'climate') return {
    title: "{{ state_attr(entity, 'friendly_name') or entity }}",
    status: "{{ states(entity) | capitalize }}{% if not config.get('show_temperature_control', false) %} · {% set value = state_attr(entity, 'temperature') %}{{ (value | round(0) | int | string) ~ temperature_unit if value is number else '--' ~ temperature_unit }}{% endif %}",
    target_temperature: targetText,
    current_temperature: "{% set value = state_attr(entity, 'current_temperature') %}{% if config.get('show_temperature_control', false) %}Current {{ ('%g' | format(value)) ~ temperature_unit if value is number else '—' ~ temperature_unit }}{% else %}{{ (value | round(0) | int | string) ~ temperature_unit if value is number else '--' }}{% endif %}",
    target_label: "{{ 'Heat to' if config.get('temperature_target') == 'low' else 'Cool to' if config.get('temperature_target') == 'high' else 'Set to' }}",
    hint: '',
  };
  return {};
}
export function normalizeTextConfig(kind, config, previous) {
  if (!textFields[kind]) return { ...config };
  const defaults = templateDefaults(kind);
  const templates = { ...defaults, ...config.templates };
  const titleSlot = kind === 'weather' ? 'label' : 'title';
  if (!Object.prototype.hasOwnProperty.call(config.templates || {}, titleSlot)) {
    const oldTitle = config.name ?? (kind === 'header' ? config.room : undefined);
    if (typeof oldTitle === 'string') templates[titleSlot] = oldTitle;
  }
  for (const key of Object.keys(defaults)) if (typeof templates[key] !== 'string') templates[key] = defaults[key];
  if (previous && previous.entity !== config.entity) {
    for (const key of entityTextFields[kind]) templates[key] = defaults[key];
  }
  const result = { ...config, templates };
  delete result.name;
  if (kind === 'header') delete result.room;
  return result;
}

export function sliderCapability(entity) {
  const attributes = entity?.attributes || {};
  if (entity?.entity_id?.startsWith('fan.')) return attributes.supported_features == null
    ? typeof attributes.percentage === 'number' || typeof attributes.percentage_step === 'number'
    : !!(attributes.supported_features & 1);
  if (entity?.entity_id?.startsWith('light.')) return attributes.supported_color_modes
    ? attributes.supported_color_modes.some(mode => ['brightness', 'color_temp', 'hs', 'xy', 'rgb', 'rgbw', 'rgbww', 'white'].includes(mode))
    : !!(attributes.supported_features & 1);
  return false;
}

export function stubConfig(kind, hass, entities = [], fallback = []) {
  const candidates = [...new Set([...entities, ...fallback, ...Object.keys(hass?.states || {})])];
  const matching = candidates.filter(id => domains[kind]?.includes(id.split('.')[0]));
  if (kind === 'header') return normalizeTextConfig(kind, {});
  if (kind === 'security') return { name: 'Security', items: [0, 1, 2].map(index => ({ entity: matching[index] || '', name: `Device ${index + 1}` })) };
  return normalizeTextConfig(kind, { entity: matching[0] || '' });
}

class EchoCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.controls = [];
    this.iconForms = [];
  }
  setConfig(config) {
    const kind = config.type?.replace('custom:echo-', '').replace('-card', '');
    config = normalizeTextConfig(kind, config, this.kind === kind ? this.config : undefined);
    this.config = { ...config, ...(config.items ? { items: config.items.map(item => ({ ...item })) } : {}) };
    delete this.config.profile;
    delete this.config.density;
    delete this.config.sizing;
    delete this.config.height;
    if (this.kind !== kind || !this.form) { this.kind = kind; this.build(); }
    this.sync();
  }
  set hass(value) { this._hass = value; this.syncEntities(); this.syncCapabilities(); }
  get hass() { return this._hass; }

  build() {
    this.controls = [];
    this.iconForms = [];
    this.templateForm = null;
    this.actionForm = null;
    this.textSchemaVariant = undefined;
    this.shadowRoot.replaceChildren();
    const style = document.createElement('style');
    style.textContent = `
      :host{display:block;color:var(--primary-text-color);font:inherit}
      form{display:grid;gap:16px}label{display:grid;gap:6px;font:inherit}
      input,select,textarea{font:inherit;box-sizing:border-box;width:100%;min-height:44px;border:1px solid var(--divider-color,#aaa);border-radius:8px;padding:8px;color:var(--primary-text-color);background:var(--card-background-color,#fff)}
      input[type=checkbox]{width:24px;min-height:24px;height:24px}textarea{min-height:76px;resize:vertical}
      fieldset{display:grid;gap:12px;border:1px solid var(--divider-color,#aaa);border-radius:8px;padding:12px}
      p{margin:0;color:var(--secondary-text-color);font-size:14px;line-height:1.5}
    `;
    this.form = document.createElement('form');
    this.form.addEventListener('submit', event => event.preventDefault());
    const help = document.createElement('p');
    help.textContent = 'Use Home Assistant’s Layout tab to set Sections columns and rows. The card adapts to the allocated space.';
    this.form.append(help);
    if (this.kind === 'security') {
      this.control(this.form, 'Title (optional)', 'name');
      this.control(this.form, 'Heading icon (optional)', 'icon');
      for (let index = 0; index < 3; index++) {
        const group = document.createElement('fieldset');
        const legend = document.createElement('legend');
        legend.textContent = `Security tile ${index + 1}`;
        group.append(legend);
        this.control(group, 'Entity', 'entity', { entity: true, required: true, index });
        this.control(group, 'Name', 'name', { index });
        this.control(group, 'Icon (optional, for example mdi:garage)', 'icon', { index });
        this.form.append(group);
      }
    } else if (this.kind !== 'header') {
      this.control(this.form, 'Entity', 'entity', { entity: true, required: true });
      if (!textFields[this.kind]) this.control(this.form, 'Name (optional)', 'name');
      if (['toggle', 'fan', 'climate'].includes(this.kind)) this.control(this.form, 'Icon (optional, for example mdi:lamp)', 'icon');
    }
    if (this.kind === 'header') this.control(this.form, 'Header arrangement', 'header_layout', { defaultValue: 'auto', options: [{ value: 'auto', label: 'Automatic (default)' }, { value: 'stacked', label: 'Greeting above title' }, { value: 'compact', label: 'Compact: greeting below clock' }] });
    if (this.kind === 'weather') this.control(this.form, 'Weather arrangement', 'weather_layout', { defaultValue: 'stacked', options: [{ value: 'stacked', label: 'Temperature below condition (default)' }, { value: 'inline', label: 'Temperature beside condition' }] });
    if (textFields[this.kind]) {
      const fields = textFields[this.kind];
      const group = document.createElement('div');
      const help = document.createElement('p'); help.textContent = 'Each field controls its displayed text. Defaults are prefilled; enter plain text or Jinja. Empty text hides that value. Changing the entity resets entity-derived fields, including your edits to those fields.';
      group.append(help);
      this.templateForm = document.createElement('ha-form');
      this.templateForm.dataset.key = 'templates';
      this.templateForm.schema = Object.keys(fields).map(name => ({ name, selector: { template: { preview: false } } }));
      this.templateForm.computeLabel = field => fields[field.name];
      this.templateForm.addEventListener('value-changed', event => {
        event.stopPropagation();
        const templates = { ...this.config.templates };
        for (const key of Object.keys(fields)) {
          const value = event.detail.value[key];
          if (Object.prototype.hasOwnProperty.call(event.detail.value, key)) templates[key] = typeof value === 'string' ? value : '';
        }
        const next = { ...this.config };
        next.templates = templates;
        this.config = next;
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: next }, bubbles: true, composed: true }));
      });
      group.append(this.templateForm);
      this.form.append(group);
    }
    if (['toggle', 'fan'].includes(this.kind)) this.control(this.form, 'Show slider (brightness or fan speed)', 'slider', { checkbox: true, defaultValue: this.kind === 'fan' });
    if (['toggle', 'fan'].includes(this.kind)) {
      this.actionForm = document.createElement('ha-form');
      this.actionForm.dataset.key = 'actions';
      this.actionForm.computeLabel = field => field.name.replace(/_/g, ' ').replace(/^./, value => value.toUpperCase());
      this.actionForm.schema = ['', 'icon_'].flatMap(prefix => ['tap', 'hold', 'double_tap'].map(gesture => ({
        name: `${prefix}${gesture}_action`, selector: { ui_action: { default_action: prefix ? 'none' : gesture === 'tap' ? 'toggle' : gesture === 'hold' ? 'more-info' : 'none', actions: ['none', 'more-info', 'toggle', 'perform-action', 'navigate', 'url'] } }, context: { entity_id: 'entity' },
      })));
      this.actionForm.addEventListener('value-changed', event => {
        event.stopPropagation();
        const next = { ...this.config };
        for (const field of this.actionForm.schema) if (Object.hasOwn(event.detail.value, field.name)) next[field.name] = structuredClone(event.detail.value[field.name]);
        this.config = next;
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: next }, bubbles: true, composed: true }));
      });
      this.form.append(this.actionForm);
    }
    if (this.kind === 'climate') {
      this.control(this.form, 'Show temperature adjustment buttons', 'show_temperature_control', { checkbox: true });
      this.climateForm = document.createElement('ha-form');
      this.climateForm.computeLabel = field => ({ hvac_modes: 'Modes available for cycling (optional)', icon_tap_action: 'Thermostat icon tap action', action: 'Action', perform_action: 'Action (domain.service)', data: 'Action data', target: 'Target', navigation_path: 'Dashboard path', url_path: 'URL', temperature_target: 'Temperature target (range systems only)' }[field.name] || field.name);
      this.climateForm.addEventListener('value-changed', event => {
        event.stopPropagation();
        this.config = { ...this.config, ...event.detail.value };
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config }, bubbles: true, composed: true }));
      });
      this.form.append(this.climateForm);
    }
    this.shadowRoot.append(style, this.form);
    this.syncEntities();
    this.syncCapabilities();
  }

  control(parent, title, name, options = {}) {
    if (name === 'icon') {
      this.iconControl(parent, title, options);
      return;
    }
    const label = document.createElement('label');
    label.append(document.createTextNode(title));
    const input = document.createElement(options.options ? 'select' : options.multiline ? 'textarea' : 'input');
    input.dataset.key = options.index === undefined ? name : `items.${options.index}.${name}`;
    if (options.options) {
      for (const value of options.options) {
        const option = document.createElement('option');
        option.value = typeof value === 'string' ? value : value.value;
        option.textContent = typeof value === 'string' ? value : value.label;
        input.append(option);
      }
    } else {
      if (!options.multiline) input.type = options.checkbox ? 'checkbox' : options.number ? 'number' : 'text';
      if (options.number) { input.min = '1'; input.step = '1'; }
    }
    input.required = !!options.required;
    if (options.entity) {
      const list = document.createElement('datalist');
      list.id = `entities-${this.controls.length}`;
      input.setAttribute('list', list.id);
      label.append(list);
      options.list = list;
    }
    input.addEventListener('change', () => {
      if (!input.checkValidity()) { input.reportValidity(); return; }
      const text = input.value.trim();
      const value = options.checkbox ? input.checked : options.number && text ? Number(text) : text;
      let next = { ...this.config };
      if (options.index !== undefined) {
        next.items = [0, 1, 2].map(index => ({ ...this.config.items?.[index] }));
        if (text) next.items[options.index][name] = value;
        else delete next.items[options.index][name];
      } else if (name.startsWith('templates.')) {
        next.templates = { ...this.config.templates };
        if (text) next.templates[name.slice(10)] = value;
        else delete next.templates[name.slice(10)];
        if (!Object.keys(next.templates).length) delete next.templates;
      } else if (text || options.checkbox) next[name] = value;
      else delete next[name];
      next = normalizeTextConfig(this.kind, next, this.config);
      this.config = next;
      this.syncCapabilities();
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: next }, bubbles: true, composed: true }));
    });
    label.append(input);
    parent.append(label);
    this.controls.push({ input, name, ...options });
  }
  iconControl(parent, title, options) {
    const form = document.createElement('ha-form');
    form.dataset.key = options.index === undefined ? 'icon' : `items.${options.index}.icon`;
    form.schema = [{ name: 'icon', selector: { icon: {} }, context: { icon_entity: 'entity' } }];
    form.computeLabel = () => title;
    form.addEventListener('value-changed', event => {
      event.stopPropagation();
      const icon = event.detail.value.icon;
      const next = { ...this.config };
      const target = options.index === undefined ? next : (next.items = this.config.items.map(item => ({ ...item })))[options.index];
      if (typeof icon === 'string' && icon.trim()) target.icon = icon.trim();
      else delete target.icon;
      this.config = next;
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: next }, bubbles: true, composed: true }));
    });
    this.iconForms.push({ form, index: options.index });
    parent.append(form);
  }
  syncIcons() {
    for (const field of this.iconForms) {
      const config = field.index === undefined ? this.config : this.config.items?.[field.index];
      field.form.hass = this._hass;
      field.form.data = { icon: config?.icon || '', entity: config?.entity };
    }
  }
  sync() {
    for (const field of this.controls) {
      const value = field.index === undefined ? field.name.split('.').reduce((item, key) => item?.[key], this.config) : this.config.items?.[field.index]?.[field.name];
      if (this.shadowRoot.activeElement !== field.input) {
        if (field.checkbox) field.input.checked = value ?? field.defaultValue ?? false;
        else field.input.value = value ?? field.defaultValue ?? '';
      }
    }
    this.syncEntities();
    this.syncCapabilities();
  }
  syncCapabilities() {
    this.syncIcons();
    if (this.actionForm) {
      this.actionForm.hass = this._hass;
      const tap = (this.config.slider ?? this.kind === 'fan') ? 'none' : 'toggle';
      this.actionForm.schema[0].selector.ui_action.default_action = tap;
      // Missing icon keys mean inherit. Do not turn that into explicit "none"
      // when Home Assistant returns the entire form after an unrelated edit.
      this.actionForm.data = { tap_action: { action: tap }, hold_action: { action: 'more-info' }, double_tap_action: { action: 'none' }, ...this.config };
    }
    if (this.templateForm) {
      this.templateForm.hass = this._hass;
      this.templateForm.data = { ...this.config.templates };
      const variant = this.config.show_temperature_control === true;
      if (variant !== this.textSchemaVariant) {
        this.textSchemaVariant = variant;
        this.templateForm.schema = Object.keys(textFields[this.kind]).map(name => ({
          name, selector: { template: { preview: false } },
          visible: this.kind !== 'climate' || (['target_temperature', 'target_label'].includes(name) ? variant : name === 'hint' ? !variant : true),
        }));
      }
    }
    const entity = this._hass?.states[this.config?.entity];
    const slider = this.controls.find(field => field.name === 'slider');
    if (slider) {
      slider.input.disabled = !sliderCapability(entity);
      slider.input.parentElement.hidden = !sliderCapability(entity) && !this.config.slider && this.kind !== 'fan';
    }
    if (!this.climateForm || this.kind !== 'climate') return;
    this.climateForm.hass = this._hass;
    this.climateForm.data = { icon_tap_action: { action: 'none' }, ...this.config };
    this.climateForm.schema = [
      { name: 'hvac_modes', selector: { select: { multiple: true, options: entity?.attributes.hvac_modes || [] } } },
      ...(entity?.attributes.target_temp_low != null || entity?.attributes.target_temp_high != null ? [{ name: 'temperature_target', selector: { select: { options: [{ value: 'low', label: 'Heating minimum' }, { value: 'high', label: 'Cooling maximum' }] } } }] : []),
      { name: 'icon_tap_action', type: 'expandable', schema: [
        { name: 'action', selector: { select: { options: ['none', 'more-info', 'cycle-hvac-mode', 'perform-action', 'navigate', 'url'] } } },
        { name: 'perform_action', visible: { field: 'action', operator: 'eq', value: 'perform-action' }, selector: { text: {} } },
        { name: 'target', visible: { field: 'action', operator: 'eq', value: 'perform-action' }, selector: { target: {} } },
        { name: 'data', visible: { field: 'action', operator: 'eq', value: 'perform-action' }, selector: { object: {} } },
        { name: 'navigation_path', visible: { field: 'action', operator: 'eq', value: 'navigate' }, selector: { text: {} } },
        { name: 'url_path', visible: { field: 'action', operator: 'eq', value: 'url' }, selector: { text: {} } },
      ] },
    ];
  }
  syncEntities() {
    for (const field of this.controls) {
      if (!field.list) continue;
      const ids = Object.keys(this._hass?.states || {}).filter(id => domains[this.kind]?.includes(id.split('.')[0])).sort();
      if (field.list.dataset.ids === ids.join('|')) continue;
      field.list.dataset.ids = ids.join('|');
      field.list.replaceChildren();
      for (const id of ids) {
        const option = document.createElement('option');
        option.value = id;
        option.label = this._hass.states[id].attributes?.friendly_name || id;
        field.list.append(option);
      }
    }
  }
}

if (!customElements.get('echo-card-editor')) customElements.define('echo-card-editor', EchoCardEditor);

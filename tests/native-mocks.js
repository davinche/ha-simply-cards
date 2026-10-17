class NativeEditorMock extends HTMLElement {
  setConfig(config) { this.config = structuredClone(config); }
}
customElements.define('echo-native-editor-mock', NativeEditorMock);

class NativeTileMock extends HTMLElement {
  constructor() { super(); this.attachShadow({mode:'open'}); }
  setConfig(config) { this.config = structuredClone(config); this.render(); }
  set hass(value) { this._hass=value; this.render(); }
  get hass() { return this._hass; }
  static getConfigElement() { return document.createElement('echo-native-editor-mock'); }
  getCardSize() { return this.config?.vertical ? 2 : 1; }
  getGridOptions() { const rows=this.getCardSize();return {columns:6,rows,min_columns:this.config?.vertical ? 3 : 6,min_rows:rows}; }
  render() {
    if (!this.config) return;
    const style=document.createElement('style');
    style.textContent=':host{display:block;height:100%}ha-card{display:flex;gap:12px;align-items:center;justify-content:center;height:100%;box-sizing:border-box;border-radius:24px;background:white;padding:12px;font:16px Arial}.vertical{flex-direction:column}small{display:block;color:#89919D;margin-top:4px}';
    const shell=document.createElement('ha-card');
    if (this.config.vertical) shell.className='vertical';
    const icon=document.createElement('span');icon.textContent='◇';
    const text=document.createElement('div');
    const name=document.createElement('strong');name.textContent=this.config.name || this.config.entity;
    text.append(name);
    if (!this.config.hide_state) { const state=document.createElement('small');state.textContent=this._hass?.states[this.config.entity]?.state || 'unavailable';text.append(state); }
    shell.append(icon,text);
    this.shadowRoot.replaceChildren(style,shell);
  }
}
customElements.define('hui-tile-card', NativeTileMock);

class NativeGridMock extends HTMLElement {
  constructor() { super();this.attachShadow({mode:'open'});this.cards=[]; }
  static getConfigElement() { return document.createElement('echo-native-editor-mock'); }
  getCardSize() { return Math.ceil(this.cards.length/(this.config?.columns || 3)); }
  setConfig(config) {
    this.config=structuredClone(config);
    this.cards=[];
    const style=document.createElement('style');
    style.textContent=':host{display:block;height:100%}.grid{display:grid;gap:8px;height:100%;grid-template-columns:repeat(var(--columns),minmax(0,1fr))}';
    const grid=document.createElement('div');grid.className='grid';grid.style.setProperty('--columns',config.columns || 3);
    for (const config of this.config.cards) {
      const card=createCard(config);this.cards.push(card);grid.append(card);
    }
    this.shadowRoot.replaceChildren(style,grid);
    this.hass=this._hass;
  }
  set hass(value) { this._hass=value;for (const card of this.cards) card.hass=value; }
  get hass() { return this._hass; }
}
customElements.define('hui-grid-card', NativeGridMock);

function createCard(config) {
  const tag=config.type==='tile' ? 'hui-tile-card' : config.type==='grid' ? 'hui-grid-card' : config.type.replace('custom:','');
  const card=document.createElement(tag);
  if (card.setConfig) card.setConfig(config);
  return card;
}
window.loadCardHelpers=async () => ({createCardElement:createCard});

customElements.define('ha-form', class extends HTMLElement {});
customElements.define('hui-card-element-editor', class extends HTMLElement {});
customElements.define('hui-card-picker', class extends HTMLElement {});

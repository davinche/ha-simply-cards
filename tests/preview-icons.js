// Real MDI paths, matching Home Assistant's icon source. License in assets/.
const paths = await fetch(new URL('./assets/mdi-paths.json', import.meta.url)).then(response => response.json());
customElements.define('ha-card', class extends HTMLElement {});
customElements.define('ha-icon', class extends HTMLElement {
  static get observedAttributes() { return ['icon']; }
  constructor() {
    super();
    this.attachShadow({mode:'open'});
    this.shadowRoot.innerHTML = '<style>:host{display:block}svg{display:block;width:100%;height:100%;fill:currentColor}</style><svg viewBox="0 0 24 24" aria-hidden="true"><path/></svg>';
  }
  attributeChangedCallback() {
    this.shadowRoot.querySelector('path').setAttribute('d', paths[this.getAttribute('icon')] || paths['mdi:chevron-right']);
  }
});

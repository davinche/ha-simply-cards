// Public visual system. Text and entity configuration come exclusively from card config/hass.
// Scale the approved proportions in CSS pixels, including zoomed touch displays.
export function sizeDesign(card, height) {
  const reference = { header: 212, weather: 212, toggle: 192, climate: 192, media: 304, entity: 222, 'security-tile': 222 }[card.kind];
  const scale = reference ? Math.min(1, height / reference) : 1;
  card.toggleAttribute('roomy', scale >= .65);
  card.style.setProperty('--echo-design-scale', String(scale >= .65 ? scale : 1));
  return scale >= .65 ? scale : 1;
}

export const designStyle = `
:host{--echo-design-text:#1D302E;--echo-design-secondary:#7A807D;--echo-design-surface:#FFFDF9;--echo-design-end:#FCFAF5;--echo-design-recess:#F5F3EC;--echo-design-border:#EDEAE1;--echo-design-accent:#A17B47;--echo-design-icon:#AD8754;--echo-design-icon-bg:#F3EDE2;--echo-design-header:#F5EBDD}
:host([echo-dark]){--echo-design-text:#F3F1EC;--echo-design-secondary:#B9B6AF;--echo-design-surface:#242625;--echo-design-end:#292927;--echo-design-recess:#282C29;--echo-design-border:#414540;--echo-design-accent:#E5BA78;--echo-design-icon:#E5BA78;--echo-design-icon-bg:#38352F;--echo-design-header:#302C26}
:host([kind="header"]) ha-card,:host([kind="toggle"]) ha-card,:host([kind="climate"]) ha-card,:host([kind="media"]) ha-card,:host([kind="security"]) ha-card,:host([kind="container"]) ha-card,:host([kind="fan"]) ha-card{border-radius:28px;border:1px solid var(--echo-design-border);background:linear-gradient(125deg,var(--echo-design-surface),var(--echo-design-end));box-shadow:0 8px 24px #58492F09;color:var(--echo-design-text)}
:host([kind="header"]) [data-field="greeting"]{font-family:var(--echo-font-interface,Inter,sans-serif);font-weight:500}
:host([kind="header"]) [data-field="room"]{font-family:var(--echo-font-display,"Cormorant Garamond",Georgia,serif);font-weight:400}
:host([kind="header"]) ha-card{background:linear-gradient(115deg,var(--echo-design-surface),var(--echo-design-header))}
:host([kind="header"][roomy][header-layout="auto"]) ha-card{padding:24px 28px}
:host([kind="header"][roomy][header-layout="auto"]) .grid{grid-template-rows:24px minmax(0,1fr) 26px}
:host([kind="header"][roomy][header-layout="auto"]) [data-field="greeting"]{font-size:14px;line-height:24px;text-transform:uppercase;letter-spacing:3px;color:var(--echo-design-accent)}
:host([kind="header"][roomy][header-layout="auto"]) [data-field="room"]{font-size:64px;line-height:72px;letter-spacing:-1.6px}
:host([kind="header"][roomy][header-layout="auto"]) [data-field="clock"]{font-size:34px;line-height:42px;font-weight:400;letter-spacing:-.9px}
:host([kind="header"][roomy][header-layout="auto"]) [data-field="date"]{font-size:18px;line-height:26px;color:var(--echo-design-text)}
:host([kind="weather"]) [data-field="condition"]{font-family:var(--echo-font-display,"Cormorant Garamond",Georgia,serif);font-weight:400}
:host([kind="weather"][roomy][weather-layout="stacked"]) ha-card{padding:24px;border-radius:28px}
:host([kind="weather"][roomy][weather-layout="stacked"]) .grid{grid-template-areas:". eyebrow" ". condition" "i temperature" ". humidity";grid-template-columns:48px minmax(0,1fr);grid-template-rows:20px 34px 50px 24px;column-gap:12px;row-gap:4px}
:host([kind="weather"][roomy]) .img-cell{width:48px;height:48px}
:host([kind="weather"][roomy]) ha-icon{width:44px;color:var(--echo-weather-icon,var(--echo-design-icon))}
:host([kind="weather"][roomy][weather-layout="stacked"]) [data-field="eyebrow"]{font-size:14px;line-height:20px;color:var(--echo-weather-secondary,var(--echo-design-secondary))}
:host([kind="weather"][roomy][weather-layout="stacked"]) [data-field="condition"]{font-size:28px;line-height:34px;color:var(--echo-weather-primary,var(--echo-design-text))}
:host([kind="weather"][roomy][weather-layout="stacked"]) [data-field="temperature"]{font-size:42px;line-height:50px;font-weight:400;letter-spacing:-1.5px;color:var(--echo-weather-primary,var(--echo-design-text))}
:host([kind="weather"][roomy][weather-layout="stacked"]) [data-field="humidity"]{font-size:16px;line-height:24px;color:var(--echo-weather-secondary,var(--echo-design-secondary))}
:host([kind="weather"][roomy][weather-fallback]) .grid{grid-template-areas:"i eyebrow" "i condition" "i temperature" "i humidity";grid-template-columns:64px minmax(0,1fr)}
:host([kind="weather"][roomy][weather-fallback]) .img-cell{width:64px;height:64px}
:host([kind="toggle"]) .img-cell{background:var(--echo-design-icon-bg)}
:host([kind="toggle"]) ha-icon{color:var(--echo-design-icon)}
:host([kind="toggle"][roomy]) ha-card{padding:20px 22px}
:host([kind="toggle"][roomy]) .grid{grid-template-rows:76px minmax(0,1fr) 24px}
:host([kind="toggle"][roomy]) .img-cell{width:76px;height:76px;border-radius:50%}
:host([kind="toggle"][roomy]) ha-icon{width:38px}
:host([kind="toggle"][roomy]) .name{font-size:22px;line-height:28px;font-weight:400;margin:0;letter-spacing:-.4px}
:host([kind="toggle"][roomy]) .label{font-size:18px;line-height:24px;margin:0}
:host([kind="toggle"][roomy]) .toggle{width:64px;height:36px;padding:4px;border:1px solid var(--echo-design-border)}
:host([kind="toggle"][roomy]) .toggle span{width:26px;height:26px}
:host([kind="climate"][roomy]:not([temperature-control])) ha-card{padding:24px}
:host([kind="climate"][roomy]:not([temperature-control])) .grid{grid-template-columns:88px minmax(0,1fr) auto;column-gap:24px}
:host([kind="climate"][roomy]:not([temperature-control])) .img-cell{width:88px;height:88px}
:host([kind="climate"][roomy]:not([temperature-control])) ha-icon{width:40px}
:host([kind="climate"][roomy]:not([temperature-control])) .name{font-size:22px;line-height:30px;font-weight:400;letter-spacing:-.5px}
:host([kind="climate"][roomy]:not([temperature-control])) .label{font-size:18px;line-height:26px}
:host([kind="climate"][roomy]:not([temperature-control])) [data-field="current"]{font-size:44px;line-height:54px;font-weight:400;letter-spacing:-1.5px}
:host([kind="media"]){--echo-media-control-size:52px}
:host([kind="media"][roomy]){--echo-media-control-size:60px}
:host([kind="media"][roomy]) ha-card{padding:20px}
:host([kind="media"][roomy][media-layout="landscape"]) .grid{grid-template-rows:76px var(--echo-action-size);align-content:center;row-gap:18px}
:host([kind="media"][roomy][media-layout="landscape"]) [data-field="art"]{align-self:center}
:host([kind="media"][roomy][media-layout="landscape"]) .info{align-self:center}
:host([kind="media"][roomy]) .info strong{font-size:24px;line-height:32px;font-weight:500}
:host([kind="media"][roomy]) .info span{font-size:18px;line-height:26px}
:host([kind="media-action"]) ha-card{background:var(--echo-design-icon-bg);border:1px solid var(--echo-design-border)}
:host([kind="media-action"]) ha-icon{color:var(--echo-design-text);width:28px}
:host([kind="media-action"][primary-action]) ha-card{background:#A98A60}
:host([kind="media-action"][primary-action]) ha-icon{color:#FFFDF9}
:host([kind="media-action"][primary-action][echo-dark]) ha-card{background:#776247}
:host([kind="art"]) ha-card{background:linear-gradient(145deg,#CFC6DF,#E6C5C9 58%,#EDD5B6);border-radius:18px}
:host([kind="art"][echo-dark]) ha-card{background:linear-gradient(145deg,#6D6681,#9B7C85 58%,#A79277)}
:host([kind="art"]) ha-icon{width:40px}
:host([kind="container"]) .heading,:host([kind="security"]) .security-heading{font-size:22px;line-height:30px;font-weight:400;color:var(--echo-design-text)}
:host([kind="container"]) .heading-row{min-height:0}
:host([kind="container"]) .heading ha-icon,:host([kind="security"]) .security-heading ha-icon{width:28px;color:var(--echo-design-accent)}
:host([kind="entity"]) ha-card,:host([kind="security-tile"]) ha-card{background:var(--echo-design-recess);border:1px solid var(--echo-design-border);border-radius:20px}
:host([kind="entity"][roomy]:not([horizontal])) ha-card,:host([kind="security-tile"][roomy]) ha-card{padding:16px 8px}
:host([kind="entity"][roomy]:not([horizontal])) .img-cell,:host([kind="security-tile"][roomy]) .img-cell{width:72px;height:72px}
:host([kind="entity"][roomy]:not([horizontal])) ha-icon,:host([kind="security-tile"][roomy]) ha-icon{width:34px}
:host([kind="entity"][roomy]:not([horizontal])) .name,:host([kind="security-tile"][roomy]) .name{font-size:18px;line-height:26px;font-weight:400;margin-top:12px;color:var(--echo-design-text)}
:host([kind="entity"][roomy]:not([horizontal])) .label,:host([kind="security-tile"][roomy]) .label{font-size:17px;line-height:24px;margin-top:6px;color:var(--echo-design-secondary)}
`.replace(/(-?\d*\.?\d+)px/g, 'calc($1px * var(--echo-design-scale,1))')
  // JS resolves the transport size separately when calculating available width.
  .replace(/--echo-media-control-size:calc\((\d+)px \* var\(--echo-design-scale,1\)\)/g, '--echo-media-control-size:$1px');

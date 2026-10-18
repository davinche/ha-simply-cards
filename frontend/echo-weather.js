import { weatherImages } from './echo-weather-images.js';

// Names, icons and color families follow the supplied ATELIER v3.1 reference.
export const weatherConditions = {
  'clear-night': { label: 'Clear Night', icon: 'mdi:weather-night', tone: 'moon' },
  cloudy: { label: 'Cloudy', icon: 'mdi:weather-cloudy', tone: 'neutral' },
  fog: { label: 'Fog', icon: 'mdi:weather-fog', tone: 'neutral' },
  hail: { label: 'Hail', icon: 'mdi:weather-hail', tone: 'rain' },
  lightning: { label: 'Lightning', icon: 'mdi:weather-lightning', tone: 'amber' },
  'lightning-rainy': { label: 'Lightning Rainy', icon: 'mdi:weather-lightning-rainy', tone: 'rain' },
  partlycloudy: { label: 'Partly Cloudy', icon: 'mdi:weather-partly-cloudy', tone: 'amber' },
  pouring: { label: 'Pouring', icon: 'mdi:weather-pouring', tone: 'rain' },
  rainy: { label: 'Rainy', icon: 'mdi:weather-rainy', tone: 'rain' },
  snowy: { label: 'Snowy', icon: 'mdi:weather-snowy', tone: 'snow' },
  'snowy-rainy': { label: 'Snowy Rainy', icon: 'mdi:weather-snowy-rainy', tone: 'rain' },
  sunny: { label: 'Sunny', icon: 'mdi:weather-sunny', tone: 'amber' },
  windy: { label: 'Windy', icon: 'mdi:weather-windy', tone: 'neutral' },
  'windy-variant': { label: 'Windy', icon: 'mdi:weather-windy-variant', tone: 'neutral' },
  exceptional: { label: 'Exceptional', icon: 'mdi:alert-outline', tone: 'amber' },
  unknown: { label: 'Unknown', icon: 'mdi:help-circle-outline', tone: 'neutral' },
  unavailable: { label: 'Unavailable', icon: 'mdi:cloud-off-outline', tone: 'neutral' },
};
const tones = {
  neutral: ['#666D70', '#EFF1ED'], moon: ['#707779', '#F2BD69'],
  amber: ['#CD9544', '#F2BC66'], rain: ['#538FB7', '#94C1E4'], snow: ['#4B8EF0', '#93BFF4'],
};
export function weatherAppearance(state, dark) {
  const key = Object.hasOwn(weatherConditions, state) ? state : 'unknown';
  const condition = weatherConditions[key];
  return { ...condition, key, image: weatherImages[key], color: tones[condition.tone][dark ? 1 : 0] };
}

export const weatherImageStyle = `
:host([weather-image]){--echo-weather-primary:#203033;--echo-weather-secondary:#60696B;--echo-weather-panel:rgba(255,253,249,.95);--echo-weather-mid:rgba(255,253,249,.84);--echo-weather-edge:rgba(255,253,249,.08)}
:host([weather-image][echo-dark]){--echo-weather-primary:#F7F5EF;--echo-weather-secondary:#D1D0CA;--echo-weather-panel:rgba(20,24,25,.94);--echo-weather-mid:rgba(20,24,25,.82);--echo-weather-edge:rgba(20,24,25,.22)}
:host([weather-image]) ha-card{isolation:isolate;overflow:hidden}
.weather-photo,.weather-scrim{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.weather-photo{object-fit:cover;object-position:center;z-index:0}
.weather-scrim{z-index:1;background:linear-gradient(90deg,var(--echo-weather-panel) 0%,var(--echo-weather-mid) 42%,var(--echo-weather-edge) 100%)}
:host([weather-image]) .grid{position:relative;z-index:2}
:host([weather-image]) [data-field="condition"]{font-family:var(--echo-font-display,"Cormorant Garamond",Georgia,serif);font-weight:400;color:var(--echo-weather-primary)}
:host([weather-image]) [data-field="temperature"]{color:var(--echo-weather-primary)}
:host([weather-image]) [data-field="eyebrow"],:host([weather-image]) [data-field="humidity"]{color:var(--echo-weather-secondary)}
:host([weather-image]) ha-icon{color:var(--echo-weather-icon)}
:host([weather-fallback]) .img-cell{border-radius:50%;background:rgba(100,105,105,.09)}
:host([weather-fallback][weather-layout="stacked"]) .grid{grid-template-columns:76px minmax(0,1fr)}
:host([weather-fallback]) .img-cell{width:64px;height:64px}
:host([weather-fallback][echo-dark]) .img-cell{background:rgba(235,235,230,.12)}
`;

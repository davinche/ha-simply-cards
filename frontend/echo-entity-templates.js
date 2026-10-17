// Defaults are ordinary editable Home Assistant Jinja, not a separate renderer.
const context = "{% set state = states(entity) %}{% set domain = entity.split('.')[0] %}";
const inactive = "state in ['off', 'idle', 'standby', 'unknown', 'unavailable']";
const positive = "state in ['locked', 'closed', 'on', 'playing', 'home']";
export const entityAppearanceDefaults = {
  color: `${context}{{ '#8B93A0' if ${inactive} else '#C68B14' if domain == 'light' and state == 'on' else '#21926D' if ${positive} else '#C97445' }}`,
  background_color: `${context}{{ '#F0F2F5' if ${inactive} else '#FFF0CD' if domain == 'light' and state == 'on' else '#E4F5EC' if ${positive} else '#FDECE3' }}`,
  icon: `${context}{{ state_attr(entity, 'icon') or {'lock': 'mdi:lock-outline' if state == 'locked' else 'mdi:lock-open-outline', 'cover': 'mdi:garage' if state == 'closed' else 'mdi:garage-open', 'light': 'mdi:lightbulb', 'switch': 'mdi:power', 'fan': 'mdi:fan', 'sensor': 'mdi:eye', 'binary_sensor': 'mdi:checkbox-marked-circle-outline', 'climate': 'mdi:thermometer', 'media_player': 'mdi:music'}.get(domain, 'mdi:information-outline') }}`,
};
export function normalizeEntityAppearance(config) {
  const result = { ...config };
  for (const [key, source] of Object.entries(entityAppearanceDefaults)) {
    const value = result[key];
    if (typeof value !== 'string' || !value.trim() || key !== 'icon' && value === 'state') result[key] = source;
  }
  return result;
}

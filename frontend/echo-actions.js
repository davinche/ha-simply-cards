export const gestures = ['tap', 'hold', 'double_tap'];
export const actionNames = ['none', 'more-info', 'toggle', 'perform-action', 'navigate', 'url'];
export const usable = entity => entity && !['unknown', 'unavailable'].includes(entity.state);
const emit = (node, name, detail) => node.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
export const actionFor = (card, key) => card.config[key] ?? card.gestureDefaults?.[key] ?? { action: 'none' };
const controlsEntity = action => ['toggle', 'perform-action', 'call-service', 'cycle-hvac-mode'].includes(action.action);

// The element owns events; the caller supplies its action policy and keeps cleanup.
export function bindGestures(element, { configured, run }) {
  const active = gestures.some(configured);
  if (active) { element.setAttribute('role', 'button'); element.tabIndex = 0; }
  let holdTimer, tapTimer, start, held = false, moved = false;
  const clearHold = () => { clearTimeout(holdTimer); holdTimer = null; };
  element.addEventListener('pointerdown', event => {
    event.stopPropagation();
    if (event.button !== 0) return;
    clearHold(); held = false; moved = false; start = [event.clientX, event.clientY];
    if (configured('hold')) holdTimer = setTimeout(() => { held = true; clearTimeout(tapTimer); }, 500);
  });
  element.addEventListener('pointermove', event => {
    if (start && Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 10) { moved = true; clearHold(); }
  });
  element.addEventListener('pointerup', event => {
    event.stopPropagation(); clearHold(); start = null;
    if (held && !moved) run('hold');
  });
  for (const name of ['pointercancel', 'pointerleave']) element.addEventListener(name, () => { clearHold(); start = null; moved = true; });
  element.addEventListener('contextmenu', event => { if (configured('hold')) event.preventDefault(); });
  element.addEventListener('click', event => {
    event.stopPropagation();
    if (held || moved) { held = false; moved = false; return; }
    if (configured('double_tap')) {
      if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; run('double_tap'); }
      else tapTimer = setTimeout(() => { tapTimer = null; run('tap'); }, 300);
    } else run('tap');
  });
  element.addEventListener('keydown', event => {
    event.stopPropagation();
    if (!event.repeat && ['Enter', ' '].includes(event.key)) { event.preventDefault(); run('tap'); }
  });
  return () => { clearHold(); clearTimeout(tapTimer); tapTimer = null; start = null; held = moved = false; };
}

export function bindCardGestures(card, element, prefix = '') {
  const key = gesture => `${prefix}${gesture}_action`;
  card.cleanups.push(bindGestures(element, {
    configured: gesture => actionFor(card, key(gesture)).action !== 'none',
    run: gesture => runCardAction(card, key(gesture)),
  }));
}
export function cancelCardGestures(card) { for (const cleanup of card.cleanups || []) cleanup(); }

export function syncActionAccessibility(card, element, prefix = '') {
  const actions = gestures.map(gesture => actionFor(card, `${prefix}${gesture}_action`)).filter(action => action.action !== 'none');
  const disabled = !!card.preview || !!card.pending || !actions.length || actions.every(action => controlsEntity(action) && !usable(card.hass?.states[card.config.entity]));
  element.setAttribute('aria-disabled', String(disabled));
  element.setAttribute('aria-busy', String(!!card.pending));
  if (actionFor(card, `${prefix}tap_action`).action === 'toggle') element.setAttribute('aria-pressed', String(card.hass?.states[card.config.entity]?.state === 'on'));
  else element.removeAttribute('aria-pressed');
}

export async function runCardAction(card, key) {
  const action = actionFor(card, key);
  if (card.preview || action.action === 'none' || card.pending) return;
  const entity = card.hass?.states[card.config.entity];
  if (controlsEntity(action) && (!card.hass || !usable(entity))) return;
  const exempt = action.confirmation?.exemptions?.some(item => item.user === card.hass?.user?.id);
  if (action.confirmation && !exempt && !window.confirm(action.confirmation.text || 'Run this action?')) return;
  const owner = card.actionOwner || card;
  card.pending = true; owner.update();
  try {
    if (action.action === 'more-info') emit(card, 'hass-more-info', { entityId: action.entity || card.config.entity });
    else if (action.action === 'cycle-hvac-mode') {
      const supported = entity.attributes.hvac_modes || [];
      const modes = [...new Set(card.config.hvac_modes || supported)].filter(mode => supported.includes(mode));
      if (!modes.length) throw new Error('No supported HVAC modes selected');
      const nextMode = modes[(modes.indexOf(entity.state) + 1) % modes.length];
      if (nextMode !== entity.state) await card.hass.callService('climate', 'set_hvac_mode', { entity_id: card.config.entity, hvac_mode: nextMode });
    } else if (action.action === 'toggle') {
      const domain = card.config.entity.split('.')[0];
      const service = domain === 'lock' ? (entity.state === 'locked' ? 'unlock' : 'lock') : domain === 'cover' ? (entity.state === 'closed' ? 'open_cover' : 'close_cover') : 'toggle';
      await card.hass.callService(['lock', 'cover'].includes(domain) ? domain : 'homeassistant', service, { entity_id: card.config.entity });
    } else if (['perform-action', 'call-service'].includes(action.action)) {
      const [domain, service] = (action.perform_action || action.service || '').split('.');
      if (!domain || !service) throw new Error('Specify a domain.service action');
      await card.hass.callService(domain, service, action.data ?? action.service_data ?? {}, action.target);
    } else if (action.action === 'navigate') {
      const url = new URL(action.navigation_path, location.href);
      if (!action.navigation_path || url.origin !== location.origin) throw new Error('Navigation must stay within Home Assistant');
      history[action.navigation_replace ? 'replaceState' : 'pushState'](null, '', url.href);
      window.dispatchEvent(new Event('location-changed'));
    } else if (action.action === 'url') {
      const url = new URL(action.url_path, location.href);
      if (!action.url_path || !['http:', 'https:'].includes(url.protocol)) throw new Error('Specify an HTTP or HTTPS URL');
      window.open(url.href, '_blank', 'noopener,noreferrer');
    } else throw new Error(`Unsupported action: ${action.action}`);
  } catch (error) { emit(card, 'hass-notification', { message: error.message }); }
  finally { card.pending = false; owner.update(); }
}

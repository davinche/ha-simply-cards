export function stopTemplates(card) {
  card.templateRevision = (card.templateRevision || 0) + 1;
  for (const unsubscribe of card.templateSubscriptions || []) Promise.resolve().then(unsubscribe).catch(() => {});
  card.templateSubscriptions = [];
  card.templateValues = {};
  card.templateErrors = {};
  card.templateConnection = null;
  card.removeAttribute('template-error');
}

export function startTemplates(card, sources) {
  if (!card.isConnected || !card.config || !sources) return;
  const connection = card.hass?.connection;
  const unit = card.hass?.config?.unit_system?.temperature || '°F';
  if (!connection?.subscribeMessage) {
    if (card.templateConnection) stopTemplates(card);
    return;
  }
  if (connection === card.templateConnection && unit === card.templateUnit) return;
  stopTemplates(card);
  card.templateConnection = connection;
  card.templateUnit = unit;
  const revision = card.templateRevision;
  card.templateReady = Promise.all(Object.entries(sources).map(async ([slot, template]) => {
    if (typeof template !== 'string' || !/\{[{%#]/.test(template)) return;
    try {
      const unsubscribe = await connection.subscribeMessage(message => {
        if (revision !== card.templateRevision) return;
        if (message.error) {
          delete card.templateValues[slot];
          if (card.templateErrors[slot] !== String(message.error)) card.dispatchEvent(new CustomEvent('hass-notification', { detail: { message: `${card.kind} ${slot} template: ${message.error}` }, bubbles: true, composed: true }));
          card.templateErrors[slot] = String(message.error);
        } else {
          card.templateValues[slot] = String(message.result ?? '');
          delete card.templateErrors[slot];
        }
        card.toggleAttribute('template-error', Object.keys(card.templateErrors).length > 0);
        card.update();
      }, { type: 'render_template', template, variables: { config: card.config, entity: card.config.entity || null, temperature_unit: unit, template_slot: slot }, strict: true, report_errors: true });
      if (revision !== card.templateRevision) await unsubscribe();
      else card.templateSubscriptions.push(unsubscribe);
    } catch (error) {
      if (revision !== card.templateRevision) return;
      card.templateErrors[slot] = error.message;
      card.setAttribute('template-error', '');
      card.update();
    }
  }));
}

export function templateValue(card, source, slot) {
  if (!/\{[{%#]/.test(source)) return source;
  return card.templateErrors?.[slot] ? '—' : card.templateValues?.[slot] ?? '…';
}

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.ECHO_BROWSER_PATH ? {executablePath:process.env.ECHO_BROWSER_PATH} : {})});
  try {
    const page = await browser.newPage({viewport:{width:1120,height:900}});
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    page.setDefaultTimeout(10000);
    await page.route('http://preview/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      const filename = process.argv.includes('--bundle') && pathname === '/frontend/echo-cards.js'
        ? path.join(root, 'dist/ha-simply-cards.js') : path.resolve(root, '.' + pathname);
      if (!filename.startsWith(root + path.sep)) return route.fulfill({status:403,body:''});
      await route.fulfill({path:filename,contentType:filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.json') ? 'application/json' : 'text/html'});
    });
    await page.goto('http://preview/tests/preview.html?mode=comparison');
    await page.waitForFunction(() => window.ready);
    await page.evaluate(() => document.fonts.ready);
    assert.deepEqual(errors, []);
    await page.screenshot({path:path.join(root,'tests/theme-comparison.png'),fullPage:true});
    const result = await page.evaluate(async () => {
      const cards = [...document.querySelectorAll('section[data-dark="true"] echo-header-card, section[data-dark="true"] echo-toggle-card, section[data-dark="true"] echo-entity-card, section[data-dark="true"] echo-container-card')];
      for (const card of cards) {
        const shell = card.shadowRoot.querySelector('ha-card');
        const before = getComputedStyle(shell).background;
        card.hass = {...mockHass,themes:{darkMode:false},selectedTheme:{dark:true}};
        const light = getComputedStyle(shell).background;
        if (before === light) throw new Error('Mode did not change '+card.localName);
        card.hass = {...mockHass,themes:{darkMode:true},selectedTheme:{dark:false}};
        if (getComputedStyle(shell).background !== before || card.shadowRoot.querySelector('ha-card') !== shell) throw new Error('Mode switch rebuilt or failed to restore card');
      }
      const entity = document.querySelector('section[data-dark="true"] echo-entity-card');
      const icon = entity.shadowRoot.querySelector('ha-icon');
      if (getComputedStyle(icon).color !== 'rgb(121, 215, 174)') throw new Error('Built-in entity state color did not adapt');
      for (const [state, expected] of [['unlocked','rgb(245, 177, 138)'],['unavailable','rgb(176, 186, 200)'],['locked','rgb(121, 215, 174)']]) {
        patchState(entity.config.entity,state);
        entity.hass = {...mockHass,themes:{darkMode:true}};
        if (getComputedStyle(icon).color !== expected) throw new Error('Wrong dark state color: '+state);
      }
      entity.hass = mockHass;
      if (entity.hasAttribute('echo-dark') || getComputedStyle(icon).color !== 'rgb(33, 146, 109)') throw new Error('Missing theme data must fall back to light');
      entity.hass = {...mockHass,themes:{darkMode:true}};
      entity.setConfig({...entity.config,color:'#21926D',background_color:'#E4F5EC'});
      if (getComputedStyle(entity.shadowRoot.querySelector('ha-icon')).color !== 'rgb(33, 146, 109)') throw new Error('Custom color changed');
      if (getComputedStyle(entity.shadowRoot.querySelector('.img-cell')).backgroundColor !== 'rgb(228, 245, 236)') throw new Error('Custom background changed');
      const container = document.querySelector('section[data-dark="true"] echo-container-card');
      container.hass = {...mockHass,themes:{darkMode:true}};
      if (!container.childrenCards.every(card => card.hasAttribute('echo-dark'))) throw new Error('Nested theme propagation failed');
      return cards.length;
    });
    assert.ok(result >= 4);
    console.log('Theme: live light/dark switching, effective HA mode, stable DOM, default state colors, custom colors, nested propagation; comparison screenshot saved.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});

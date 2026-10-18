const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch({headless:true,...(process.env.ECHO_BROWSER_PATH ? {executablePath:process.env.ECHO_BROWSER_PATH} : {})});
  try {
    const page = await browser.newPage({viewport:{width:960,height:480}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('http://preview/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      const filename = process.argv.includes('--bundle') && pathname === '/frontend/echo-cards.js'
        ? path.join(root,'dist/ha-simply-cards.js') : path.resolve(root,'.'+pathname);
      if (!filename.startsWith(root+path.sep) || !fs.existsSync(filename)) return route.fulfill({status:404,body:''});
      await route.fulfill({path:filename,contentType:filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.svg') ? 'image/svg+xml' : 'text/html'});
    });
    for (const theme of ['dark','light']) {
      await page.goto(`http://preview/tests/luxury-preview.html?theme=${theme}`);
      await page.waitForFunction(() => window.ready);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.querySelectorAll('echo-image-button-card')].map(card => card.photo.decode()));
      });
      await page.screenshot({path:path.join(root,`tests/luxury-${theme}-960x480.png`)});
      assert.deepEqual(await page.evaluate(() => ({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight})),{width:960,height:480});
    }
    await page.evaluate(() => {
      const image = document.querySelector('echo-image-button-card');
      window.imageTest = image;
      window.imageCalls = []; window.imageInfos = [];
      image.preview = false;
      image.hass = {...image.hass,states:{'scene.relax':{state:'on',attributes:{}}},callService:async(...args)=>imageCalls.push(args)};
      image.addEventListener('hass-more-info',event=>imageInfos.push(event.detail.entityId));
      image.setConfig({entity:'scene.relax',heading:'<b>Relax</b>',subheading:'Cozy',image:'javascript:alert(1)',
        tap_action:{action:'perform-action',perform_action:'scene.turn_on',target:{entity_id:'scene.relax'}},
        hold_action:{action:'more-info'},icon_tap_action:{action:'more-info'}});
      if (!image.photo.hidden || image.photo.hasAttribute('src')) throw new Error('Unsafe image accepted');
      if (image.heading.children.length || image.heading.textContent!=='<b>Relax</b>') throw new Error('Unsafe heading');
      const row = document.querySelector('echo-entity-card');
      const box = node => node.getBoundingClientRect();
      if (!(box(row.iconCell).right < box(row.nameElement).left && box(row.nameElement).bottom <= box(row.stateElement).top)) throw new Error('Horizontal layout overlaps');
      row.setConfig({...row.config,layout:undefined,vertical:false});
      if (!row.hasAttribute('horizontal')) throw new Error('Legacy horizontal option broken');
      const editor = image.constructor.getConfigElement();
      editor.setConfig({...image.config,type:'custom:echo-image-button-card',future_key:'keep',grid_options:{rows:2}});
      document.body.append(editor);
      let saved;
      editor.addEventListener('config-changed',event=>saved=event.detail.config);
      editor.form.submitPatch({heading:'Updated'});
      if (saved.heading!=='Updated' || saved.future_key!=='keep' || saved.grid_options.rows!==2 || saved.icon_tap_action.action!=='more-info') throw new Error('Image editor lost config');
      editor.remove();
    });
    const image = page.locator('echo-image-button-card').first();
    await image.locator('.name').click();
    assert.equal(await page.evaluate(() => imageCalls.length),1);
    assert.deepEqual(await page.evaluate(() => imageCalls[0]),['scene','turn_on',{}, {entity_id:'scene.relax'}]);
    await image.locator('.img-cell').click();
    assert.deepEqual(await page.evaluate(() => [imageCalls.length,imageInfos]),[1,['scene.relax']]);
    await image.locator('ha-card').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => imageCalls.length),2);
    const name = image.locator('.name');
    await name.hover(); await page.mouse.down(); await page.waitForTimeout(550); await page.mouse.up();
    assert.deepEqual(await page.evaluate(() => [imageCalls.length,imageInfos.length]),[2,2]);
    await page.evaluate(() => imageTest.setConfig({...imageTest.config,double_tap_action:{action:'more-info'}}));
    await name.dblclick(); await page.waitForTimeout(350);
    assert.deepEqual(await page.evaluate(() => [imageCalls.length,imageInfos.length]),[2,3]);
    await page.evaluate(() => {imageTest.preview=true;});
    await name.click(); await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => imageCalls.length),2);
    await page.evaluate(() => {
      const image=imageTest;
      image.hass={...image.hass,themes:{darkMode:true}};
      if(!image.hasAttribute('echo-dark')) throw new Error('Image theme did not update');
      image.setConfig({...image.config,image:'./room-illustration.svg',selected:true});
      if(!image.hasAttribute('selected') || image.photo.hidden) throw new Error('Selection or image reconfiguration failed');
      if (!document.fonts.check('500 17px Inter') || !document.fonts.check('400 36px "Cormorant Garamond"')) throw new Error('Bundled fonts did not load');
    });
    await page.evaluate(() => {
      imageTest.preview=false;
      imageTest.setConfig({heading:'Scene without entity',tap_action:{action:'perform-action',perform_action:'scene.turn_on',target:{entity_id:'scene.relax'}}});
      if (imageTest.shell.getAttribute('aria-disabled')!=='false' || getComputedStyle(imageTest.shell).backgroundColor!=='rgb(47, 53, 48)') throw new Error('Entityless action or dark image fallback broken');
    });
    await name.click();
    assert.equal(await page.evaluate(() => imageCalls.length),3);
    await page.evaluate(() => {
      imageTest.hass={...imageTest.hass,states:{'scene.relax':{state:'unknown',attributes:{}}}};
      imageTest.setConfig({...imageTest.config,entity:'scene.relax'});
    });
    await name.click();
    assert.equal(await page.evaluate(() => imageCalls.length),4);
    assert.deepEqual(errors,[]);
    console.log('Luxury: Echo Show light/dark previews; Image Button scene actions, icon isolation, keyboard, hold, double tap, preview, URL safety, editor round trip; horizontal entity layout and offline fonts.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });

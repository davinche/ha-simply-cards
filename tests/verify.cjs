const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.ECHO_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const bundleMode = process.argv.includes('--bundle');
const results = [];
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const filename = path.resolve(root, '.' + pathname);
  if (!filename.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  fs.readFile(filename, (error, content) => {
    if (error) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.json') ? 'application/json' : 'text/html');
    response.end(content);
  });
});

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const launchOptions = {headless:true,...(process.env.ECHO_BROWSER_PATH ? {executablePath:process.env.ECHO_BROWSER_PATH} : {})};
  const browser = process.env.ECHO_BROWSER_PROFILE
    ? await chromium.launchPersistentContext(process.env.ECHO_BROWSER_PROFILE,launchOptions)
    : await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    await page.route('**/*', async route => {
      const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
      const filename = bundleMode && pathname === '/frontend/echo-cards.js' ? path.join(root,'dist/ha-simply-cards.js') : path.resolve(root, '.' + pathname);
      if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename)) return route.fulfill({status:404,body:''});
      await route.fulfill({path:filename,contentType:filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.json') ? 'application/json' : 'text/html'});
    });
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error('Page error:',error.stack); });
    async function open(view, width, height, mode = 'legacy') {
      await page.setViewportSize({width,height});
      await page.goto(`http://127.0.0.1:${server.address().port}/tests/preview.html?view=${view}&mode=${mode}`);
      await page.waitForFunction(() => window.ready);
    }
    await open(0,1280,800);
    const main = page.locator('echo-toggle-card').first().locator('ha-card');
    await main.click();
    assert.deepEqual(await page.evaluate(() => calls.pop()), {domain:'homeassistant',service:'toggle',data:{entity_id:'switch.demo_12'}});
    await main.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => calls.pop().service),'toggle');
    const box = await main.boundingBox();
    await page.mouse.move(box.x+20,box.y+20);
    await page.mouse.down();
    await page.waitForTimeout(600);
    await page.mouse.up();
    assert.equal(await page.evaluate(() => infos.pop()),'switch.demo_12');
    assert.equal(await page.evaluate(() => calls.length),0);
    results.push('Light toggle, keyboard activation, and hold without accidental toggle');
    await page.evaluate(() => patchState('switch.demo_12','unavailable'));
    await main.dispatchEvent('click');
    assert.equal(await page.evaluate(() => calls.length),0);
    await page.evaluate(() => { patchState('switch.demo_12','on'); window.rejectService = true; });
    await main.click();
    assert.equal(await page.evaluate(() => notifications.pop()),'Simulated service failure');
    await page.evaluate(() => { window.rejectService = false; calls.length = 0; });
    results.push('Unavailable actions suppressed; rejected service surfaces a notification');
    for (const [mode,action,expected] of [['cool','idle','rgb(52, 120, 246)'],['cool','cooling','rgb(52, 120, 246)'],['heat','cooling','rgb(238, 119, 59)'],['off','idle','rgb(238, 119, 59)']]) {
      await page.evaluate(([mode,action]) => patchState('climate.demo_1',mode,{hvac_action:action}),[mode,action]);
      assert.equal(await page.locator('echo-climate-card ha-icon').evaluate(element => getComputedStyle(element).color),expected);
    }
    await page.locator('echo-climate-card ha-card').click();
    assert.equal(await page.evaluate(() => infos.pop()),'climate.demo_1');
    await page.locator('echo-security-card echo-security-tile-card').first().locator('ha-card').click();
    assert.equal(await page.evaluate(() => infos.pop()),'lock.demo_9');
    assert.equal(await page.evaluate(() => calls.length),0);
    await page.locator('echo-weather-card ha-card').click();
    assert.equal(await page.evaluate(() => infos.pop()),'weather.demo_13');
    results.push('Thermostat color follows cool mode regardless of hvac_action; dialogs target exact entities');
    for (const view of [0,1]) {
      await open(view,view ? 960 : 1280,view ? 480 : 800);
      for (const toggle of await page.locator('echo-toggle-card[kind="toggle"]').all()) {
        const entityId = await toggle.evaluate(element => element.config.entity);
        await toggle.locator('ha-card').click();
        assert.deepEqual(await page.evaluate(() => calls.pop()),{domain:'homeassistant',service:'toggle',data:{entity_id:entityId}});
      }
      const id = view ? 'media_player.demo_10' : 'media_player.demo_11';
      const controls = page.locator('echo-media-card echo-media-action-card');
      for (const [index,service] of ['media_previous_track','media_play_pause','media_next_track','volume_mute'].entries()) {
        await controls.nth(index).locator('ha-card').click();
        const call = await page.evaluate(() => calls.pop());
        assert.equal(call.service,service);
        assert.equal(call.data.entity_id,id);
        if (service === 'volume_mute') assert.equal(call.data.is_volume_muted,true);
      }
      assert.equal(await page.evaluate(() => infos.length),0);
      await page.evaluate(id => patchState(id,'paused',{is_volume_muted:true,media_title:'<img src=x onerror=alert(1)>'}),id);
      assert.equal(await controls.nth(1).locator('ha-icon').getAttribute('icon'),'mdi:play');
      assert.equal(await controls.nth(3).locator('ha-icon').getAttribute('icon'),'mdi:volume-off');
      await controls.nth(3).locator('ha-card').click();
      assert.equal(await page.evaluate(() => calls.pop().data.is_volume_muted),false);
      assert.equal(await page.locator('echo-media-card .info img').count(),0);
      assert.match(await page.locator('echo-media-card .info').innerText(),/<img/);
    }
    results.push('Both media players: previous, play/pause, next, mute/unmute, reactive icons, escaped metadata, no parent action');
    const fanId = 'fan.demo_3';
    await page.locator('echo-fan-power-card ha-card').click();
    assert.deepEqual(await page.evaluate(() => calls.pop()),{domain:'homeassistant',service:'toggle',data:{entity_id:fanId}});
    const range = page.locator('echo-toggle-card[kind="fan"] input');
    assert.equal(await range.getAttribute('max'),'4');
    await range.evaluate(element => { element.value='3'; element.dispatchEvent(new Event('input',{bubbles:true})); });
    await page.evaluate(id => patchState(id,'on',{percentage:25}),fanId);
    assert.equal(await range.inputValue(),'3');
    assert.equal(await page.locator('echo-toggle-card[kind="fan"] output').innerText(),'75%');
    await range.dispatchEvent('change');
    assert.deepEqual(await page.evaluate(() => calls.pop()),{domain:'fan',service:'set_percentage',data:{entity_id:fanId,percentage:75}});
    await range.evaluate(element => {element.value='0';element.dispatchEvent(new Event('change',{bubbles:true}));});
    assert.equal(await page.evaluate(() => calls.pop().data.percentage),0);
    await page.evaluate(id => patchState(id,'unavailable'),fanId);
    assert.equal(await range.isDisabled(),true);
    await page.evaluate(id => patchState(id,'off',{percentage:80,percentage_step:null}),fanId);
    assert.equal(await range.inputValue(),'0');
    assert.equal(await range.getAttribute('max'),'100');
    results.push('Fan step mapping, off/zero, unavailable, fallback step, and slider survives state updates while editing');
    await page.evaluate(async () => {
      const {fanValues,fanPercentage} = await import('../frontend/echo-cards.js');
      for (const step of [1,25,33.333,50,100,0,-1,Infinity,null]) {
        const values = fanValues({state:'on',attributes:{percentage:200,percentage_step:step}});
        if (values.percentage !== 100 || values.steps < 1 || values.steps > 100 || fanPercentage(values.steps,values.steps) !== 100) throw new Error('Fan bounds failed');
      }
      const header = document.querySelector('echo-header-card');
      const subscriptions = [...header.templateSubscriptions];
      header.remove();
      await Promise.resolve();await Promise.resolve();
      if (header.templateSubscriptions.length) throw new Error('Header subscriptions not cleaned up');
      document.querySelector('#dashboard').append(header);
      await header.templateReady;
      if (!subscriptions.length || !header.templateSubscriptions.length || header.clock) throw new Error('Header template lifecycle failed');
    });
    results.push('Fan bounds and backend-driven header template disconnect/reconnect lifecycle; no browser clock rendering');
    for (const [view,width,height] of [[0,1280,800],[1,960,480],[1,800,480],[1,640,360]]) {
      await open(view,width,height);
      const geometry = await page.evaluate(() => {
        const outside = [];
        function visit(root) {
          for (const element of root.querySelectorAll('*')) {
            if (element.shadowRoot) visit(element.shadowRoot);
            if (element.matches('ha-card,.grid') && element.getBoundingClientRect().width > 0) {
              const box = element.getBoundingClientRect();
              if (box.left < -1 || box.top < -1 || box.right > innerWidth+1 || box.bottom > innerHeight+1) outside.push(element.tagName);
            }
          }
        }
        visit(document);
        return {outside,overflow:document.documentElement.scrollWidth>innerWidth};
      });
      assert.deepEqual(geometry,{outside:[],overflow:false},`${width}x${height}`);
      await page.screenshot({path:path.join(__dirname,`preview-${view ? 'guest' : 'kitchen'}-${width}x${height}.png`)});
    }
    assert.deepEqual(errors,[]);
    results.push('Browser layout bounds: Kitchen 1280×800; Guest 960×480, 800×480, 640×360; no page errors');
    for (const mode of ['native-sections','native-grid']) {
      for (const [view,width,height] of [[0,1280,800],[1,960,480],[1,800,480],[1,800,400],[0,390,844],[1,390,844]]) {
        await open(view,width,height,mode);
        await page.waitForFunction(() => topCards.every(card => card.getAttribute('width')));
        const sizing = await page.evaluate(() => {
          const problems = [];
          for (const card of topCards) {
            const options = card.getGridOptions();
            if (!options.rows || !options.min_rows || !options.columns || !options.min_columns || card.getCardSize() < 1) problems.push('Missing sizing contract');
            const bounds = card.shell.getBoundingClientRect();
            if (bounds.height < options.min_rows*64-9 || bounds.width < 90) problems.push(`${card.kind} collapsed`);
            if (bounds.right > innerWidth+1) problems.push(`${card.kind} outside viewport`);
            for (const child of card.childrenCards) {
              const box = child.shell.getBoundingClientRect();
              if (box.right > bounds.right+1 || box.bottom > bounds.bottom+1 || box.left < bounds.left-1) problems.push(`${card.kind}/${child.kind} clipped`);
            }
            if (card.range) {
              const box = card.range.getBoundingClientRect();
              if (box.bottom > bounds.bottom+1 || box.right > bounds.right+1) problems.push('Fan slider clipped');
            }
          }
          if (document.documentElement.scrollWidth > innerWidth) problems.push('Horizontal overflow');
          if (new URLSearchParams(location.search).get('mode') === 'native-sections' && new URLSearchParams(location.search).get('view') === '1' && innerWidth >= 720 && document.documentElement.scrollHeight > innerHeight) problems.push('Guest Sections view needs vertical scrolling');
          return problems;
        });
        assert.deepEqual(sizing,[],`${mode} ${view} ${width}x${height}`);
        const toggle = page.locator('echo-toggle-card').first();
        const entityId = await toggle.evaluate(card => card.config.entity);
        await toggle.locator('ha-card').click();
        assert.deepEqual(await page.evaluate(() => calls.pop()),{domain:'homeassistant',service:'toggle',data:{entity_id:entityId}});
        await page.screenshot({path:path.join(__dirname,`preview-${mode}-${view ? 'guest' : 'kitchen'}-${width}x${height}.png`),fullPage:true});
      }
    }
    for (const view of [0,1]) {
      await open(view,1280,800,'native-sections');
      await page.evaluate(async () => {
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,320px);gap:8px';
        document.body.append(grid);
        const clones = topCards.map(original => {
          const card = document.createElement(original.localName);
          const config = {...original.config};
          delete config.height;
          delete config.grid_options;
          delete config.sizing;
          card.setConfig(config);
          card.hass = mockHass;
          grid.append(card);
          return card;
        });
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        for (const card of clones) {
          if ('sizing' in card.config || card.shell.getBoundingClientRect().height < card.getGridOptions().rows*64-9) throw new Error(`${card.kind} missing default native height`);
          const bounds = card.shell.getBoundingClientRect();
          for (const child of card.childrenCards) {
            const box = child.shell.getBoundingClientRect();
            if (box.right > bounds.right+1 || box.bottom > bounds.bottom+1) throw new Error(`${card.kind} default controls clipped`);
          }
        }
        grid.remove();
      });
    }
    await page.evaluate(() => {
      const card = topCards[0];
      const original = card.getGridOptions();
      original.rows = 999;
      if (card.getGridOptions().rows === 999) throw new Error('Shared grid options mutated');
      card.layout = 'grid';
      const wrapper = document.createElement('div');
      wrapper.style.width = '400px';
      wrapper.style.height = '248px';
      document.body.append(wrapper);
      wrapper.append(card);
      if (Math.abs(card.shell.getBoundingClientRect().height-248)>1) throw new Error('Sections height not filled');
      card.layout = undefined;
      card.remove();
      if (card.resizeObserver !== null) throw new Error('Sizing observer leaked');
      wrapper.append(card);
      if (!card.resizeObserver) throw new Error('Sizing observer did not restart');
    });
    assert.deepEqual(errors,[]);
    results.push('Native Grid/Sections contracts, default standalone heights, allocated height, lifecycle and controls in 12 mock layouts; Guest fits at 800×400 using grid_options only');
    for (const view of [0,1]) {
      await open(view,1280,800,'native-sections');
      await page.evaluate(async () => {
        const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        for (const card of [...topCards]) {
          const wrapper = document.createElement('div');
          document.body.append(wrapper);
          wrapper.append(card);
          const input = card.range;
          for (const [width,rows] of [[320,card.getGridOptions().min_rows],[600,card.getGridOptions().rows],[320,card.getGridOptions().rows],[600,card.getGridOptions().min_rows]]) {
            wrapper.style.width = width+'px';
            wrapper.style.height = (rows*64-8)+'px';
            await frame();
            const bounds = card.shell.getBoundingClientRect();
            if (Math.abs(bounds.height-(rows*64-8))>1) throw new Error(`${card.kind}: native height overridden`);
            for (const element of [...card.grid.children,...card.childrenCards.map(child=>child.shell),...(card.range ? [card.range] : [])]) {
              const box = element.getBoundingClientRect();
              if (box.right>bounds.right+1 || box.left<bounds.left-1 || box.bottom>bounds.bottom+1 || box.top<bounds.top-1) throw new Error(`${card.kind}: ${element.dataset.field || element.className} (${element.textContent}) outside ${width}×${rows*64-8}: ${JSON.stringify(box)} vs ${JSON.stringify(bounds)}`);
            }
            if (input && card.range!==input) throw new Error('Resizing replaced the fan slider');
          }
          wrapper.remove();
          const editor = card.constructor.getConfigElement();
          editor.hass = mockHass;
          const original = {...card.config,grid_options:{columns:12,rows:3},visibility:[{condition:'user',users:['test']}],future_option:{keep:true}};
          editor.setConfig(original);
          document.body.append(editor);
          let emitted;
          editor.addEventListener('config-changed',event=>{emitted=event.detail.config;});
          const field = editor.shadowRoot.querySelector('input[data-key="room"],input[data-key="name"],input[data-key="items.0.name"],input[data-key="entity"]');
          if (field) {
            field.value = field.dataset.key==='entity' ? card.config.entity : 'Updated label';
            field.dispatchEvent(new Event('change',{bubbles:true}));
          } else editor.templateForm.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...editor.templateForm.data,title:'Updated label'}}}));
          if (!emitted || JSON.stringify(emitted.grid_options)!==JSON.stringify(original.grid_options) || JSON.stringify(emitted.visibility)!==JSON.stringify(original.visibility) || !emitted.future_option.keep) throw new Error(`${card.kind}: editor lost configuration`);
          if (original.items && original.items[0].name==='Updated label') throw new Error('Editor mutated input items');
          const entityFields = editor.shadowRoot.querySelectorAll('input[list]');
          if (card.kind!=='header' && !entityFields.length) throw new Error('Missing visual entity field');
          const stub = card.constructor.getStubConfig(mockHass,Object.keys(mockHass.states),[]);
          if ('profile' in stub || editor.shadowRoot.querySelector('[data-key="profile"]')) throw new Error('Profiles leaked into new configuration');
          if (editor.shadowRoot.querySelector('[data-key="sizing"],[data-key="height"]')) throw new Error('Layout-specific settings remain in editor');
          editor.remove();
        }
      });
    }
    assert.deepEqual(errors,[]);
    results.push('Shared cards resize through minimum/default heights and narrow/wide widths; all seven visual editors preserve layout, visibility and unknown configuration; picker stubs contain no profiles');
    for (const [width,height] of [[960,480],[800,400]]) {
      await open(1,width,height,'echo5-fit');
      await page.waitForFunction(()=>topCards.every(card=>card.getAttribute('height')));
      const measured = await page.evaluate(()=>({cards:topCards.map(card=>{
        const box=card.shell.getBoundingClientRect();
        return {x:box.x,y:box.y,width:box.width,height:box.height,bottom:box.bottom};
      }),horizontal:document.documentElement.scrollWidth>innerWidth,vertical:document.documentElement.scrollHeight>innerHeight}));
      const unit=width/960;
      for (const [index,expectedY,expectedHeight] of [[0,16,96],[1,16,96],[2,124,140],[3,124,140],[4,124,140],[5,276,188],[6,276,188]]) {
        assert.ok(Math.abs(measured.cards[index].y/unit-expectedY)<0.1,`Echo fit card ${index} top`);
        assert.ok(Math.abs(measured.cards[index].height/unit-expectedHeight)<0.1,`Echo fit card ${index} height`);
      }
      assert.ok(Math.abs(measured.cards[0].x/unit-16)<0.1);
      assert.ok(Math.abs(measured.cards[6].bottom/unit-464)<0.1);
      assert.equal(measured.horizontal,false);
      assert.equal(measured.vertical,false);
      await page.screenshot({path:path.join(__dirname,`preview-echo5-fit-${width}x${height}.png`)});
    }
    results.push('Screenshot-derived native theme: header96/lights140/bottom188, top16/gaps12/bottom16 at 960×480; same normalized rectangles at 800×400; no viewport overflow');
    for (const [width,height] of [[1280,900],[390,844]]) {
      await open(0,width,height,'reference');
      await page.waitForFunction(()=>topCards.length===9 && topCards.every(card=>card.shell));
      await page.evaluate(async () => {
        const kinds = new Set(topCards.map(card=>card.kind));
        if (kinds.size!==8) throw new Error('Reference is missing a card type');
        for (const card of topCards) {
          if ('profile' in card.config) throw new Error('Reference still uses a profile');
          const original = {...card.config};
          card.setConfig({...original,profile:'an-old-room'});
          card.hass = mockHass;
          if (card.ready) await card.ready;
          if ('profile' in card.config) throw new Error('Legacy profile not ignored');
          const editor = card.constructor.getConfigElement();
          editor.setConfig({...original,profile:'guest'});
          editor.hass = mockHass;
          if ('profile' in editor.config || editor.shadowRoot.querySelector('[data-key="profile"]')) throw new Error('Editor still exposes profile');
          const bounds=card.shell.getBoundingClientRect();
          for (const child of card.childrenCards) {
            const box=child.shell.getBoundingClientRect();
            if (box.right>bounds.right+1 || box.bottom>bounds.bottom+1) throw new Error(`${card.kind} reference controls clipped`);
          }
        }
        const header=topCards.find(card=>card.kind==='header');
        const legacy={...header.config};delete legacy.name;delete legacy.templates;legacy.room='Legacy title';
        header.setConfig(legacy);
        if (header.fields.room.textContent!=='Legacy title') throw new Error('Legacy header title lost');
        header.setConfig({...legacy,name:'Card Reference'});
        if (document.documentElement.scrollWidth>innerWidth) throw new Error('Reference horizontal overflow');
      });
      await page.screenshot({path:path.join(__dirname,`preview-reference-${width}x${height}.png`),fullPage:true});
    }
    assert.deepEqual(errors,[]);
    results.push('Reference renders nine examples of seven public card types, including unified Control with optional fan slider and both thermostat variants');
    await page.evaluate(async () => {
      const base={type:'custom:echo-entity-card',entity:'switch.demo_12',grid_options:{columns:6,rows:2},visibility:[{condition:'user',users:['test']}],future_key:'keep'};
      const card=document.createElement('echo-entity-card');
      document.body.append(card);card.setConfig(base);card.hass=mockHass;card.layout='grid';await card.ready;
      for (const key of ['tap_action','hold_action','double_tap_action','icon_tap_action','icon_hold_action','icon_double_tap_action']) {
        const before=calls.length+infos.length;
        await card.runAction(key);
        if (calls.length+infos.length!==before) throw new Error('Entity has an implicit action');
      }
      const configured={...base,name:'Generic entity',color:'#3478F6',vertical:true,hide_state:true,state_content:['state','brightness'],show_entity_picture:true,tap_action:{action:'toggle'},hold_action:{action:'perform-action',perform_action:'light.turn_on',target:{entity_id:'light.demo_7'},data:{brightness_pct:50},confirmation:{text:'Run configured action?'}},double_tap_action:{action:'navigate',navigation_path:'/dashboard-test'},icon_tap_action:{action:'more-info'},icon_hold_action:{action:'url',url_path:'https://example.com'},icon_double_tap_action:{action:'none'}};
      card.setConfig(configured);await card.ready;
      if (card.nativeCard || card.shadowRoot.querySelector('hui-tile-card,hui-grid-card')) throw new Error('Entity still uses native rendering');
      if (!card.stateElement.hidden || getComputedStyle(card.icon).color!=='rgb(52, 120, 246)') throw new Error('Entity display options ignored');
      const editor=card.constructor.getConfigElement();editor.setConfig(configured);editor.hass=mockHass;await editor.ready;
      if (!editor.form || editor.form.schema.filter(field=>field.selector?.ui_action).length!==6) throw new Error('Missing visual action fields');
      let emitted;
      editor.addEventListener('config-changed',event=>{emitted=event.detail.config;});
      const next={...editor.form.data,name:'Changed in visual editor',tap_action:{action:'none'}};
      delete next.icon;
      editor.form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:next},bubbles:true,composed:true}));
      if (emitted.type!=='custom:echo-entity-card' || emitted.name!=='Changed in visual editor' || emitted.grid_options.rows!==2 || emitted.future_key!=='keep' || emitted.visibility[0].users[0]!=='test') throw new Error('Visual editor round trip lost config');
      const sameForm=editor.form;editor.setConfig(emitted);
      if (editor.form!==sameForm) throw new Error('Editing replaced form and lost input focus');
      const container=document.createElement('echo-container-card');document.body.append(container);
      for (const count of [0,1,2,4,7]) {
        container.setConfig({type:'custom:echo-container-card',columns:2,cards:Array.from({length:count},()=>({type:'custom:echo-entity-card',entity:'weather.demo_13'}))});
        container.hass=mockHass;await container.ready;
        if (container.childrenCards.length!==count || container.shadowRoot.querySelector('hui-grid-card')) throw new Error('Container child limit or native rendering');
      }
      const containerEditor=container.constructor.getConfigElement();containerEditor.setConfig(container.config);await containerEditor.ready;
      if (containerEditor.childEditors.length!==8) throw new Error('Container missing child editors and picker');
      containerEditor.shadowRoot.querySelector('button').click();
      if (containerEditor.config.cards.length!==6) throw new Error('Remove child failed');
      const add=[...containerEditor.shadowRoot.querySelectorAll('button')].find(button=>button.textContent==='Add entity');
      containerEditor.hass=mockHass;add.click();
      if (containerEditor.config.cards.length!==7) throw new Error('Add child failed');
      const picker=containerEditor.childEditors.at(-1);
      picker.cardPicked({type:'tile',entity:'weather.demo_13'});
      if (containerEditor.config.cards.length!==8) throw new Error('Picker callback failed');
      if (window.customCards.some(item=>item.type==='echo-security-card')) throw new Error('Old semantic group still in picker');
      card.remove();container.remove();
    });
    assert.deepEqual(errors,[]);
    results.push('Entity/Container own rendering, no implicit actions, visual form round trips and arbitrary child counts 0/1/2/4/7; add/remove child editing verified');
    await page.evaluate(async () => {
      const items=[{entity:'lock.demo_9',name:'Front Door'},{entity:'lock.demo_8',name:'Back Door'},{entity:'cover.demo_2',name:'Garage',icon:'mdi:garage'}];
      const rect=(element,parent) => {
        const box=element.getBoundingClientRect(), origin=parent.getBoundingClientRect();
        return [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value=>Math.round(value*100)/100);
      };
      const compare=(oldElement,newElement,oldParent,newParent,label) => {
        if (JSON.stringify(rect(oldElement,oldParent))!==JSON.stringify(rect(newElement,newParent))) throw new Error(`${label}: geometry changed ${JSON.stringify(rect(oldElement,oldParent))} / ${JSON.stringify(rect(newElement,newParent))}`);
        const oldStyle=getComputedStyle(oldElement),newStyle=getComputedStyle(newElement);
        for (const key of ['backgroundColor','color','borderRadius','fontSize','fontWeight','padding','boxShadow']) {
          if (oldStyle[key]!==newStyle[key]) throw new Error(`${label}: ${key} changed from ${oldStyle[key]} to ${newStyle[key]}`);
        }
      };
      for (const [width,height] of [[600,260],[400,210],[600,210]]) {
        const wrappers=[0,1].map(index=>{
          const element=document.createElement('div');
          element.style.cssText=`position:absolute;left:${index*(width+20)}px;top:20px;width:${width}px;height:${height}px`;
          document.body.append(element);return element;
        });
        const oldCard=document.createElement('echo-security-card');
        oldCard.setConfig({items,sizing:'fixed'});oldCard.hass=mockHass;wrappers[0].append(oldCard);
        const newCard=document.createElement('echo-container-card');
        newCard.setConfig({title:'Security',icon:'mdi:shield-home-outline',sizing:'fixed',columns:3,cards:items.map(item=>({type:'custom:echo-entity-card',...item}))});
        newCard.hass=mockHass;wrappers[1].append(newCard);await newCard.ready;
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        compare(oldCard.shell,newCard.shell,oldCard,newCard,'Container shell');
        compare(oldCard.fields.heading,newCard.grid.querySelector('.heading'),oldCard,newCard,'Heading');
        for (const [index,oldChild] of oldCard.childrenCards.entries()) {
          const newChild=newCard.childrenCards[index];
          compare(oldChild.shell,newChild.shell,oldCard,newCard,`Entity ${index}`);
          compare(oldChild.iconCell,newChild.iconCell,oldChild.shell,newChild.shell,`Icon ${index}`);
          compare(oldChild.fields.n,newChild.nameElement,oldChild.shell,newChild.shell,`Name ${index}`);
          compare(oldChild.fields.l,newChild.stateElement,oldChild.shell,newChild.shell,`State ${index}`);
        }
        for (const wrapper of wrappers) wrapper.remove();
        if (newCard.resizeObserver) throw new Error('Container observer leaked');
      }
    });
    results.push('Original vs generic three-entity group: matching shell, heading, tile/icon/text rectangles, colors, radii, typography, padding and shadows at 600×260, 400×210 and 600×210');
    await page.evaluate(async () => {
      const wrapper=document.createElement('div');wrapper.id='entity-action-test';
      wrapper.style.cssText='position:fixed;left:0;top:0;width:300px;height:160px;z-index:1000';
      const card=document.createElement('echo-entity-card');wrapper.append(card);document.body.append(wrapper);
      card.setConfig({entity:'switch.demo_12',sizing:'fixed',tap_action:{action:'toggle'},hold_action:{action:'more-info'},double_tap_action:{action:'more-info',entity:'climate.demo_1'},icon_tap_action:{action:'more-info'}});
      card.hass=mockHass;
      calls.length=0;infos.length=0;
    });
    const entityTest=page.locator('#entity-action-test echo-entity-card');
    const entityShell=entityTest.locator('ha-card');
    await entityTest.locator('.name').click();
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(()=>calls.pop().service),'toggle');
    await entityTest.locator('.img-cell').click();
    assert.deepEqual(await page.evaluate(()=>({calls:calls.length,infos:infos.splice(0)})),{calls:0,infos:['switch.demo_12']});
    await entityTest.locator('.name').dblclick({delay:70});
    await page.waitForTimeout(350);
    assert.deepEqual(await page.evaluate(()=>({calls:calls.length,infos:infos.splice(0)})),{calls:0,infos:['climate.demo_1']});
    const entityBox=await entityShell.boundingBox();
    await page.mouse.move(entityBox.x+250,entityBox.y+140);await page.mouse.down();
    await page.waitForTimeout(550);await page.mouse.up();
    await page.waitForTimeout(350);
    assert.deepEqual(await page.evaluate(()=>({calls:calls.length,infos:infos.splice(0)})),{calls:0,infos:['switch.demo_12']});
    await entityTest.locator('.img-cell').focus();await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(()=>infos.splice(0)),['switch.demo_12']);
    await entityTest.evaluate(card=>card.setConfig({...card.config,icon_hold_action:{action:'more-info',entity:'climate.demo_1'},icon_double_tap_action:{action:'more-info',entity:'cover.demo_2'}}));
    const iconBox=await entityTest.locator('.img-cell').boundingBox();
    await page.mouse.move(iconBox.x+iconBox.width/2,iconBox.y+iconBox.height/2);await page.mouse.down();
    await page.waitForTimeout(550);await page.mouse.up();await page.waitForTimeout(350);
    assert.deepEqual(await page.evaluate(()=>({calls:calls.length,infos:infos.splice(0)})),{calls:0,infos:['climate.demo_1']});
    await entityTest.locator('.img-cell').dblclick({delay:70});await page.waitForTimeout(350);
    assert.deepEqual(await page.evaluate(()=>({calls:calls.length,infos:infos.splice(0)})),{calls:0,infos:['cover.demo_2']});
    await page.evaluate(async () => {
      const card=document.querySelector('#entity-action-test echo-entity-card');
      const recorded=[];
      card.hass={...mockHass,callService:async (...args)=>recorded.push(args)};
      const action={action:'perform-action',perform_action:'light.turn_on',target:{entity_id:'light.demo_7'},data:{brightness_pct:42},confirmation:{text:'Test'}};
      card.setConfig({...card.config,tap_action:action});
      const confirm=window.confirm;window.confirm=()=>false;
      await card.runAction('tap_action');
      if (recorded.length) throw new Error('Rejected confirmation ran action');
      window.confirm=()=>true;await card.runAction('tap_action');window.confirm=confirm;
      if (JSON.stringify(recorded)!==JSON.stringify([['light','turn_on',{brightness_pct:42},{entity_id:'light.demo_7'}]])) throw new Error('Target/data altered');
      card.setConfig({...card.config,tap_action:{action:'toggle'}});
      for (const [entity,state,service] of [['lock.demo_9','locked','unlock'],['cover.demo_2','closed','open_cover']]) {
        card.setConfig({...card.config,entity});await card.runAction('tap_action');
        if (recorded.at(-1)[1]!==service) throw new Error(`${state} toggle uses wrong service`);
      }
      card.setConfig({...card.config,entity:'sensor.missing'});
      const before=recorded.length;await card.runAction('tap_action');
      if (recorded.length!==before) throw new Error('Unavailable entity controlled');
      const originalUrl=location.href;
      card.setConfig({...card.config,tap_action:{action:'navigate',navigation_path:'/test-echo-actions',navigation_replace:true}});
      await card.runAction('tap_action');
      if (location.pathname!=='/test-echo-actions') throw new Error('Navigate action failed');
      history.replaceState(null,'',originalUrl);
      const originalOpen=window.open;let opened;
      window.open=(...args)=>{opened=args;};
      card.setConfig({...card.config,tap_action:{action:'url',url_path:'https://example.com/test'}});await card.runAction('tap_action');
      if (opened[0]!=='https://example.com/test' || !opened[2].includes('noopener')) throw new Error('URL action failed');
      opened=null;card.setConfig({...card.config,tap_action:{action:'url',url_path:'javascript:alert(1)'}});await card.runAction('tap_action');
      if (opened) throw new Error('Unsafe URL executed');window.open=originalOpen;
      document.querySelector('#entity-action-test').remove();
    });
    assert.deepEqual(errors,[]);
    results.push('Custom Entity real pointer/keyboard tap, hold, double-tap and icon isolation; service targets/data, confirmation accept/cancel, lock/cover toggle, unavailable states, navigation and URL safety');
    for (const [view,width,height] of [[0,1280,800],[1,960,480]]) {
      await open(view,width,height,'legacy-reference');
      await page.evaluate(async () => {
        await Promise.all(topCards.map(card=>card.ready));
        for (const card of topCards) {
          const bounds=card.shell.getBoundingClientRect();
          if (bounds.right>innerWidth+1 || bounds.bottom>innerHeight+1) throw new Error('Migrated view exceeds viewport');
          for (const child of card.childrenCards) {
            const box=child.shell.getBoundingClientRect();
            if (box.right>bounds.right+1 || box.bottom>bounds.bottom+1) throw new Error(`Migrated ${card.kind}/${child.kind} exceeds card: ${JSON.stringify({parent:{right:bounds.right,bottom:bounds.bottom},child:{right:box.right,bottom:box.bottom}})}`);
          }
        }
      });
      await page.screenshot({path:path.join(__dirname,`preview-migrated-${view ? 'guest' : 'kitchen'}-${width}x${height}.png`)});
    }
    assert.deepEqual(errors,[]);
    results.push('Migrated Kitchen 1280×800 and unchanged Guest 960×480: component and control bounds fit original layout allocations');
    await open(0,1280,1000,'reference');
    await page.evaluate(async () => {
      const streams=[];
      const connection={subscribeMessage:async (callback,parameters)=>{
        const stream={callback,parameters,closed:false};streams.push(stream);
        return ()=>{stream.closed=true;};
      }};
      const header=document.createElement('echo-header-card');
      header.setConfig({type:'custom:echo-header-card',name:'Original',templates:{title:'{{ title }}',time:'{{ now() }}',greeting:'{{ greeting }}'}});
      header.hass={...mockHass,connection};document.body.append(header);await header.templateReady;
      if (streams.length!==4 || streams.some(stream=>stream.parameters.type!=='render_template' || stream.parameters.strict!==true)) throw new Error('Wrong template subscription protocol');
      streams[0].callback({result:'A reusable header'});
      streams[1].callback({result:'11:42 AM'});
      streams.find(stream=>stream.parameters.variables.template_slot==='greeting').callback({result:'<img src=x onerror=alert(1)>'});
      if (header.fields.room.textContent!=='A reusable header' || header.fields.clock.textContent!=='11:42 AM' || header.fields.greeting.querySelector('img')) throw new Error('Template values not safely rendered');
      header.hass={...mockHass,connection};
      if (streams.length!==4) throw new Error('State updates resubscribe templates');
      streams[0].callback({error:'Invalid Jinja'});
      if (header.fields.room.textContent!=='—' || !header.hasAttribute('template-error')) throw new Error('Template error marker missing');
      streams[0].callback({result:'Recovered'});
      if (header.fields.room.textContent!=='Recovered' || header.hasAttribute('template-error')) throw new Error('Template recovery failed');
      header.setConfig({name:'New default'});await Promise.resolve();await Promise.resolve();
      streams[0].callback({result:'Stale result'});
      if (streams.slice(0,4).some(stream=>!stream.closed) || header.fields.room.textContent!=='New default') throw new Error('Stale subscription changed new config');
      header.setConfig({templates:{greeting:'{{ now() }}'}});await header.templateReady;
      header.remove();await Promise.resolve();await Promise.resolve();
      if (!streams.at(-1).closed) throw new Error('Template unsubscribe missing on removal');
      document.body.append(header);await header.templateReady;
      if (streams.at(-1).closed) throw new Error('Template did not restart on reconnection');
      header.remove();
      const weather=document.createElement('echo-weather-card');
      weather.setConfig({type:'custom:echo-weather-card',entity:'weather.demo_13',templates:{label:'{{ label }}',condition:'{{ condition }}',temperature:'{{ temperature }}',humidity:'{{ humidity }}',icon:'{{ icon }}'}});
      weather.hass={...mockHass,connection};document.body.append(weather);await weather.templateReady;
      const latest=streams.slice(-5);
      for (const [index,result] of ['Garden','Sunny skies','82°F','Humidity 19%','mdi:weather-sunny'].entries()) latest[index].callback({result});
      if (weather.fields.eyebrow.textContent!=='Garden' || weather.fields.condition.textContent!=='Sunny skies' || weather.fields.temperature.textContent!=='82°F' || weather.fields.humidity.textContent!=='Humidity 19%' || weather.iconElement.getAttribute('icon')!=='mdi:weather-sunny') throw new Error('Weather template slot missing');
      if (latest[0].parameters.variables.entity!=='weather.demo_13') throw new Error('Template entity context missing');
      const editor=weather.constructor.getConfigElement();
      editor.setConfig({...weather.config,grid_options:{columns:12,rows:2},future_key:true});editor.hass=mockHass;
      let emitted;editor.addEventListener('config-changed',event=>{emitted=event.detail.config;});
      const input=editor.templateForm;
      const editedHumidity='{{ states("sensor.humidity") }}';
      input.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...input.data,humidity:editedHumidity}}}));
      if (emitted.templates.humidity!==editedHumidity || emitted.templates.label!=='{{ label }}' || !emitted.future_key || emitted.grid_options.rows!==2) throw new Error('Template editor lost config');
      if (editor.shadowRoot.querySelector('[data-key="height"],[data-key="sizing"]')) throw new Error('Sizing controls remain in editor');
      weather.remove();
      const pendingSubscriptions=[];let unsubscribed=0;
      const pending=document.createElement('echo-header-card');pending.setConfig({templates:{title:'{{ now() }}'}});
      pending.hass={...mockHass,connection:{subscribeMessage:()=>new Promise(resolve=>{pendingSubscriptions.push(resolve);})}};
      document.body.append(pending);pending.remove();for (const resolve of pendingSubscriptions) resolve(()=>{unsubscribed++;});await pending.templateReady;
      if (unsubscribed!==pendingSubscriptions.length) throw new Error('Pending subscription leaked after disconnect');
    });
    assert.deepEqual(errors,[]);
    results.push('Jinja WebSocket subscription protocol and all Header/Weather slots, safe text rendering, dependency updates, error indicators/recovery, editor preservation, disconnect/reconnect and pending unsubscribe cleanup');
    await page.evaluate(() => {
      for (const [type,slots] of [['custom:echo-header-card',['title','time','date','greeting']],['custom:echo-weather-card',['label','condition','temperature','humidity','icon']],['custom:echo-climate-card',['title','status','target_temperature','current_temperature','target_label','hint']]]) {
        const card=document.createElement(type.slice(7));
        const editor=card.constructor.getConfigElement();
        const original={type,entity:'weather.demo_13',name:'Original name',templates:{[slots[0]]:'Existing template',future_slot:'keep'},grid_options:{columns:12,rows:2},visibility:[{condition:'user',users:['test']}],future_key:true};
        editor.setConfig(original);editor.hass=mockHass;
        const form=editor.templateForm;
        if (!form || form.hass!==mockHass || form.schema.length!==slots.length || form.schema.some(field=>field.selector.template?.preview!==false || field.required)) throw new Error('Native optional template selectors missing');
        if (editor.shadowRoot.querySelector('textarea')) throw new Error('Plain template textarea remains');
        const multiline='  {% if true %}\n    {{ "Multiline output" }}\n  {% endif %}\n';
        let emitted;let leaked=0;
        editor.addEventListener('config-changed',event=>{emitted=event.detail.config;});
        editor.addEventListener('value-changed',()=>leaked++);
        form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form.data,[slots[0]]:multiline}},bubbles:true,composed:true}));
        if (!emitted || emitted.templates[slots[0]]!==multiline || emitted.templates.future_slot!=='keep' || 'name' in emitted || emitted.grid_options.rows!==2 || !emitted.future_key || emitted.visibility[0].users[0]!=='test' || original.templates[slots[0]]!=='Existing template' || leaked) throw new Error('Jinja editor altered text, mutated config, lost settings or leaked event');
        editor.setConfig(emitted);
        if (editor.templateForm!==form || form.data[slots[0]]!==multiline) throw new Error('Jinja editor replaced during edits');
        form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...form.data,[slots[0]]:''}}}));
        if (emitted.templates[slots[0]]!=='' || emitted.templates.future_slot!=='keep') throw new Error('Clearing native template editor failed');
        editor.setConfig({...emitted,templates:{[slots[0]]:'Only override'}});
        form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{[slots[0]]:undefined}}}));
        if (emitted.templates[slots[0]]!=='' || Object.keys(emitted.templates).length!==slots.length) throw new Error('Clearing template erased other default fields');
      }
    });
    results.push('Native Jinja editors for fifteen prefilled text fields, explicit blank values, exact multiline/whitespace preservation, stable identity, config immutability and event isolation');
    await page.evaluate(async () => {
      const {normalizeTextConfig,templateDefaults,entityTextFields}=await import('../frontend/echo-card-editor.js');
      for (const kind of ['header','weather','climate']) {
        const defaults=templateDefaults(kind);
        const custom=Object.fromEntries(Object.keys(defaults).map(key=>[key,`Custom ${key}`]));
        const first={type:`custom:echo-${kind}-card`,entity:kind==='climate'?'climate.demo_1':'weather.demo_13',templates:custom,name:'Old duplicate',future_key:true,grid_options:{columns:12,rows:2}};
        const editor=document.createElement(`echo-${kind}-card`).constructor.getConfigElement();
        editor.setConfig(first);editor.hass=mockHass;
        if (editor.shadowRoot.querySelector('input[data-key="name"]') || editor.shadowRoot.textContent.includes('Optional Jinja')) throw new Error('Competing text controls remain');
        if ('name' in editor.config || Object.keys(editor.config.templates).length!==Object.keys(defaults).length) throw new Error('Text config was not consolidated');
        const same=normalizeTextConfig(kind,{...editor.config,icon:'mdi:fan'},editor.config);
        if (JSON.stringify(same.templates)!==JSON.stringify(custom)) throw new Error('Non-entity change reset custom text');
        if (kind==='header') continue;
        let emitted;editor.addEventListener('config-changed',event=>{emitted=event.detail.config;});
        const entityField=editor.shadowRoot.querySelector('[data-key="entity"]');
        entityField.value=kind==='climate'?'climate.other':'weather.other';entityField.dispatchEvent(new Event('change'));
        for (const key of Object.keys(defaults)) {
          const expected=entityTextFields[kind].includes(key)?defaults[key]:custom[key];
          if (emitted.templates[key]!==expected || editor.templateForm.data[key]!==expected) throw new Error(`${kind}/${key}: wrong reset policy`);
        }
        if (!emitted.future_key || emitted.grid_options.rows!==2 || first.templates.title==='Changed') throw new Error('Reset lost unrelated config');
        const external=normalizeTextConfig(kind,{...same,entity:entityField.value},same);
        if (JSON.stringify(external.templates)!==JSON.stringify(emitted.templates)) throw new Error('YAML entity changes use a different reset policy');
      }
      const oldHeader=normalizeTextConfig('header',{room:'Kitchen'});
      const oldWeather=normalizeTextConfig('weather',{entity:'weather.demo_13',name:'Outside label'});
      const oldClimate=normalizeTextConfig('climate',{entity:'climate.demo_1',name:'Home Temperature'});
      if (oldHeader.templates.title!=='Kitchen' || oldWeather.templates.label!=='Outside label' || oldClimate.templates.title!=='Home Temperature' || [oldHeader,oldWeather,oldClimate].some(config=>'name' in config || 'room' in config)) throw new Error('Legacy title migration failed');
      const card=document.createElement('echo-climate-card');
      card.setConfig({entity:'climate.demo_1',show_temperature_control:true,templates:{title:'Custom title',status:'Custom status',target_temperature:'Comfort zone',current_temperature:'Current text'}});
      card.hass=mockHass;document.body.append(card);await card.templateReady;
      if (card.temperatureReadout.textContent!=='Comfort zone' || card.fields.n.textContent!=='Custom title' || card.fields.l.textContent!=='Custom status' || card.fields.hint.textContent!=='Current text') throw new Error('Climate text editor does not own display');
      const actual=mockHass.states['climate.demo_1'];actual.state='cool';actual.attributes={...actual.attributes,temperature:74,min_temp:60,max_temp:85,target_temp_step:1,supported_features:1};card.hass=mockHass;
      await card.adjustTemperature(1);
      if (calls.pop().data.temperature!==75 || card.temperatureReadout.textContent!=='Comfort zone' || getComputedStyle(card.iconElement).color!=='rgb(52, 120, 246)') throw new Error('Display templates changed numerical control or HVAC colors');
      card.remove();
    });
    results.push('Single-source text editors: default Jinja prefill, old-name migration, entity-only reset of derived fields (including custom values), static-text preservation, blank text and numeric-control/HVAC-color independence');
    await page.evaluate(async () => {
      const entity='light.test_dimmable';mockHass.states[entity]={entity_id:entity,state:'on',attributes:{friendly_name:'Dimmable light',supported_color_modes:['brightness'],brightness:128}};
      const card=document.createElement('echo-toggle-card');card.setConfig({type:'custom:echo-toggle-card',entity});card.hass=mockHass;document.body.append(card);
      if (card.range || card.kind!=='toggle') throw new Error('Slider is not hidden by default');
      const editor=card.constructor.getConfigElement();editor.setConfig(card.config);editor.hass=mockHass;
      const checkbox=editor.shadowRoot.querySelector('[data-key="slider"]');
      if (checkbox.disabled || checkbox.checked) throw new Error('Dimmable light slider option incorrect');
      let emitted;editor.addEventListener('config-changed',event=>{emitted=event.detail.config;});checkbox.checked=true;checkbox.dispatchEvent(new Event('change'));card.setConfig(emitted);
      if (!card.range || card.kind!=='fan' || card.range.value!=='50' || !card.range.getAttribute('aria-label').includes('brightness')) throw new Error('Brightness slider not enabled');
      card.range.value='72';card.range.dispatchEvent(new Event('input',{bubbles:true}));
      mockHass.states[entity].attributes.brightness=30;card.hass={...mockHass};
      if (card.range.value!=='72') throw new Error('State update replaced drag position');
      card.range.dispatchEvent(new Event('change',{bubbles:true}));await Promise.resolve();await Promise.resolve();
      const call=calls.pop();
      if (call.domain!=='light' || call.service!=='turn_on' || call.data.brightness_pct!==72 || call.data.entity_id!==entity) throw new Error('Brightness service incorrect');
      card.range.value='0';card.range.dispatchEvent(new Event('change'));await Promise.resolve();await Promise.resolve();
      if (calls.pop().service!=='turn_off') throw new Error('Zero brightness did not turn light off');
      const fanEntity='fan.test_speed';mockHass.states[fanEntity]={entity_id:fanEntity,state:'on',attributes:{supported_features:1,percentage_step:25,percentage:50}};
      card.setConfig({type:'custom:echo-toggle-card',entity:fanEntity});
      if (card.range) throw new Error('Fan slider defaults on in generic card');
      card.setConfig({...card.config,slider:true});
      if (card.range.max!=='4') throw new Error('Fan speed steps lost in unified card');
      card.range.value='3';card.range.dispatchEvent(new Event('change'));await Promise.resolve();await Promise.resolve();
      const speed=calls.pop();if (speed.domain!=='fan' || speed.data.percentage!==75) throw new Error('Unified fan service incorrect');
      editor.setConfig({type:'custom:echo-toggle-card',entity:'switch.demo_12'});editor.hass=mockHass;
      const unavailable=editor.shadowRoot.querySelector('[data-key="slider"]');
      if (!unavailable.disabled || !unavailable.parentElement.hidden) throw new Error('Unsupported slider offered');
      const old=document.createElement('echo-fan-card');old.setConfig({entity:fanEntity});old.hass=mockHass;
      if (!old.range) throw new Error('Old fan config compatibility lost');
      if (window.customCards.some(item=>item.type==='echo-fan-card')) throw new Error('Duplicate fan in picker');
      card.remove();
    });
    assert.deepEqual(errors,[]);
    results.push('Unified Control defaults slider off, visual capability gating, dimmable-light brightness/zero-off and fan speed services, drag stability, and old fan alias compatibility');
    await page.evaluate(() => {
      for (const type of ['custom:echo-toggle-card','custom:echo-climate-card','custom:echo-fan-card','custom:echo-security-card']) {
        const card=document.createElement(type.slice(7));
        const editor=card.constructor.getConfigElement();
        const config={type,entity:'light.demo_7',icon:'mdi:lamp',grid_options:{columns:6,rows:2},visibility:[{condition:'user',users:['test']}],future_key:true};
        if (type==='custom:echo-security-card') config.items=Array.from({length:3},()=>({entity:'lock.demo_9',icon:'mdi:lock'}));
        editor.setConfig(config);editor.hass=mockHass;
        const picker=editor.shadowRoot.querySelector('ha-form[data-key="icon"]');
        if (!picker || picker.schema[0].selector.icon===undefined || picker.schema[0].context.icon_entity!=='entity' || picker.hass!==mockHass || picker.data.icon!=='mdi:lamp' || picker.data.entity!==config.entity) throw new Error('Native icon selector missing or context lost');
        if (editor.shadowRoot.querySelector('input[data-key="icon"]')) throw new Error('Plain icon text input remains');
        let emitted;editor.addEventListener('config-changed',event=>{emitted=event.detail.config;});
        picker.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{icon:'mdi:ceiling-light'}}}));
        if (emitted.icon!=='mdi:ceiling-light' || emitted.grid_options.rows!==2 || !emitted.future_key || emitted.visibility[0].users[0]!=='test' || config.icon!=='mdi:lamp') throw new Error('Icon selection lost or mutated config');
        editor.setConfig(emitted);
        if (editor.shadowRoot.querySelector('ha-form[data-key="icon"]')!==picker || picker.data.icon!=='mdi:ceiling-light') throw new Error('Icon picker replaced while editing');
        picker.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{icon:''}}}));
        if ('icon' in emitted) throw new Error('Clearing icon did not restore default');
        if (config.items) {
          const childPicker=editor.shadowRoot.querySelector('ha-form[data-key="items.1.icon"]');
          childPicker.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{icon:'mdi:door'}}}));
          if (emitted.items[1].icon!=='mdi:door' || emitted.items[0].icon!=='mdi:lock' || config.items[1].icon!=='mdi:lock') throw new Error('Nested icon edit changed another item or input config');
        }
      }
    });
    results.push('Native icon selector schemas, entity context and hass forwarding; icon select/clear, stable picker identity, preserved layout/visibility/unknown keys and immutable nested edits');
    const thermostat=page.locator('echo-climate-card[temperature-control]');
    await page.evaluate(()=>{calls.length=0;infos.length=0;patchState('climate.demo_1','cool',{temperature:74,current_temperature:72,min_temp:60,max_temp:85,target_temp_step:1,hvac_modes:['cool','heat','off'],supported_features:1});});
    await thermostat.getByRole('button',{name:'Increase target temperature'}).click();
    assert.deepEqual(await page.evaluate(()=>calls.pop()),{domain:'climate',service:'set_temperature',data:{entity_id:'climate.demo_1',temperature:75}});
    assert.equal(await page.evaluate(()=>infos.length),0);
    await thermostat.locator('.img-cell').click();
    assert.deepEqual(await page.evaluate(()=>({calls:calls.length,infos:infos.length})),{calls:0,infos:0});
    await page.evaluate(()=>{
      const card=topCards.find(card=>card.temperatureReadout);card.setConfig({...card.config,icon_tap_action:{action:'cycle-hvac-mode'}});card.hass=mockHass;
    });
    await thermostat.locator('.img-cell').click();
    assert.deepEqual(await page.evaluate(()=>calls.pop()),{domain:'climate',service:'set_hvac_mode',data:{entity_id:'climate.demo_1',hvac_mode:'heat'}});
    await page.evaluate(()=>patchState('climate.demo_1','heat'));
    await thermostat.locator('.img-cell').click();
    assert.equal(await page.evaluate(()=>calls.pop().data.hvac_mode),'cool');
    for (const [width,height] of [[600,184],[320,120]]) {
      await thermostat.evaluate(async (card,{width,height})=>{
        const wrapper=document.createElement('div');wrapper.style.cssText=`width:${width}px;height:${height}px`;document.body.append(wrapper);wrapper.append(card);
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const centers=[...card.temperatureButtons,card.temperatureReadout].map(element=>{const bounds=element.getBoundingClientRect();return bounds.y+bounds.height/2;});
        if (Math.max(...centers)-Math.min(...centers)>.1) throw new Error('Temperature and buttons vertically misaligned');
        const bounds=card.shell.getBoundingClientRect();
        for (const element of [...card.temperatureButtons,card.temperatureReadout,card.iconCell]) {const box=element.getBoundingClientRect();if (box.right>bounds.right+.1 || box.bottom>bounds.bottom+.1 || box.left<bounds.left-.1) throw new Error('Thermostat controls clipped');}
      },{width,height});
    }
    await page.evaluate(async ()=>{
      const card=document.querySelector('echo-climate-card[temperature-control]');
      patchState('climate.demo_1','cool',{temperature:85});card.hass=mockHass;
      if (!card.temperatureButtons[1].disabled) throw new Error('Maximum temperature not enforced');
      patchState('climate.demo_1','cool',{temperature:60});card.hass=mockHass;
      if (!card.temperatureButtons[0].disabled) throw new Error('Minimum temperature not enforced');
      mockHass.config.unit_system.temperature='°C';patchState('climate.demo_1','heat',{temperature:20,min_temp:15,max_temp:28,target_temp_step:.5});card.hass=mockHass;
      const editor=card.constructor.getConfigElement();editor.setConfig({...card.config,visibility:[{condition:'user',users:['test']}],future_key:true});editor.hass=mockHass;
      let edited;editor.addEventListener('config-changed',event=>{edited=event.detail.config;});
      editor.climateForm.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{...editor.climateForm.data,icon_tap_action:{action:'cycle-hvac-mode'},hvac_modes:['cool','heat']}}}));
      if (!edited.future_key || edited.visibility[0].users[0]!=='test' || edited.icon_tap_action.action!=='cycle-hvac-mode' || edited.hvac_modes.join(',')!=='cool,heat') throw new Error('Climate visual editor lost settings');
      await card.adjustTemperature(1);if (calls.pop().data.temperature!==20.5) throw new Error('Fractional temperature step lost');
      patchState('climate.demo_1','heat_cool',{temperature:null,target_temp_low:19,target_temp_high:24,supported_features:2});
      card.setConfig({...card.config,temperature_target:'low'});card.hass=mockHass;await card.adjustTemperature(1);
      const range=calls.pop().data;
      if (range.target_temp_low!==19.5 || range.target_temp_high!==24 || 'temperature' in range) throw new Error('Range endpoints not preserved');
      patchState('climate.demo_1','off');card.hass=mockHass;
      if (card.temperatureButtons.some(button=>!button.disabled)) throw new Error('Off mode adjustment enabled');
      patchState('climate.demo_1','unavailable');card.hass=mockHass;
      if (card.temperatureButtons.some(button=>!button.disabled)) throw new Error('Unavailable climate controls enabled');
    });
    assert.deepEqual(errors,[]);
    results.push('Approved thermostat variant: small buttons aligned around right-side target, no dialog bubbling, default no-action icon, explicit Cool/Heat-only cycling, bounds, fractional steps, selected range endpoint preservation, off/unavailable safety');
    await open(0,1280,800,'reference');
    await page.evaluate(async () => {
      const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const signature = card => JSON.stringify([getComputedStyle(card.grid).gridTemplateAreas, ...Object.values(card.fields).map(field => {
        const box = field.getBoundingClientRect(); const origin = card.shell.getBoundingClientRect();
        return [field.dataset.field, box.x-origin.x, box.y-origin.y, box.width, box.height, getComputedStyle(field).fontSize];
      })]);
      for (const [kind,key,defaultValue,variant] of [['header','header_layout','auto','stacked'],['weather','weather_layout','stacked','inline']]) {
        const card = topCards.find(card => card.kind === kind);
        const original = { ...card.config };
        const parent = document.createElement('div'); parent.style.cssText = 'width:360px;height:96px'; document.body.append(parent); parent.append(card);
        await card.templateReady; await frame();
        const baseline = signature(card);
        card.setConfig({ ...original, [key]: defaultValue }); await card.templateReady; await frame();
        if (signature(card)!==baseline) throw new Error(`${kind}: explicit default changes native rendering`);
        const editor = card.constructor.getConfigElement(); editor.hass=mockHass; editor.setConfig(original); document.body.append(editor);
        const select = editor.shadowRoot.querySelector(`select[data-key="${key}"]`);
        if (!select || select.value!==defaultValue) throw new Error(`${kind}: arrangement selector missing/default wrong`);
        let emitted; editor.addEventListener('config-changed',event=>emitted=event.detail.config);
        select.value=variant;select.dispatchEvent(new Event('change'));
        if (emitted[key]!==variant || JSON.stringify(emitted.templates)!==JSON.stringify(original.templates) || emitted.grid_options.rows!==original.grid_options.rows) throw new Error(`${kind}: arrangement editor lost text/allocation`);
        card.setConfig(emitted); await card.templateReady; await frame();
        if (kind==='header' && card.fields.greeting.getBoundingClientRect().bottom>card.fields.room.getBoundingClientRect().top+1) throw new Error('Stacked header greeting not above title');
        if (kind==='weather') {
          if (Math.abs(card.fields.condition.getBoundingClientRect().y-card.fields.temperature.getBoundingClientRect().y)>1) throw new Error('Inline weather not aligned');
          if (card.weatherSeparator.hidden) throw new Error('Inline weather separator missing');
          card.setConfig({...emitted,templates:{...emitted.templates,condition:''}});await card.templateReady;
          if (!card.weatherSeparator.hidden) throw new Error('Blank weather left an orphan separator');
          card.setConfig(emitted);await card.templateReady;
        }
        card.setConfig(original);await card.templateReady;await frame();
        if (signature(card)!==baseline) throw new Error(`${kind}: switching arrangements did not restore default geometry`);
        if (kind==='header') {
          parent.style.height='184px';card.setConfig({...original,header_layout:'compact'});await card.templateReady;await frame();
          if (card.grid.style.height || getComputedStyle(card.grid).gridTemplateAreas!=='"room clock" "date greeting"' || Math.abs(card.shell.getBoundingClientRect().height-184)>1) throw new Error('Explicit compact header changed parent allocation or ignored arrangement');
        }
        card.remove();parent.remove();editor.remove();
      }
      const fan = topCards.find(card=>card.kind==='fan');
      const parent=document.createElement('div');document.body.append(parent);parent.append(fan);
      for (const [width,height] of [[301,188],[249,157],[320,120],[416,396]]) {
        parent.style.cssText=`width:${width}px;height:${height}px`;
        fan.setConfig({...fan.config,name:'Guest Bedroom Ceiling Fan Guest Bedroom Ceiling Fan'});await frame();
        const title=fan.fields.title;const style=getComputedStyle(title);const box=title.getBoundingClientRect();const power=fan.fields.power.getBoundingClientRect();const speed=fan.fields.speed.getBoundingClientRect();
        if (style.whiteSpace!=='nowrap' || style.textOverflow!=='ellipsis' || style.overflow!=='hidden' || title.scrollWidth<=title.clientWidth || box.top<power.bottom-1 || box.bottom>speed.top+1 || box.right>fan.shell.getBoundingClientRect().right) throw new Error('Long fan title overlaps controls or fails truncation');
        const status=fan.fields.status.getBoundingClientRect();
        const bounds=fan.shell.getBoundingClientRect();
        const padding=parseFloat(getComputedStyle(fan.shell).paddingBottom);
        if (Math.abs(speed.bottom-(bounds.bottom-padding))>1 || Math.abs(status.bottom-speed.top)>1 || (fan.getAttribute('height')==='tall' && Math.abs(box.bottom-status.top)>1)) throw new Error('Fan title/state/slider do not form a bottom-aligned group');
        if (Math.abs(fan.childrenCards[0].shell.getBoundingClientRect().top-power.top)>1) throw new Error('Fan power moved away from top');
      }
      fan.remove();parent.remove();
    });
    for (const [width,height] of [[960,480],[800,400]]) {
      await open(1,width,height,'legacy-reference');
      await page.evaluate(async () => {
        const header=topCards.find(card=>card.kind==='header');const weather=topCards.find(card=>card.kind==='weather');const fan=topCards.find(card=>card.kind==='fan');
        patchState(weather.config.entity,'partlycloudy',{temperature:80,humidity:20});
        await Promise.all(topCards.map(card=>card.templateReady));
        if (header.config.header_layout!=='stacked' || weather.config.weather_layout!=='inline' || fan.config.name!=='Ceiling Fan') throw new Error('Echo 5 presentation settings missing');
        if (header.fields.greeting.getBoundingClientRect().bottom>header.fields.room.getBoundingClientRect().top+1 || Math.abs(weather.fields.condition.getBoundingClientRect().y-weather.fields.temperature.getBoundingClientRect().y)>1) throw new Error('Echo 5 header/weather arrangement wrong');
        for (const card of [header,weather,fan]) {
          const bounds=card.shell.getBoundingClientRect();
          for (const field of Object.values(card.fields)) {
            const box=field.getBoundingClientRect();
            if (box.top<bounds.top-1 || box.bottom>bounds.bottom+1 || box.left<bounds.left-1 || box.right>bounds.right+1) throw new Error('Echo 5 presentation exceeds allocation');
          }
        }
      });
      await page.screenshot({path:path.join(__dirname,`preview-echo5-presentation-${width}x${height}.png`)});
    }
    assert.deepEqual(errors,[]);
    results.push('Opt-in Header/Weather arrangements: visual-editor round trips, unchanged default geometry, restored defaults, inline blank handling, parent sizing, long fan-title truncation, and Echo 5 960×480/800×400 allocations');
    // Reproduce the supplied deployment without the reference fixture's opt-in
    // arrangements, shortened fan name, or replacement of the compatibility alias.
    for (const [width,height] of [[960,480],[800,400]]) {
      await open(1,width,height,'legacy-reference');
      await page.evaluate(async () => {
        const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        const header=topCards.find(card=>card.kind==='header');
        const weather=topCards.find(card=>card.kind==='weather');
        const oldFan=topCards.find(card=>card.kind==='fan');
        const defaults=topCards.map(card=>card.getGridOptions());
        for (const card of topCards) {
          const config={...card.config,profile:'guest',sizing:'fixed'};
          delete config.header_layout;delete config.weather_layout;
          card.setConfig(config);
        }
        const fan=document.createElement('echo-fan-card');
        fan.setConfig({entity:oldFan.config.entity,profile:'guest',sizing:'fixed'});
        fan.style.gridArea='fan';fan.hass=mockHass;oldFan.replaceWith(fan);
        topCards[topCards.indexOf(oldFan)]=fan;
        patchState(fan.config.entity,'off',{friendly_name:'Guest Bedroom Ceiling Fan Guest Bedroom Ceiling Fan',percentage:0});
        await Promise.all(topCards.map(card=>card.templateReady));await frame();
        if (header.getAttribute('header-layout')!=='auto' || weather.getAttribute('weather-layout')!=='stacked') throw new Error('Deployment defaults changed');
        if (JSON.stringify(topCards.map(card=>card.getGridOptions()))!==JSON.stringify(defaults)) throw new Error('Native sizing defaults changed');
        const title=fan.fields.title.getBoundingClientRect();
        const power=fan.fields.power.getBoundingClientRect();
        const speed=fan.fields.speed.getBoundingClientRect();
        if (fan.fields.title.textContent!=='Guest Bedroom Ceiling Fan Guest Bedroom Ceiling Fan' || fan.fields.title.scrollWidth<=fan.fields.title.clientWidth || title.top<power.bottom-1 || title.bottom>speed.top+1) throw new Error('Deployed alias title overlaps controls');
        for (const card of topCards) {
          const bounds=card.shell.getBoundingClientRect();
          if (bounds.left<0 || bounds.top<0 || bounds.right>innerWidth+1 || bounds.bottom>innerHeight+1) throw new Error('Deployment card outside viewport');
        }
      });
      await page.screenshot({path:path.join(__dirname,`preview-guest-deployed-${width}x${height}.png`)});
    }
    assert.deepEqual(errors,[]);
    results.push('Supplied Guest layout: legacy fan alias, unshortened entity name, off state, ignored legacy options, original Header/Weather defaults and unchanged native sizing at 960×480/800×400');
    await open(1,960,480,'legacy-reference');
    await page.evaluate(async () => {
      const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const media=topCards.find(card=>card.kind==='media');
      const parent=document.createElement('div');document.body.append(parent);parent.append(media);
      const options=JSON.stringify(media.getGridOptions());let previousSize=0;
      for (const [width,height] of [[616,188],[850,396],[300,440],[240,360],[320,120]]) {
        parent.style.cssText=`width:${width}px;height:${height}px`;await frame();
        const art=media.childrenCards[0].shell.getBoundingClientRect();
        const bounds=media.shell.getBoundingClientRect();const info=media.info.getBoundingClientRect();
        const controls=media.childrenCards.slice(1).map(card=>card.shell.getBoundingClientRect());
        if (Math.abs(art.width-art.height)>1) throw new Error('Media artwork is not square');
        if (height>width) {
          if (art.bottom>info.top+1 || info.bottom>controls[0].top+1) throw new Error('Portrait media did not stack artwork/text/controls');
        } else if (controls.some(box=>Math.abs(box.bottom-art.bottom)>1)) throw new Error('Landscape art and controls do not share bottom edge');
        for (const box of [art,info,...controls]) if (box.top<bounds.top-1 || box.bottom>bounds.bottom+1 || box.left<bounds.left-1 || box.right>bounds.right+1) throw new Error('Responsive media content clipped');
        if (width===850 && art.width<=previousSize) throw new Error('Artwork failed to grow in taller landscape');
        previousSize=art.width;
        if (JSON.stringify(media.getGridOptions())!==options) throw new Error('Media changed native grid defaults');
      }
      parent.remove();
    });
    results.push('Media square artwork scales with allocation; landscape art/control bottom alignment and portrait stacking without clipping; unchanged native grid defaults');
    for (const slider of [false,true]) {
      await open(1,960,480,'legacy-reference');
      await page.evaluate(slider=>{
        const card=document.createElement('echo-toggle-card');card.id='gesture-control';
        card.setConfig({type:'custom:echo-toggle-card',entity:'fan.demo_3',slider,name:'Gesture control',tap_action:{action:'more-info'},hold_action:{action:'none'},double_tap_action:{action:'toggle'},icon_tap_action:{action:'toggle'},icon_hold_action:{action:'more-info'},icon_double_tap_action:{action:'none'}});
        card.style.cssText='width:320px;height:188px';document.body.append(card);card.hass=mockHass;
      },slider);
      const card=page.locator('#gesture-control');
      const icon=slider ? card.locator('echo-fan-power-card .img-cell') : card.locator('.img-cell');
      await icon.click();
      assert.deepEqual(await page.evaluate(()=>calls.splice(0)),[{domain:'homeassistant',service:'toggle',data:{entity_id:'fan.demo_3'}}]);
      assert.equal(await page.evaluate(()=>infos.length),0);
      await icon.focus();await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(()=>calls.splice(0).length),1);
      const iconBox=await icon.boundingBox();
      await page.mouse.move(iconBox.x+10,iconBox.y+10);await page.mouse.down();await page.waitForTimeout(550);await page.mouse.up();
      assert.deepEqual(await page.evaluate(()=>infos.splice(0)),['fan.demo_3']);
      assert.equal(await page.evaluate(()=>calls.length),0);
      const label=card.locator(slider?'[data-field="title"]':'.name');
      await label.click();await page.waitForTimeout(350);
      assert.deepEqual(await page.evaluate(()=>infos.splice(0)),['fan.demo_3']);
      await label.dblclick();await page.waitForTimeout(350);
      assert.equal(await page.evaluate(()=>calls.splice(0).length),1);
      assert.equal(await page.evaluate(()=>infos.length),0);
      if(slider){await card.locator('input').click();assert.equal(await page.evaluate(()=>infos.length),0);await page.evaluate(()=>calls.length=0);}
      await page.evaluate(()=>{
        const card=document.querySelector('#gesture-control');const original={...card.config,grid_options:{columns:8,rows:3},future_option:{keep:true}};
        const editor=card.constructor.getConfigElement();editor.hass=mockHass;editor.setConfig(original);document.body.append(editor);
        const form=editor.actionForm;
        if(form.schema.length!==6 || form.schema.some(field=>!field.selector.ui_action || field.context.entity_id!=='entity')) throw new Error('Control gesture editor schema incomplete');
        let emitted;editor.addEventListener('config-changed',event=>emitted=event.detail.config);
        form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{icon_tap_action:{action:'more-info'},tap_action:{action:'none'}}}}));
        if(emitted.icon_tap_action.action!=='more-info' || emitted.tap_action.action!=='none' || !emitted.future_option.keep || emitted.grid_options.columns!==8 || original.icon_tap_action.action!=='toggle') throw new Error('Gesture editor round trip lost config or mutated input');
        card.setConfig(emitted);
      });
      await label.click();await page.waitForTimeout(350);
      assert.equal(await page.evaluate(()=>infos.length),0);
      // Pending single taps must be discarded when the card disconnects.
      await page.evaluate(()=>{const card=document.querySelector('#gesture-control');card.setConfig({...card.config,tap_action:{action:'more-info'}})});
      await label.click();await page.evaluate(()=>document.querySelector('#gesture-control').remove());await page.waitForTimeout(350);
      assert.equal(await page.evaluate(()=>infos.length),0);
    }
    assert.deepEqual(errors,[]);
    results.push('Toggle and slider Control card/icon gestures: pointer/keyboard, hold, delayed tap, double tap, explicit none, slider isolation, disconnect cleanup and six-action editor round trips');
    fs.writeFileSync(path.join(__dirname,'verification-results.json'),JSON.stringify({environment:'Headless Chromium; mocked Home Assistant, placeholder icons',passed:results},null,2));
    console.log(results.join('\n'));
  } finally { await browser.close(); }
}
run().catch(error => {console.error(error);process.exitCode=1;}).finally(() => server.close());

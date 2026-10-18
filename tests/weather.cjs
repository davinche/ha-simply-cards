const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'docs/weather-assets/manifest.json'),'utf8'));

(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.ECHO_BROWSER_PATH?{executablePath:process.env.ECHO_BROWSER_PATH}:{})});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('http://preview/**',async route=>{
      const pathname=new URL(route.request().url()).pathname;
      const filename=process.argv.includes('--bundle') && pathname==='/frontend/echo-cards.js'?path.join(root,'dist/ha-simply-cards.js'):path.resolve(root,'.'+pathname);
      if(!filename.startsWith(root+path.sep) || !fs.existsSync(filename))return route.fulfill({status:404,body:''});
      await route.fulfill({path:filename,contentType:filename.endsWith('.js')?'text/javascript':filename.endsWith('.json')?'application/json':'text/html'});
    });
    for(const dark of [false,true]){
      await page.goto(`http://preview/tests/design-preview.html?design=refresh&theme=${dark?'dark':'light'}`);
      await page.waitForFunction(()=>window.ready);
      const keys=await page.evaluate(async()=>Object.keys((await import('../frontend/echo-weather.js')).weatherConditions));
      assert.deepEqual(keys.sort(),Object.keys(manifest).sort());
      for(const state of keys){
        const result=await page.evaluate(async state=>{
          await setDemoWeather(state,{temperature:73,humidity:61,temperature_unit:'°F'});
          const card=document.querySelector('echo-weather-card');
          const {weatherAppearance}=await import('../frontend/echo-weather.js');
          const appearance=weatherAppearance(state,card.hasAttribute('echo-dark'));
          const primary=getComputedStyle(card.fields.condition).color;
          const secondary=getComputedStyle(card.fields.humidity).color;
          const probe=document.createElement('span');probe.style.color=appearance.color;document.body.append(probe);
          const expectedColor=getComputedStyle(probe).color;probe.remove();
          const bounds=node=>node.getBoundingClientRect();
          const centered=[...document.querySelector('echo-media-card').shadowRoot.querySelectorAll('echo-media-action-card')].every(action=>{
            const circle=bounds(action.shell),icon=bounds(action.iconElement);
            return Math.abs(circle.y+circle.height/2-icon.y-icon.height/2)<.5 && Math.abs(circle.x+circle.width/2-icon.x-icon.width/2)<.5;
          });
          return {label:card.fields.condition.textContent,icon:card.iconElement.getAttribute('icon'),
            imageMatches:card.weatherPhoto.getAttribute('src')===appearance.image,width:card.weatherPhoto.naturalWidth,height:card.weatherPhoto.naturalHeight,
            temperature:card.fields.temperature.textContent,humidity:card.fields.humidity.textContent,
            primary,secondary,iconColor:getComputedStyle(card.iconElement).color,expectedColor,
            centered,fallback:card.hasAttribute('weather-fallback'),font:getComputedStyle(card.fields.condition).fontFamily,
            overflow:card.shell.scrollHeight>card.shell.clientHeight+1};
        },state);
        assert.equal(result.icon,manifest[state].mdi_icon,state);
        assert.ok(result.imageMatches,state+' image mismatch');
        assert.deepEqual([result.width,result.height],[1920,1080],state);
        assert.equal(result.primary,dark?'rgb(247, 245, 239)':'rgb(32, 48, 51)',state);
        assert.equal(result.secondary,dark?'rgb(209, 208, 202)':'rgb(96, 105, 107)',state);
        assert.equal(result.iconColor,result.expectedColor,state);
        assert.ok(result.font.includes('Cormorant Garamond'),state);
        assert.ok(result.centered,'Media icons not centered');
        assert.equal(result.overflow,false,state);
        assert.equal(result.fallback,['unknown','unavailable'].includes(state),state);
        assert.equal(result.temperature,result.fallback?'--°F':'73°F',state);
        assert.equal(result.humidity,state==='unknown'?'No data available':state==='unavailable'?'Weather service unavailable':'Humidity 61%',state);
        if(state==='windy-variant')assert.equal(result.label,'Windy');
      }
      // Capture three contrasting conditions using the reference sheet's sample readings.
      for(const [state,temperature,humidity]of [['sunny',76,42],['snowy',28,91],['lightning-rainy',64,82]]){
        await page.evaluate(async values=>{await setDemoWeather(values.state,{temperature:values.temperature,humidity:values.humidity});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));},{state,temperature,humidity});
        await page.screenshot({path:path.join(root,`tests/design-weather-${state}-${dark?'dark':'light'}-1280x800.png`)});
      }
      const mode=await page.evaluate(async()=>{
        const card=document.querySelector('echo-weather-card');const node=card.weatherPhoto;const source=node.getAttribute('src');const color=getComputedStyle(card.fields.condition).color;
        card.hass={...card.hass,themes:{darkMode:!card.hasAttribute('echo-dark')}};
        const changed=color!==getComputedStyle(card.fields.condition).color;
        return {stable:node===card.weatherPhoto && source===card.weatherPhoto.getAttribute('src'),changed};
      });
      assert.deepEqual(mode,{stable:true,changed:true});
    }
    const extras=await page.evaluate(async()=>{
      await setDemoWeather('not-a-weather-condition');
      const card=document.querySelector('echo-weather-card');
      const {weatherAppearance}=await import('../frontend/echo-weather.js');
      if(card.weatherPhoto.getAttribute('src')!==weatherAppearance('unknown',false).image)throw new Error('Unexpected state did not use fallback');
      await setDemoWeather('snowy',{temperature:0,temperature_unit:'°C'});
      if(card.fields.temperature.textContent!=='0°C')throw new Error('Zero/Celsius mishandled');
      const old=card.weatherPhoto;
      card.setConfig({...card.config,templates:{label:'Garden',condition:'Custom condition',temperature:'Custom value',humidity:'Custom details',icon:'mdi:leaf'}});
      await card.templateReady;
      if(card.fields.condition.textContent!=='Custom condition' || card.iconElement.getAttribute('icon')!=='mdi:leaf')throw new Error('Custom weather templates overwritten');
      await setDemoWeather('unknown');
      const editor=card.constructor.getConfigElement();editor.setConfig({...card.config,type:'custom:echo-weather-card',future_key:'keep'});
      let saved;editor.addEventListener('config-changed',event=>saved=event.detail.config);document.body.append(editor);
      const checkbox=editor.controls.find(control=>control.name==='weather_images').input;
      checkbox.checked=false;checkbox.dispatchEvent(new Event('change',{bubbles:true}));
      if(saved.weather_images!==false || saved.future_key!=='keep' || saved.templates.condition!=='Custom condition')throw new Error('Weather image editor round trip failed');
      editor.remove();card.setConfig(saved);
      if(card.weatherPhoto || card.hasAttribute('weather-image') || card.hasAttribute('weather-fallback') || old.isConnected)throw new Error('Image opt-out failed');
      return true;
    });
    assert.ok(extras);assert.deepEqual(errors,[]);
    console.log('Weather: 17 exact assets/icons, labels and fallback states in both themes; live mode switching, offline images, custom templates, editor opt-out, Celsius/zero; centered media icons; six Demo previews.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});

const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.ECHO_BROWSER_PATH?{executablePath:process.env.ECHO_BROWSER_PATH}:{})});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://preview/**',route=>{
   const pathname=new URL(route.request().url()).pathname;
   const file=process.argv.includes('--bundle')&&pathname==='/frontend/echo-cards.js'?path.join(root,'dist/ha-simply-cards.js'):path.resolve(root,'.'+pathname);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   return route.fulfill({path:file,contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':'text/html'});
  });
  for(const width of [800,960])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:width/2});
   await page.goto(`http://preview/tests/design-preview.html?theme=${theme}`);await page.waitForFunction(()=>window.ready);
   await page.evaluate(async()=>{
    const hass=demoCards[0].hass,main=document.querySelector('main');main.replaceChildren();
    main.style.cssText='padding:16px;gap:12px;grid-template-columns:repeat(24,minmax(0,1fr));grid-template-rows:minmax(0,112fr) minmax(0,136fr) minmax(0,176fr)';
    window.compactCards=[];
    async function add(config,column,row){const card=document.createElement(config.type.slice(7));card.setConfig(config);card.hass=hass;card.preview=true;card.style.gridColumn=column;card.style.gridRow=row;main.append(card);compactCards.push(card);await card.ready;await card.templateReady;return card;}
    await add({type:'custom:echo-header-card',header_layout:'stacked',title_weight:500,templates:{title:'Sample Room',greeting:'Welcome',time:'10:30 AM',date:'Monday, January 1'}},'1 / 17',1);
    const weather=await add({type:'custom:echo-weather-card',entity:'weather.example',weather_layout:'inline',weather_images:true},'17 / -1',1);
    for(let i=0;i<3;i++)await add({type:'custom:echo-toggle-card',entity:'switch.example_a',name:['Control A','Control B','Control C'][i],icon:'mdi:ceiling-light-outline',compact_labels:true},`${i*8+1} / ${i===2?'-1':i*8+9}`,2);
    hass.states['fan.example']={entity_id:'fan.example',state:'off',attributes:{percentage:0,supported_features:1}};
    await add({type:'custom:echo-fan-card',entity:'fan.example',name:'Fan',compact_labels:true},'1 / 9',3);
    await add({type:'custom:echo-media-card',entity:'media_player.example',name:'Music'},'9 / -1',3);
    await weather.weatherPhoto.decode();await document.fonts.ready;
   });
   await page.waitForTimeout(100);
   const measured=await page.evaluate(()=>{
    const issues=[],labels=[];
    if(document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight)issues.push('Viewport overflow');
    for(const card of compactCards){
     const panel=card.shell.getBoundingClientRect();
     for(const node of card.grid.children){if(!node.checkVisibility())continue;const b=node.getBoundingClientRect();if(b.top<panel.top-1||b.bottom>panel.bottom+1||b.left<panel.left-1||b.right>panel.right+1)issues.push('Clipped '+card.kind);}
     if(['toggle','fan'].includes(card.kind)){const node=card.kind==='toggle'?card.fields.n:card.fields.title;const css=getComputedStyle(node);labels.push([css.fontSize,css.lineHeight,css.fontWeight]);if(node.scrollWidth>node.clientWidth)issues.push('Truncated label');}
    }
    const header=compactCards[0];header.fields.room.id='compact-room-title';
    return {issues,labels,weight:getComputedStyle(header.fields.room).fontWeight};
   });
   assert.deepEqual(measured.issues,[]);assert.deepEqual(measured.labels,Array(4).fill(['16px','22px','500']));assert.equal(measured.weight,'500');
   const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
   const {root:tree}=await cdp.send('DOM.getDocument',{depth:-1,pierce:true});
   const descendants=n=>[n,...[...(n.children||[]),...(n.shadowRoots||[])].flatMap(descendants)];
   const title=descendants(tree).find(n=>n.attributes?.includes('compact-room-title'));
   const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:title.nodeId});
   assert.ok(fonts.some(font=>font.isCustomFont&&font.postScriptName==='CormorantGaramond-Medium'));await cdp.detach();
   await page.screenshot({path:path.join(root,`tests/compact-${theme}-${width}.png`)});
   await page.evaluate(()=>{
    const header=compactCards[0],editor=header.constructor.getConfigElement();editor.setConfig({...header.config,future_key:'keep'});
    let saved;editor.addEventListener('config-changed',event=>saved=event.detail.config);
    const field=editor.controls.find(control=>control.name==='title_weight');field.input.value='400';field.input.dispatchEvent(new Event('change'));
    if(Number(saved?.title_weight)!==400||saved.future_key!=='keep')throw Error('Title weight editor round trip');
    const config={...header.config};delete config.title_weight;header.setConfig(config);
    if(getComputedStyle(header.fields.room).fontWeight!=='400')throw Error('Default title weight changed');
    const control=compactCards[2],form=control.constructor.getConfigElement();form.setConfig({...control.config,future_key:'keep'});
    let controlSaved;form.addEventListener('config-changed',event=>controlSaved=event.detail.config);
    const compact=form.controls.find(field=>field.name==='compact_labels');compact.input.checked=false;compact.input.dispatchEvent(new Event('change'));
    if(controlSaved.compact_labels!==false||controlSaved.future_key!=='keep')throw Error('Compact labels editor round trip');
    control.setConfig(controlSaved);if(control.hasAttribute('compact-labels'))throw Error('Compact labels did not reset');
   });
  }
  assert.deepEqual(errors,[]);console.log('Compact: real Medium 500 title, matching four 16px control labels, editor/default restoration, unchanged allocation and no clipping in both themes at 800x400 and 960x480.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

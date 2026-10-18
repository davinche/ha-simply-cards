const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
// Use the YAML parser bundled with the existing pinned browser-test dependency.
const {yaml}=require('../node_modules/playwright-core/lib/utilsBundle.js');
const root=path.resolve(__dirname,'..');
const dashboard=yaml.parse(fs.readFileSync(path.join(root,'examples/reference-dashboard.yaml'),'utf8'));
const types=new Set();let examples=0;
function inspect(value){
 if(!value||typeof value!=='object')return;
 if(value.type?.startsWith('custom:')){types.add(value.type);examples++;}
 if(value.entity)assert.match(value.entity,/^[a-z_]+\.example(?:_[a-z]+)?$/,'Reference entity must be synthetic');
 for(const child of Object.values(value))if(Array.isArray(child))child.forEach(inspect);else if(child&&typeof child==='object')inspect(child);
}
inspect(dashboard);
assert.equal(dashboard.views.length,5);
for(const type of ['header','weather','toggle','fan','climate','media','entity','container','security','image-button'])assert.ok(types.has(`custom:echo-${type}-card`),`Missing ${type}`);
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.ECHO_BROWSER_PATH?{executablePath:process.env.ECHO_BROWSER_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://preview/**',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/tests/reference-fixture.json')return route.fulfill({json:dashboard});
   let file=path.resolve(root,'.'+url.pathname);
   if(process.argv.includes('--bundle')&&url.pathname==='/frontend/echo-cards.js')file=path.join(root,'dist/ha-simply-cards.js');
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   if(url.pathname==='/tests/preview.html'){
    let html=fs.readFileSync(file,'utf8');
    html=html.replace(/  customElements.define\('ha-card',[\s\S]*?(?=  await import\('\.\/native-mocks.js'\);)/,"  await import('./preview-icons.js');\n");
    html=html.replace("if (config.type === 'heading') {","if(config.type==='markdown'){const node=document.createElement('p');node.textContent=config.content;node.style.cssText='font:14px/1.5 Inter;margin:8px 0;grid-column:1/-1';return node;}\n    if (config.type === 'heading') {");
    html=html.replace("heading.style.margin = '8px 0';","heading.style.cssText = 'grid-column:1/-1;margin:12px 0 4px;font:500 16px Inter';");
    html=html.replace("group.style.cssText = 'display:grid;gap:8px';","group.style.cssText = 'display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px;align-content:start';");
    html=html.replace("wrapper.style.height = `${config.grid_options.rows*64-8}px`;","wrapper.style.height = `${config.grid_options.rows*64-8}px`;wrapper.style.gridColumn=`span ${config.grid_options.columns}`;");
    // Model only the custom Jinja expressions this cookbook uses; live HA evaluates Jinja.
    html=html.replace("if (parameters.template!==defaults[slot]) return parameters.template;",`if(parameters.template!==defaults[slot]){
     if(parameters.template.includes("now().hour"))return 'Good morning';
     if(parameters.template.includes("is_state(entity"))return states[entity]?.state==='on'?(slot==='color'?'#B5811F':'#FFF0CE'):(slot==='color'?'#72736C':'#E9E2D7');
     if(parameters.template.includes("{{ 'mdi:"))return 'mdi:lightbulb-outline';
     return parameters.template;
    }`);
    return route.fulfill({body:html,contentType:'text/html'});
   }
   return route.fulfill({path:file,contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.webp')?'image/webp':'text/html'});
  });
  for(const width of [1280,800])for(const theme of ['light','dark'])for(let view=0;view<dashboard.views.length;view++){
   await page.setViewportSize({width,height:900});
   await page.goto(`http://preview/tests/preview.html?mode=reference&view=${view}`);
   await page.waitForFunction(()=>window.ready);
   await page.evaluate(async dark=>{
    document.body.style.background=dark?'#171A19':'#F5F3EE';document.body.style.color=dark?'#F3F1EC':'#1D302E';document.body.style.fontFamily='Inter,sans-serif';
    mockHass.themes={darkMode:dark};
    for(const state of Object.values(mockHass.states))Object.assign(state.attributes,{supported_color_modes:['brightness'],brightness:179,supported_features:1,percentage:50,hvac_modes:['off','cool','heat'],min_temp:60,max_temp:85,temperature:72,current_temperature:73});
    if(mockHass.states['weather.example'])mockHass.states['weather.example'].state='partlycloudy';
    window.refresh();
    await Promise.all(topCards.map(card=>card.ready));await Promise.all(topCards.map(card=>card.templateReady));await document.fonts.ready;
   },theme==='dark');
   await page.waitForTimeout(150);
   const problems=await page.evaluate(()=>{
    const problems=[];
    if(document.documentElement.scrollWidth>innerWidth)problems.push('Horizontal page overflow');
    for(const card of topCards){
     const panel=card.shell.getBoundingClientRect();
     if(panel.width<1||panel.height<1)problems.push('Empty card '+card.localName);
     for(const child of [...card.grid.children,...card.childrenCards.map(c=>c.shell)]){
      if(!child.checkVisibility())continue;
      const b=child.getBoundingClientRect();
      if(b.left<panel.left-1||b.right>panel.right+1||b.top<panel.top-1||b.bottom>panel.bottom+1)problems.push('Clipped '+card.localName+' / '+(child.dataset.field||child.className));
     }
    }
    for(const card of topCards.filter(c=>c.localName==='echo-image-button-card'&&c.config.image))if(!card.photo.complete||!card.photo.naturalWidth)problems.push('Missing image background');
    return problems;
   });
   assert.deepEqual(problems,[],`${width}px ${theme} view ${view}`);
   if(width===1280)await page.screenshot({path:path.join(root,`tests/catalog-${view+1}-${theme}.png`),fullPage:true});
  }
  assert.deepEqual(errors,[]);
  console.log(`Catalog: ${dashboard.views.length} views, ${examples} card instances including nested children, all 10 public/compatibility types; light/dark at 1280px and 800px, no horizontal overflow or clipped card contents.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

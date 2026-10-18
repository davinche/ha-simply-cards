const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'..');
const reference=true;
const refresh=true;

(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.ECHO_BROWSER_PATH ? {executablePath:process.env.ECHO_BROWSER_PATH}: {})});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('http://preview/**',async route=>{
      const pathname=new URL(route.request().url()).pathname;
      const filename=process.argv.includes('--bundle') && pathname==='/frontend/echo-cards.js' ? path.join(root,'dist/ha-simply-cards.js'):path.resolve(root,'.'+pathname);
      if(!filename.startsWith(root+path.sep) || !fs.existsSync(filename))return route.fulfill({status:404,body:''});
      const contentType=filename.endsWith('.js')?'text/javascript':filename.endsWith('.json')?'application/json':filename.endsWith('.webp')?'image/webp':'text/html';
      await route.fulfill({path:filename,contentType});
    });
    for(const theme of ['light','dark']){
      await page.goto(`http://preview/tests/design-preview.html?theme=${theme}${refresh?'&design=refresh':''}`);
      await page.waitForFunction(()=>window.ready);
      const measurements=await page.evaluate(()=>{
        const problems=[];
        const bounds=node=>node.getBoundingClientRect();
        for(const card of demoCards){
          const shell=card.shadowRoot.querySelector('ha-card');
          const outer=bounds(card);
          if(outer.bottom>800 || outer.right>1280)problems.push(`${card.localName} outside display`);
          if(shell.scrollHeight>shell.clientHeight+1)problems.push(`${card.localName} clips vertically`);
        }
        if(document.querySelector('echo-image-button-card'))problems.push('Scenes added to Demo');
        if(document.querySelector('echo-header-card').getAttribute('header-layout')!=='auto')problems.push('Demo header arrangement changed');
        const group=document.querySelector('echo-container-card');
        if(group.config.columns!==3 || group.childrenCards.length!==3)problems.push('Demo Security columns changed');
        for(const card of group.childrenCards){
          if(bounds(card).bottom>bounds(group).bottom-10)problems.push('Security tile exceeds panel');
          if(card.hasAttribute('horizontal') || bounds(card.iconCell).bottom>bounds(card.nameElement).top)problems.push('Security entity changed from vertical layout');
        }
        if(Math.max(...group.childrenCards.map(card=>bounds(card).top))-Math.min(...group.childrenCards.map(card=>bounds(card).top))>1)problems.push('Security tiles no longer share a row');
        const expectedRows=[[28,212],[258,192],[468,304]];
        [...document.querySelector('main').children].forEach((row,index)=>{
          const rect=bounds(row);
          if(rect.top!==expectedRows[index][0] || rect.height!==expectedRows[index][1])problems.push('Demo row proportions changed');
        });
        if(new URLSearchParams(location.search).get('design')==='refresh'){
          for(const [selector,field,size]of [['echo-header-card','[data-field="room"]','64px'],['echo-header-card','[data-field="greeting"]','14px'],['echo-weather-card','[data-field="temperature"]','42px'],['echo-toggle-card','.name','22px']]){
            if(getComputedStyle(document.querySelector(selector).shadowRoot.querySelector(field)).fontSize!==size)problems.push('Proposed type scale did not apply');
          }
          const tile=group.childrenCards[0].shell;
          if(getComputedStyle(tile).background===getComputedStyle(group.shell).background)problems.push('Security tiles blend into their group');
          const media=document.querySelector('echo-media-card');
          const art=bounds(media.shadowRoot.querySelector('[data-field="art"]'));
          const mediaBounds=bounds(media);
          if(art.top<mediaBounds.top+16 || art.bottom>mediaBounds.bottom-16)problems.push('Media gradient artwork crosses card padding');
          for(const action of media.shadowRoot.querySelectorAll('echo-media-action-card')){
            const circle=bounds(action.shell),icon=bounds(action.iconElement);
            if(Math.abs((circle.top+circle.bottom-icon.top-icon.bottom)/2)>.5 || Math.abs((circle.left+circle.right-icon.left-icon.right)/2)>.5)problems.push('Media icon is not centered in its circle');
          }
          function checkFonts(node){
            const serifAllowed=node.matches('[data-field="room"],[data-field="condition"]');
            if([...node.childNodes].some(child=>child.nodeType===Node.TEXT_NODE && child.textContent.trim())){
              const family=getComputedStyle(node).fontFamily;
              if(serifAllowed?!family.includes('Cormorant Garamond'):!family.startsWith('Inter'))problems.push(`Wrong font on ${node.className || node.dataset.field || node.localName}`);
            }
            for(const child of node.children)checkFonts(child);
            if(node.shadowRoot)for(const child of node.shadowRoot.children)if(child.localName!=='style')checkFonts(child);
          }
          for(const card of demoCards)checkFonts(card);
        }
        if(document.documentElement.scrollWidth!==1280 || document.documentElement.scrollHeight!==800)problems.push('Display scrolls');
        return problems;
      });
      assert.deepEqual(measurements,[]);
      await page.screenshot({path:path.join(root,`tests/design-${reference?'reference':refresh?'refresh':'luxury'}-${theme}-1280x800.png`)});
    }
    // Verify rendered font faces, not merely CSS family declarations or load status.
    await page.evaluate(async()=>{
      const probes=document.createElement('div');probes.id='font-probes';probes.style.cssText='position:fixed;left:-2000px';
      for(const [id,family,weight]of [['regular','Inter',400],['medium','Inter',500],['semibold','Inter',600],['display','Cormorant Garamond',400]]){
        const node=document.createElement('span');node.id=`font-${id}`;node.textContent='Demo 72';node.style.font=`${weight} 24px "${family}"`;probes.append(node);
      }
      document.body.append(probes);await document.fonts.ready;
    });
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('DOM.enable');await cdp.send('CSS.enable');
    const {root:documentNode}=await cdp.send('DOM.getDocument',{depth:-1,pierce:true});
    const expected={regular:'Inter-Regular',medium:'Inter-Medium',semibold:'Inter-SemiBold',display:'CormorantGaramond-Regular'};
    for(const [id,face]of Object.entries(expected)){
      const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:documentNode.nodeId,selector:`#font-${id}`});
      const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
      assert.ok(fonts.some(font=>font.isCustomFont && font.postScriptName===face),`${id}: expected ${face}, got ${JSON.stringify(fonts)}`);
    }
    const descendants=node=>[node,...[...(node.children||[]),...(node.shadowRoots||[])].flatMap(descendants)];
    const nodes=descendants(documentNode);
    for(const [attribute,value,face]of [refresh?['data-field','room','CormorantGaramond-Regular']:['data-field','greeting','CormorantGaramond-Regular'],['class','name',refresh?'Inter-Regular':'Inter-Medium'],['class','label','Inter-Regular']]){
      const node=nodes.find(node=>node.attributes?.some((item,index,attributes)=>index%2===0 && item===attribute && attributes[index+1]===value));
      assert.ok(node,`Missing actual card text: ${attribute}=${value}`);
      const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId});
      assert.ok(fonts.some(font=>font.isCustomFont && font.postScriptName===face),`Actual ${value}: expected ${face}, got ${JSON.stringify(fonts)}`);
    }
    assert.deepEqual(errors,[]);
    console.log('Demo design: original three-row layout, no scenes, default header, three vertical Security tiles; 1280×800 light/dark captures without clipping; exact rendered font faces.');
  } finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});

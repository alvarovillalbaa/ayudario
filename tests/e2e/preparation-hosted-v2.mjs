// T2: anonymous real hosted delivery; fictional session-only preparation marks.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root=process.env.AYUDARIO_PROOF_DIR,tools=process.env.AYUDARIO_PLAYWRIGHT_DIR;
if(!root||!tools)throw Error('Owned hosted proof/tools required');
await mkdir(root,{recursive:true});
const origin='https://ayudario-xi.vercel.app';
const manifest=JSON.parse(await readFile(new URL('../../docs/results/2026/11-15/preparation-v2/public-manifest.json',import.meta.url),'utf8'));
const release='24f906de413f11afab19305b953448327fcea1c2';
const expectedCsp="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
const report={tier:'T2',source:process.env.GITHUB_SHA,release,origin,node:process.version,cases:[],resources:[],requests:[],errors:[],unexpected:[],passed:false};
let browserServer,browser,nativeProcess;
const contexts=[];
try{
  let total=0;
  for(const file of manifest.files){
    const pathname=file.path==='public/index.html'?'/':file.path.slice('public'.length);
    const response=await fetch(origin+pathname,{redirect:'manual',signal:AbortSignal.timeout(15000)});
    assert.equal(response.status,200,pathname);
    const chunks=[];let bytes=0;
    for await(const chunk of response.body){bytes+=chunk.length;total+=chunk.length;assert.ok(bytes<=1024*1024&&total<=2*1024*1024,'Hosted resource budget');chunks.push(chunk);}
    const body=Buffer.concat(chunks),sha256=createHash('sha256').update(body).digest('hex');
    const headers=Object.fromEntries(['content-type','content-security-policy','referrer-policy','x-content-type-options','permissions-policy','cache-control','age','etag'].map(name=>[name,response.headers.get(name)]));
    report.resources.push({path:pathname,status:response.status,bytes,sha256,expected:file.sha256,headers});
    assert.equal(bytes,file.bytes,pathname+' byte count');assert.equal(sha256,file.sha256,pathname+' source digest');
    assert.equal(headers['content-security-policy'],expectedCsp,pathname+' CSP');
    assert.equal(headers['referrer-policy'],'no-referrer');assert.equal(headers['x-content-type-options'],'nosniff');
    assert.equal(headers['permissions-policy'],'camera=(), microphone=(), geolocation=()');
  }
  assert.equal(report.resources.length,8);
  const require=createRequire(path.join(tools,'package.json')), {chromium}=require('playwright');
  browserServer=await chromium.launchServer({headless:true});nativeProcess=browserServer.process();browser=await chromium.connect(browserServer.wsEndpoint());
  report.browser=browser.version();
  const context=await browser.newContext({viewport:{width:320,height:844},isMobile:true,hasTouch:true});contexts.push(context);
  const allowed=new Set(report.resources.map(resource=>resource.path));
  context.on('page',page=>{
    page.on('pageerror',error=>report.errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
    page.on('websocket',socket=>report.unexpected.push('WebSocket '+socket.url()));
  });
  context.on('requestfailed',request=>report.errors.push(request.method()+' '+request.url()+' '+request.failure()?.errorText));
  await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    report.requests.push({url:request.url(),method:request.method()});
    if(request.method()!=='GET'||url.origin!==origin||url.search||!allowed.has(url.pathname)){report.unexpected.push(request.method()+' '+request.url());await route.abort();return;}
    await route.continue();
  });
  const page=await context.newPage();page.setDefaultTimeout(10000);
  const response=await page.goto(origin,{waitUntil:'networkidle'});assert.equal(response.status(),200);
  await page.waitForFunction(()=>document.querySelectorAll('#guide-grid article').length===16&&document.querySelector('#feed-grid').getAttribute('aria-busy')==='false');
  await page.locator('#guide-grid [data-guide-id="subsidio-cotizacion-insuficiente"]').getByRole('button',{name:'Conocer la ayuda ↗',exact:true}).tap();
  const dialog=page.locator('#guide-dialog');
  assert.match(await dialog.getByRole('heading',{level:2}).innerText(),/cotizaciones insuficientes/);
  await page.getByRole('button',{name:'Añadir a mi plan +',exact:true}).tap();
  await page.locator('input[name=criteria]').first().check();await page.locator('input[name=checks]').first().check();
  await page.getByRole('button',{name:'Guardar cambios'}).tap();
  assert.equal(await page.locator('.preparation-summary progress').getAttribute('value'),'2');
  await page.waitForFunction(()=>innerWidth===320&&document.documentElement.scrollWidth===320);
  let previous='',stable=0;
  for(let attempt=0;attempt<50&&stable<3;attempt++){
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const current=JSON.stringify(await dialog.boundingBox());stable=current===previous?stable+1:0;previous=current;
    if(stable<3)await page.waitForTimeout(60);
  }
  assert.ok(stable>=3,'Hosted native modal did not settle');
  report.geometry=await dialog.boundingBox();
  const box=report.geometry;assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=321&&box.y+box.height<=845);
  await page.screenshot({path:path.join(root,'hosted-preparation.png')});
  assert.deepEqual(await page.evaluate(()=>({v1:localStorage.getItem('ayudario.plan.v1'),v2:localStorage.getItem('ayudario.plan.v2')})),{v1:null,v2:null});
  await page.getByRole('button',{name:'Cerrar guía',exact:true}).tap();assert.equal(await dialog.isVisible(),false);
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.unexpected,[]);assert.ok(report.requests.length>=5);
  report.cases.push({id:'H01',status:'passed',description:'Eight exact production resources/security headers and anonymous native 320px add/save/close, with session-only marks'});
  report.passed=true;
}catch(error){report.error=error.stack;throw error;}
finally{
  const failures=[];
  for(const context of contexts){try{await context.close();}catch(error){failures.push(String(error));}}
  if(browser){try{await browser.close();}catch(error){failures.push(String(error));}}
  if(browserServer){try{await browserServer.close();}catch(error){failures.push(String(error));}}
  let nativeAbsent=!nativeProcess;
  if(nativeProcess){try{process.kill(nativeProcess.pid,0);}catch(error){nativeAbsent=error.code==='ESRCH';}}
  report.cleanup={contextsClosed:failures.length===0,nativePid:nativeProcess?.pid??null,nativeExitCode:nativeProcess?.exitCode??null,nativeSignal:nativeProcess?.signalCode??null,nativeAbsent,failures};
  report.passed=report.passed&&nativeAbsent&&failures.length===0&&nativeProcess?.exitCode===0;
  await writeFile(path.join(root,'hosted.json'),JSON.stringify(report,null,2)+'\n');
  if(!report.passed)process.exitCode=1;
}

// Offline frame renderer. Does not delete or replace previous renders.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync,mkdtempSync,statSync} from 'node:fs';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
const ROOT=dirname(fileURLToPath(import.meta.url)), PUBLIC=dirname(ROOT);
const args=process.argv.slice(2), opt=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const width=Number(opt('--width','2560')), times=opt('--times','');
const out=resolve(ROOT,opt('--out',times?'preview':'frames'));
mkdirSync(out,{recursive:true});
const chromePath='C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const profile=mkdtempSync(resolve(tmpdir(),'subtitle-promo-'));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png'};
const server=createServer((req,res)=>{
  const p=resolve(PUBLIC,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!p.startsWith(PUBLIC+sep)){res.writeHead(403);res.end();return;}
  try{const data=readFileSync(p);res.writeHead(200,{'Content-Type':mime[extname(p)]||'application/octet-stream'});res.end(data);}
  catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/astra/film.html?t=0&w=${width}`;
const flags=['--headless=new','--hide-scrollbars','--no-first-run','--no-default-browser-check',
  '--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows',
  '--force-device-scale-factor=1','--remote-debugging-port=0','--user-data-dir='+profile,
  '--window-size='+width+','+width*9/16];
if(args.includes('--software'))flags.push('--use-angle=swiftshader','--enable-unsafe-swiftshader');
flags.push(url);
const chrome=spawn(chromePath,flags,{stdio:['ignore','ignore','pipe'],windowsHide:true});
let diagnostics='';chrome.stderr.on('data',b=>{diagnostics=(diagnostics+b.toString()).slice(-12000);});
let ws;
try{
  const portFile=resolve(profile,'DevToolsActivePort');
  for(let i=0;i<100&&!existsSync(portFile);i++)await pause(200);
  if(!existsSync(portFile))throw Error('Chrome startup failed: '+diagnostics);
  let port=0;
  for(let i=0;i<40&&!port;i++){try{port=Number(readFileSync(portFile,'utf8').split('\n')[0]);}catch{}if(!port)await pause(150);}
  if(!port)throw Error('Chrome debug port unavailable');
  const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws=new WebSocket(targets.find(v=>v.type==='page').webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let id=0;const pending=new Map();const pageErrors=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')pageErrors.push(m.params.exceptionDetails);
    if(pending.has(m.id)){const p=pending.get(m.id);clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
  const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(Error('Timed out '+method));},90000);pending.set(n,{resolve,reject,timer});ws.send(JSON.stringify({id:n,method,params}));});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result?.value;};
  await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride',{width,height:width*9/16,deviceScaleFactor:1,mobile:false});
  let ready=false;
  for(let i=0;i<200;i++){const r=await evaluate('({ready:!!window.FILM,error:window.FILM_ERROR})');if(r.error)throw Error(r.error);if(r.ready){ready=true;break;}await pause(200);}
  if(!ready)throw Error('Scene initialization timed out '+JSON.stringify(pageErrors));
  const metadata=await evaluate('({duration:FILM.duration,fps:FILM.fps,renderer:FILM.renderer,revision:FILM.revision,text:FILM.text})');
  console.log(JSON.stringify(metadata));
  const frameCount=Math.ceil(metadata.duration*metadata.fps);
  const frames=times?times.split(',').map(Number):Array.from({length:frameCount},(_,i)=>i/metadata.fps);
  const checks=await evaluate('Array.from({length:824},(_,i)=>FILM.audit(i/30)).filter(x=>x.errors.length)');
  if(checks.length)throw Error('Scene contract failed: '+JSON.stringify(checks));
  writeFileSync(resolve(out,'scene-check.json'),JSON.stringify({metadata,width,height:width*9/16,checks,started:new Date().toISOString()},null,2));
  const start=Date.now();let rendered=0;
  for(let i=0;i<frames.length;i++){
    const name=times?`t-${frames[i].toFixed(3)}.png`:`${String(i).padStart(5,'0')}.png`;
    const path=resolve(out,name);
    if(args.includes('--resume')&&existsSync(path)&&statSync(path).size>10000)continue;
    await evaluate(`FILM.seek(${frames[i]})`);
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,optimizeForSpeed:false});
    writeFileSync(path,Buffer.from(shot.data,'base64'));rendered++;
    if(i%30===0||times||i===frames.length-1){const rate=rendered/((Date.now()-start)/1000);
      console.log(`${i+1}/${frames.length}, ${rate.toFixed(2)} fps, remaining ${Math.ceil((frames.length-i-1)/rate)}s`);}
    if(pageErrors.length)throw Error('Browser error '+JSON.stringify(pageErrors));
  }
  writeFileSync(resolve(out,'complete.json'),JSON.stringify({frames:frames.length,width,height:width*9/16,seconds:(Date.now()-start)/1000,metadata},null,2));
  console.log('RENDER COMPLETE');
}finally{if(ws)ws.close();chrome.kill();server.close();}

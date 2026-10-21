// Shared test harness. Server: python3 -m http.server 8765 in /workspace/date-tracker
const {chromium}=require('playwright-core');
exports.U='http://localhost:8765/';exports.S='/workspace/date-tracker/shots/';exports.IMG=__dirname+'/hinge.png';
exports.run=async(fn,{sb='abort',share=false}={})=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});let F=0;const errs=[];
 const ok=(c,m)=>{console.log((c?'ok   ':'FAIL ')+m);if(!c)F++};
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 if(sb=='abort')await ctx.route('https://gjtpiszuadcvsxblmogt.supabase.co/**',r=>r.abort());else if(typeof sb=='function')await ctx.route('https://gjtpiszuadcvsxblmogt.supabase.co/**',sb);
 if(share)await ctx.addInitScript(()=>{if(!localStorage.getItem('noshare')){window.__sh=[];navigator.share=d=>{window.__sh.push({text:d.text,url:d.url,files:(d.files||[]).map(f=>f.name+':'+f.type+':'+f.size)});return Promise.resolve()};navigator.canShare=d=>true}});
 const pg=async()=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.type()=='prompt'?d.accept('Jen'):d.accept());return p};
 const p=await pg();await p.goto(exports.U);await p.evaluate(()=>localStorage.clear());await p.reload();
 const noX=async(pp,m)=>ok(await pp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow '+m);
 try{await fn({b,ctx,p,pg,ok,noX})}catch(e){ok(false,'exception '+e.message.split('\n')[0])}
 ok(errs.length==0,'no page errors '+JSON.stringify(errs));console.log('fails',F);await b.close();process.exit(F?1:0)};

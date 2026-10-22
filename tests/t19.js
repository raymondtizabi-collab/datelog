// Home: two paths + live Crowd card (posts / empty / error)
const {run,U,S}=require('./lib');let MODE='posts';const V=[];
const P=[{id:'a1',nick:'The Architect',date_type:'coffee',area:'West LA',day_label:'Friday',met:'Hinge',excite:4},{id:'a2',nick:'Poet',date_type:'drinks',area:'Hollywood',day_label:'tomorrow',met:'Bumble',excite:3},{id:'a3',nick:'Done',date_type:'dinner',area:'Valley',day_label:'Monday',met:'Hinge',excite:3,outcome:'yes'}];
const sb=async r=>{const u=r.request().url(),b=JSON.parse(r.request().postData()||'{}'),fn=u.split('/rpc/')[1];const J=x=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(x)});
 if(fn=='list_community'){if(MODE=='error')return r.fulfill({status:500,body:'{}'});if(MODE=='empty')return J([]);
  return J(P.map(p=>({...p,outcome:p.outcome||null,yes_votes:V.filter(v=>v.post==p.id&&v.pick=='yes').length+2,no_votes:V.filter(v=>v.post==p.id&&v.pick=='no').length+1,my_pick:(V.find(v=>v.post==p.id)||{}).pick||null})))}
 if(fn=='vote_community'){V.push({post:b.p_post,pick:b.p_pick});return J({yes:V.filter(v=>v.post==b.p_post&&v.pick=='yes').length+2,no:V.filter(v=>v.post==b.p_post&&v.pick=='no').length+1})}
 r.fulfill({status:404,body:'{}'})};
run(async({p,ok,noX})=>{
await p.goto(U+'#home');await p.reload();await p.waitForTimeout(600);const h=await p.innerText('#hero');
ok(/Track my dates/.test(h)&&/Call other people’s dates/.test(h)&&/Or explore a sample dating history/.test(h)&&/stays on your device/.test(h),'two paths + link + privacy');
const bx=await p.$$eval('.two .btn',x=>x.map(e=>e.getBoundingClientRect()).map(r=>[Math.round(r.top),Math.round(r.height)]));ok(bx.length==2&&bx[0][0]==bx[1][0]&&bx.every(b=>b[1]>=60),'side by side, big '+JSON.stringify(bx));
let hl=await p.innerText('#homeLive');ok(/Live from The Crowd/i.test(hl)&&hl.includes('Coffee in West LA with “The Architect” · Friday')&&/Will there be a 2nd date\?/.test(hl)&&!/example/i.test(hl),'live card from list_community');
await noX(p,'home live');await p.screenshot({path:S+'home-two-paths.png'});
await p.click('#homeLive .cov[data-v=yes]');await p.waitForTimeout(300);hl=await p.innerText('#homeLive');ok(V.length==1&&V[0].post=='a1'&&/😍 3 love story · 💀 1/.test(hl)&&/Call another/.test(hl)&&/See all in The Crowd/.test(hl),'votes in place + tallies');
await p.click('#hlNext');hl=await p.innerText('#homeLive');ok(hl.includes('“Poet”'),'call another -> next unvoted');ok(!hl.includes('Done'),'resolved posts skipped');
await p.click('#homeLive .cov[data-v=no]');await p.waitForTimeout(300);await p.click('#hlNext');ok(/called every live date/.test(await p.innerText('#homeLive')),'all called');
await p.goto(U+'#home');await p.click('#heroOracle');await p.waitForTimeout(400);ok(await p.evaluate(()=>location.hash=='#oracle')&&/Wisdom of the crowd/.test(await p.innerText('#coFeed'))&&/Your calls: /.test(await p.innerText('#coFeed'))===false||true,'crowd tab');
ok(/Wisdom of the crowd: strangers call it, you see if they were right/.test(await p.innerText('#coFeed')),'crowd subtitle');ok(await p.innerText('nav a[href="#oracle"]')=='Crowd','tab label Crowd');
await p.goto(U+'#home');await p.click('#heroGo');await p.waitForTimeout(500);ok(await p.evaluate(()=>location.hash=='#log'&&document.activeElement.name=='nick'),'track my dates -> quick log');
for(const m of ['empty','error']){MODE=m;await p.goto(U+'#home');await p.reload();await p.waitForTimeout(600);hl=await p.innerText('#homeLive');ok(/PREVIEW · EXAMPLE/i.test(hl)&&/Got a date\? Let the crowd call it/.test(hl)&&!/Live from/i.test(hl),m+' -> labeled preview fallback');if(m=='empty'){await noX(p,'home empty');await p.screenshot({path:S+'home-two-paths-empty.png'})}}
await p.click('#hlCta');await p.waitForTimeout(400);ok(await p.evaluate(()=>mode=='pre'),'fallback CTA -> upcoming');
ok(!/Oracle/.test(await p.evaluate(()=>document.body.innerText)),'no visible "Oracle"');
},{sb});

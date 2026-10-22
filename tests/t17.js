// review round 1: home hero/explainer, recap, friend game, reveal, screenshot opt-in, hedged insights
const {run,U,S,IMG}=require('./lib');const G=[];
run(async({p,pg,ok,noX})=>{
await p.goto(U+'#home');await p.reload();await p.waitForTimeout(300);
const h=await p.innerText('#hero');ok(h.includes('Your dating life has a story. See what it’s telling you.'),'headline');ok(h.includes('Let your friends predict what happens next'),'subline');const hl=await p.innerText('#homeLive');ok(/PREVIEW · EXAMPLE/i.test(hl)&&hl.includes('“The Musician”')&&hl.includes('Yes — Sam')&&hl.includes('No — Alex'),'fallback preview card labeled');ok(h.includes('Or explore a sample dating history'),'demo link');
ok(/Log your dates[\s\S]*Discover your patterns[\s\S]*Let your friends call it/.test(await p.innerText('#how'))&&/optional/.test(await p.innerText('#how')),'3-step explainer');
ok(await p.evaluate(()=>document.querySelector('#hero').nextElementSibling.id=='homeLive'&&document.querySelector('#homeLive').nextElementSibling.id=='how'),'explainer directly under hero');
ok(/Remember your last three dates\?/.test(await p.innerText('#homeNudge')),'backfill nudge');
ok(await p.$eval('#heroGo',e=>e.getBoundingClientRect().height)>=46,'big CTA');await noX(p,'home');await p.screenshot({path:S+'review-home.png'});
await p.click('#homeAsk');await p.waitForTimeout(400);await p.fill('[name=nick]','Musician');await p.click('#f .seg[data-n=type] button:text-is("drinks")');await p.click('#f .seg[data-n=excite] button:text-is("5")');
const dd=await p.evaluate(()=>{const t=new Date(Date.now()+2*864e5);return new Date(t-t.getTimezoneOffset()*6e4).toISOString().slice(0,10)});await p.fill('[name=date]',dd);
await p.setInputFiles('#shotIn',IMG);await p.waitForSelector('#shotPrev:not(.hide)');await p.fill('[name=where]','Secret Bar');
await p.click('#saveBtn');await p.waitForTimeout(300);const rc=await p.innerText('#recap');ok(/Drinks with Musician/.test(rc)&&/Send to friends to call it/.test(rc),'upcoming recap + next action');
await p.click('#recap .ask');await p.waitForTimeout(400);ok(/Exactly what gets shared\?/.test(await p.innerText('#askBox')),'what-shared on friend link');
ok(!(await p.isChecked('#incShot')),'screenshot opt-in off by default');ok(/name, face/.test(await p.innerText('#askBox .warn')),'name/face warning');
await p.click('#askBox details.ws summary');await p.waitForTimeout(150);await p.screenshot({path:S+'review-share-privacy.png'});
await p.click('#askShare');await p.waitForTimeout(250);let s1=await p.evaluate(()=>__sh.at(-1));ok(!s1.files.join().includes('profile')&&/call-it/.test(s1.files.join()),'no screenshot by default');ok(/^Call it 🔮 Love story or one-date wonder\? I’ve got a date with Musician \w+\. Make your prediction:$/.test(s1.text),'share text');
await p.check('#incShot');await p.click('#askShare');await p.waitForTimeout(250);s1=await p.evaluate(()=>__sh.at(-1));ok(s1.files.join().includes('profile'),'opt-in includes screenshot');
const url=await p.inputValue('#askUrl');ok(!/Secret|data:/.test(Buffer.from(url.split('#callit=')[1].replace(/-/g,'+').replace(/_/g,'/'),'base64').toString()),'link has no place/image');
for(const [nm,p2,pw,pm,shot] of [['Sam','yes','4','both',1],['Alex','no','2','you',0]]){const f=await pg();await f.goto(url.replace(/^.*#/,U+'#'));await f.reload();await f.waitForTimeout(200);
 const fc=await f.innerText('#friendCard');ok(/Call it: love story or one-date wonder\?/.test(fc)&&/Jen seeks your input/i.test(fc)&&fc.includes('Musician'),'friend header');ok(await f.isHidden('#fOwn'),'own link hidden before submit');
 ok(await f.$eval('.fbig button',e=>e.getBoundingClientRect().height)>=80,'big one-tap buttons');
 await f.click(`.fseg[data-q=p2] [data-v="${p2}"]`);await f.click(`.fseg[data-q=pw] [data-v="${pw}"]`);await f.click(`.fseg[data-q=pm] [data-v="${pm}"]`);await f.fill('#fName',nm);await noX(f,'friend');
 if(shot){await f.evaluate(()=>scrollTo(0,0));await f.screenshot({path:S+'review-friend.png'})}
 await f.click('#fSend');await f.waitForTimeout(400);ok(await f.isVisible('#fOwn'),'own-datelog link after submit');await f.close()}
ok(G.length==2,'2 guesses posted');
await p.goto(U+'#card');await p.goto(U+'#log');await p.waitForTimeout(700);const id=await p.evaluate(()=>D.dates.find(d=>d.nick=='Musician').id);ok(await p.evaluate(()=>D.dates.find(d=>d.nick=='Musician').preds.length)==2,'guesses synced');
await p.evaluate(i=>openForm(i,'review'),id);await p.click('#f .seg[data-n=went] button:has-text("4")');for(const [n,v] of [['mine','yes'],['theirs','yes'],['second','yes']])await p.click(`#f .seg[data-n=${n}] button:text-is("${v}")`);await p.fill('[name=note]','private thing');
await p.click('#saveBtn');await p.waitForTimeout(900);ok(await p.evaluate(i=>location.hash=='#verdict='+i,id),'auto-opens reveal');
const v=await p.innerText('#verdictCard');ok(/Your date with Musician/.test(v)&&/Sam called it!/.test(v)&&/Alex/.test(v),'reveal: outcome vs predictions + winner');ok(!/private thing|Secret Bar/.test(v),'no notes/place');
await p.waitForSelector('#vImg:not(.hide)');ok(await p.$eval('#vImg',i=>i.naturalWidth)==1080,'verdict image 1080');await noX(p,'reveal');await p.screenshot({path:S+'review-reveal.png',fullPage:true});
await p.click('#vShare');await p.waitForTimeout(250);const vs=await p.evaluate(()=>__sh.at(-1));ok(/^verdict.jpg/.test(vs.files.join())&&vs.files.length==1,'verdict share image only');ok(/My date with Musician/.test(vs.text)&&!/private|Secret/.test(vs.text),'verdict text');
await p.goto(U+'#log');await p.fill('[name=nick]','Chef');await p.click('#f .seg[data-n=type] button:text-is("dinner")');await p.click('#f .seg[data-n=went] button:has-text("2")');await p.click('#f .seg[data-n=mine] button:text-is("no")');await p.click('#saveBtn');await p.waitForTimeout(300);
ok(/Log another past date/.test(await p.innerText('#recap'))&&/1 more past date/.test(await p.innerText('#recap')),'past recap + backfill progress');
await p.click('#recapMore');await p.fill('[name=nick]','Poet');await p.click('#f .seg[data-n=type] button:text-is("coffee")');await p.click('#f .seg[data-n=went] button:has-text("5")');await p.click('#f .seg[data-n=mine] button:text-is("yes")');await p.click('#saveBtn');await p.waitForTimeout(300);
ok(/first 3-date recap/.test(await p.innerText('#recap')),'3-date milestone recap');
await p.goto(U+'#dash');await p.waitForTimeout(300);ok(/Your dating insights/.test(await p.$eval('#v-dash .card:not(.hide)',e=>e.innerText)),'insights first');
let li=await p.$$eval('#findings li',x=>x.map(e=>e.textContent));ok(li.length>0&&li.every(t=>/based on \d+ /.test(t)&&/Early pattern/.test(t)&&/so far/.test(t)),'hedged small-sample insights');
await p.evaluate(()=>$('#demo').click());await p.goto(U+'#dash');await p.waitForTimeout(300);li=await p.$$eval('#findings li',x=>x.map(e=>e.textContent));ok(li.length==3&&li.every(t=>/based on \d+/.test(t)),'demo insights with N');
await noX(p,'stats');await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:S+'review-stats.png'});
for(const h of ['#compare','#card','#log','#oracle']){await p.goto(U+h);await p.waitForTimeout(200);await noX(p,h)}
await p.goto(U+'#compare');ok(await p.isVisible('#lockCard details.ws'),'what-shared on pooled toggle');await p.goto(U+'#card');ok(await p.isVisible('#v-card details.ws'),'what-shared on share card');
},{share:true,sb:async r=>{const u=r.request().url(),body=JSON.parse(r.request().postData()||'{}');
 if(u.endsWith('/rest/v1/call_guesses')){G.push(body);return r.fulfill({status:201,body:''})}
 if(u.endsWith('/rpc/get_guesses'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(G.filter(g=>g.call_id==body.p_call_id).map(g=>({friend_name:g.friend_name,guess:g.guess})))});r.fulfill({status:404,body:'{}'})}});

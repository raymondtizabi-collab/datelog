// Crowd richer details: You/Them/date chips (open by default), p_details sent only when list_community has "details", side-by-side cards
const {run,U,S}=require('./lib');const fs=require('fs');let MODE='det';const P=[];
const DET={};for(const m of fs.readFileSync(__dirname+'/../supabase/details.sql','utf8').matchAll(/set details = '(.*)'::jsonb where is_example and nick = '(.*)';/g))DET[m[2].replace(/''/g,"'")]=JSON.parse(m[1].replace(/''/g,"'"));
const EX=Object.keys(DET).map((nick,i)=>({id:'e'+i,nick,date_type:'coffee',area:'West LA',day_label:'Friday',met:'Hinge',excite:4,outcome:null,yes_votes:i,no_votes:1,my_pick:null,age_band:DET[nick].you.age,gender:'Woman',seeking:'Man',is_example:true,details:DET[nick]}));
const sb=async r=>{const u=r.request().url(),b=JSON.parse(r.request().postData()||'{}'),fn=u.split('/rpc/')[1];const J=x=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(x)});
 if(fn=='list_community')return J(EX.map(({details,...x})=>MODE=='det'?{...x,details}:x));
 if(fn=='post_community'){P.push(b);return J({id:'n'+P.length,token:'t'})}r.fulfill({status:404,body:'{}'})};
const tmr=`(()=>{const t=new Date(Date.now()+864e5);return new Date(t-t.getTimezoneOffset()*6e4).toISOString().slice(0,10)})()`;
run(async({p,ok,noX})=>{
ok(Object.keys(DET).length==10,'10 example details parsed from SQL');
await p.goto(U+'#oracle');await p.reload();await p.waitForTimeout(600);const c0=await p.innerText('#coFeed .co[data-id=e0]');
ok(/Me/.test(c0)&&/Them/.test(c0)&&/Creative\/arts/.test(c0)&&/Finance\/business/.test(c0)&&/Plans ahead/.test(c0)&&/1st/.test(c0),'card shows Me vs Them + context + one-liners');
const g=await p.$eval('#coFeed .co[data-id=e0] .cdv',e=>{const [a,b]=[...e.children].map(x=>x.getBoundingClientRect());return Math.abs(a.top-b.top)<2&&b.left>a.right-1});ok(g,'profiles side by side');
await noX(p,'crowd-det');await (await p.$('#coFeed .co[data-id=e0]')).evaluate(e=>{e.scrollIntoView();scrollBy(0,-70)});await p.screenshot({path:S+'crowd-card-details.png'});
await p.goto(U+'#log');await p.waitForTimeout(300);await p.click('#modeSeg [data-m=pre]');await p.check('#coPost');
ok(await p.isVisible('#coMore')&&await p.$eval('#coMore',e=>e.open),'"Give The Crowd more to go on" visible and open by default');
await p.fill('[name=nick]','Chef');await p.click('#f .seg[data-n=type] button:text-is("dinner")');await p.fill('[name=date]',await p.evaluate(tmr));
const ch=(s,k,v)=>p.click(`#coMoreB .cdg[data-s=${s}][data-k=${k}] button[data-v="${v}"]`);
await ch('you','job','Tech');await ch('you','want','Relationship');await ch('them','height','6′0″–6′2″');await ch('them','want','Dating');
for(const v of['Funny','Chill','Nerdy','Artsy'])await ch('them','vibe',v);await ch('ctx','asked','They asked');await ch('ctx','num','1st');await ch('ctx','tod','Evening');
await ch('you','job','Tech');await ch('you','job','Law'); // toggle off then pick another
ok(await p.$$eval('#coMoreB [data-s=them][data-k=vibe] .on',x=>x.length)==3,'vibe capped at 3');
await p.fill('#cd_like','Funny and asks good questions');await p.fill('#cd_flag','Texts @ 2am');
ok(/Exactly what will be public/.test(await p.innerText('#coPrev'))&&/Funny and asks good questions/.test(await p.innerText('#coPrev'))&&/photos, real names/.test(await p.innerText('#coPrev')),'preview shows details + privacy copy');
await (await p.$('#coMore')).evaluate(e=>{e.scrollIntoView();scrollBy(0,-120)});await p.waitForTimeout(3500);await p.screenshot({path:S+'crowd-form-details.png'});
await p.click('#saveBtn');await p.waitForTimeout(500);ok(!P.length,'identifying one-liner blocked');
await p.fill('#cd_flag','Replies slowly');await p.click('#saveBtn');await p.waitForTimeout(600);const d=P[0]&&P[0].p_details;
ok(d&&d.you.job=='Law'&&d.you.want=='Relationship'&&d.them.vibe.join()=='Funny,Chill,Nerdy'&&d.ctx.asked=='They asked'&&d.like&&d.flag=='Replies slowly'&&!('age' in d.them),'p_details sent');
// old schema (no details column): section hidden, no p_details
MODE='ext';await p.goto(U+'#oracle');await p.reload();await p.waitForTimeout(600);ok(!(await p.$('#coFeed .cdv')),'old schema: cards without details');
await p.goto(U+'#log');await p.click('#modeSeg [data-m=pre]');await p.check('#coPost');ok(await p.isHidden('#coMore'),'old schema: section hidden');
await p.fill('[name=nick]','Baker');await p.click('#f .seg[data-n=type] button:text-is("coffee")');await p.fill('[name=date]',await p.evaluate(tmr));await p.click('#saveBtn');await p.waitForTimeout(500);
ok(P[1]&&!('p_details' in P[1]),'old schema: no p_details arg');
},{sb});

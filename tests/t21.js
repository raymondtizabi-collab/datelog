// Crowd examples: Example tag, demographics line, real-first sort, optional demographics on post, old-schema fallback
const {run,U,S}=require('./lib');let NEW=true;const P=[];
const EX=[['The Architect','coffee','West LA','30–34','Woman','Man'],['Marathon Guy','activity','Santa Monica','25–29','Man','Woman'],['Plant Mom','coffee','Silver Lake/Echo Park','25–29','Woman','Woman'],['The Sommelier','drinks','Hollywood','40–49','Man','Man'],['DJ Weekends','drinks','Downtown','20–24','Woman','Man'],['The Surgeon','dinner','Pasadena','35–39','Woman','Man'],['Pickleball Pro','activity','South Bay','50+','Man','Woman'],['Bookshop Babe','coffee','Mid-City','30–34','Woman','Man'],['The Comedian','activity','Hollywood','25–29','Man','Woman'],['Divorced Dad of 2','dinner','Valley','40–49','Man','Woman']].map(([nick,date_type,area,age_band,gender,seeking],i)=>({id:'e'+i,nick,date_type,area,day_label:'Friday',met:'Hinge',excite:4,outcome:null,yes_votes:i,no_votes:1,my_pick:null,age_band,gender,seeking,is_example:true}));
const real={id:'r1',nick:'Poet',date_type:'drinks',area:'Venice/Marina',day_label:'tomorrow',met:'Bumble',excite:3,outcome:null,yes_votes:0,no_votes:0,my_pick:null,age_band:null,gender:null,seeking:null,is_example:false};
const sb=async r=>{const u=r.request().url(),b=JSON.parse(r.request().postData()||'{}'),fn=u.split('/rpc/')[1];const J=x=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(x)});
 if(fn=='list_community'){const L=[...EX,real];return J(NEW?L:[{...real}].map(({age_band,gender,seeking,is_example,...x})=>x))}
 if(fn=='post_community'){P.push(b);return J({id:'n'+P.length,token:'t'})}r.fulfill({status:404,body:'{}'})};
run(async({p,ok,noX})=>{
await p.goto(U+'#oracle');await p.reload();await p.waitForTimeout(600);const cards=await p.$$eval('#coFeed .co',x=>x.map(e=>e.innerText));
ok(cards.length==11&&/Poet/.test(cards[0])&&!/Example/i.test(cards[0]),'real post first, untagged');ok(cards.slice(1).every(c=>/EXAMPLE/i.test(c)),'all 10 examples tagged Example');
ok(/30–34 · Woman seeking Man/.test(cards[1])&&/25–29 · Woman seeking Woman/.test(cards.join())&&/40–49 · Man seeking Man/.test(cards.join()),'demographics line');ok(/not real users/.test(await p.innerText('#coFeed')),'explainer note');
await noX(p,'crowd');await (await p.$('#coFeed .co[data-id=e0]')).evaluate(e=>{e.scrollIntoView();scrollBy(0,-260)});await p.screenshot({path:S+'crowd-examples.png'});
await p.goto(U+'#home');await p.waitForTimeout(400);ok(/Poet/.test(await p.innerText('#homeLive'))&&!/Example/i.test(await p.innerText('#homeLive')),'home prefers real post');
await p.evaluate(()=>{CO.posts=CO.posts.filter(x=>x.is_example);homeRender(true)});const hl=await p.innerText('#homeLive');ok(/EXAMPLE/i.test(hl)&&/From The Crowd/i.test(hl)&&!/Live from/i.test(hl),'example on home tagged, not "live"');
// post with optional demographics, prefilled from Compare age
await p.evaluate(()=>{D.age='30–34';D.gen='Woman';save()});await p.goto(U+'#log');await p.waitForTimeout(400);await p.click('#modeSeg [data-m=pre]');await p.check('#coPost');
ok(await p.isVisible('#coAge')&&await p.inputValue('#coAge')=='30–34'&&await p.inputValue('#coGen')=='Woman','demographic fields prefilled');await p.selectOption('#coSeek','Man');
await p.fill('[name=nick]','Chef');await p.click('#f .seg[data-n=type] button:text-is("dinner")');await p.fill('[name=date]',await p.evaluate(()=>{const t=new Date(Date.now()+864e5);return new Date(t-t.getTimezoneOffset()*6e4).toISOString().slice(0,10)}));
ok(/30–34 · Woman seeking Man/.test(await p.innerText('#coPrev')),'preview shows demographics');await p.click('#saveBtn');await p.waitForTimeout(500);ok(P[0]&&P[0].p_age=='30–34'&&P[0].p_gender=='Woman'&&P[0].p_seeking=='Man','sent optional demographics');
// old schema: no demographic fields/args
NEW=false;await p.goto(U+'#oracle');await p.reload();await p.waitForTimeout(600);ok(/Poet/.test(await p.innerText('#coFeed'))&&!/EXAMPLE/i.test(await p.innerText('#coFeed')),'old schema renders');
await p.goto(U+'#log');await p.click('#modeSeg [data-m=pre]');await p.check('#coPost');ok(await p.isHidden('#coAge'),'demographics hidden on old schema');
await p.fill('[name=nick]','Baker');await p.click('#f .seg[data-n=type] button:text-is("coffee")');await p.fill('[name=date]',await p.evaluate(()=>{const t=new Date(Date.now()+864e5);return new Date(t-t.getTimezoneOffset()*6e4).toISOString().slice(0,10)}));await p.click('#saveBtn');await p.waitForTimeout(500);
ok(P[1]&&!('p_age' in P[1])&&!('p_gender' in P[1]),'old schema: 8-arg post');
},{sb});

// Community Oracle (mocked RPCs) + 404 graceful path + demo toggle + story images
const {run,U,S}=require('./lib');let MODE='404';const P=[],V=[],CALLS=[];
const tally=id=>({yes:V.filter(v=>v.post==id&&v.pick=='yes').length,no:V.filter(v=>v.post==id&&v.pick=='no').length});
const sb=async r=>{const u=r.request().url(),b=JSON.parse(r.request().postData()||'{}'),fn=u.split('/rpc/')[1];if(fn)CALLS.push([fn,b]);
 const J=x=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(x)});
 if(fn&&/community/.test(fn)&&MODE=='404')return r.fulfill({status:404,contentType:'application/json',body:'{"code":"PGRST202"}'});
 if(fn=='list_community')return J(P.filter(p=>!p.gone).map(p=>({id:p.id,nick:p.nick,date_type:p.date_type,area:p.area,day_label:p.day_label,met:p.met,excite:p.excite,outcome:p.outcome||null,yes_votes:tally(p.id).yes,no_votes:tally(p.id).no,my_pick:(V.find(v=>v.post==p.id&&v.voter==b.p_voter)||{}).pick||null})));
 if(fn=='post_community'){const id='p'+(P.length+1),token='tok'+id;P.push({id,token,nick:b.p_nick,date_type:b.p_type,area:b.p_area,day_label:b.p_day,met:b.p_met,excite:b.p_excite,args:b});return J({id,token})}
 if(fn=='vote_community'){if(!V.some(v=>v.post==b.p_post&&v.voter==b.p_voter))V.push({post:b.p_post,voter:b.p_voter,pick:b.p_pick});return J(tally(b.p_post))}
 if(fn=='resolve_community'){const p=P.find(x=>x.id==b.p_post&&x.token==b.p_token);if(p)p.outcome=b.p_outcome;return J(!!p)}
 if(fn=='delete_community'){const p=P.find(x=>x.id==b.p_post&&x.token==b.p_token);if(p)p.gone=1;return J(!!p)}
 if(fn=='get_guesses')return J([]);r.fulfill({status:404,body:'{}'})};
run(async({p,ok,noX})=>{
// ---- 404: feature degrades
await p.goto(U+'#oracle');await p.waitForTimeout(500);ok(/coming soon/.test(await p.innerText('#coFeed')),'404 -> coming soon');
await p.goto(U+'#log');await p.click('#modeSeg [data-m=pre]');await p.waitForTimeout(300);ok(await p.isHidden('#coFld'),'404 -> post checkbox hidden');
// ---- live
MODE='live';P.push({id:'s1',token:'x',nick:'The Architect',date_type:'coffee',area:'West LA',day_label:'Friday',met:'Hinge',excite:4});V.push({post:'s1',voter:'a'.repeat(32),pick:'no'});
await p.goto(U+'#oracle');await p.reload();await p.waitForTimeout(500);let fd=await p.innerText('#coFeed');
ok(fd.includes('Coffee in West LA with “The Architect”')&&/Will there be a 2nd date\?/.test(fd),'feed entry for zero-history visitor');ok(/Got a date\? Let the crowd call it/.test(fd),'CTA');
ok(await p.$$eval('#coFeed input,#coFeed textarea',x=>x.length)==0,'no free-text in feed');await noX(p,'oracle');await p.screenshot({path:S+'oracle-feed.png'});
await p.click('#coFeed .co[data-id=s1] .cov[data-v=yes]');await p.waitForTimeout(300);fd=await p.innerText('#coFeed .co[data-id=s1]');ok(/😍 1 love story · 💀 1/.test(fd)&&/You said 😍 love story/.test(fd),'vote + tallies');
await p.click('#coFeed .co[data-id=s1] .cov',{timeout:500}).then(()=>ok(false,'can re-vote'),()=>ok(true,'one vote per post'));
// post a date
await p.click('#coCta');await p.waitForTimeout(400);ok(await p.evaluate(()=>mode=='pre'&&$('#coPost').checked),'CTA -> upcoming with post ticked');
await p.fill('[name=nick]','Musician');await p.click('#f .seg[data-n=type] button:text-is("drinks")');await p.click('#f .seg[data-n=excite] button:text-is("4")');await p.fill('[name=where]','Secret Bar');
const dd=await p.evaluate(()=>{const t=new Date(Date.now()+2*864e5);return new Date(t-t.getTimezoneOffset()*6e4).toISOString().slice(0,10)});await p.fill('[name=date]',dd);await p.selectOption('#coArea','Silver Lake/Echo Park');
const pv=await p.innerText('#coPrev');ok(pv.includes('Drinks in Silver Lake/Echo Park with “Musician”')&&/Exactly what will be public/.test(pv)&&/Never public/.test(pv)&&!pv.includes('Secret Bar'),'exact public preview');
await (await p.$('#coFld')).evaluate(e=>{e.scrollIntoView();scrollBy(0,-80)});await p.screenshot({path:S+'oracle-post.png'});
await p.fill('#coNick','John Smith');await p.click('#saveBtn');await p.waitForTimeout(200);ok(await p.evaluate(()=>D.dates.length)==0,'real-name nickname blocked');
await p.fill('#coNick','call 555-123-4567');await p.click('#saveBtn');await p.waitForTimeout(200);ok(await p.evaluate(()=>D.dates.length)==0,'contact info blocked');
await p.fill('#coNick','');await p.click('#saveBtn');await p.waitForTimeout(600);const post=P.find(x=>x.nick=='Musician');
ok(post&&post.args.p_days_until==2&&!JSON.stringify(post.args).match(/Secret|20\d\d-|where|note/i)&&post.area=='Silver Lake/Echo Park','posted only allowed fields '+JSON.stringify(post&&post.args));
const did=await p.evaluate(()=>D.dates.find(d=>d.nick=='Musician').id);ok(await p.evaluate(()=>!!D.dates[0].co.token),'token kept locally');
for(let i=0;i<3;i++)V.push({post:post.id,voter:String(i).repeat(32),pick:'yes'});V.push({post:post.id,voter:'f'.repeat(32),pick:'no'});
await p.goto(U+'#oracle');await p.waitForTimeout(400);await p.goto(U+'#log');await p.waitForTimeout(500);ok(/The Crowd: 😍 3 · 💀 1/.test(await p.innerText('#upcoming')),'stranger tallies on date card');
// stranger post resolves -> credit
P[0].outcome='yes';await p.goto(U+'#oracle');await p.waitForTimeout(500);fd=await p.innerText('#coFeed');ok(/There was a 2nd date/.test(fd)&&/You called it ✅/.test(fd)&&/Your calls: 1\/1 right/.test(fd),'result + voter credit + accuracy');
// own outcome -> reveal friends vs strangers + resolve
await p.goto(U+'#log');await p.evaluate(i=>openForm(i,'review'),did);await p.click('#f .seg[data-n=went] button:has-text("4")');for(const [n,v] of [['mine','yes'],['theirs','yes'],['second','yes']])await p.click(`#f .seg[data-n=${n}] button:text-is("${v}")`);
await p.click('#saveBtn');await p.waitForTimeout(1000);ok(await p.evaluate(i=>location.hash=='#verdict='+i,did),'reveal opens for community-only date');
const v=await p.innerText('#verdictCard');ok(/Friends vs The Crowd/i.test(v)&&/3\/4/.test(v)&&/crowd called it/.test(v),'friends vs strangers in reveal '+v.replace(/\n/g,' | '));ok(post.outcome=='yes','resolve_community sent');
await p.waitForSelector('#vImg:not(.hide)');await p.screenshot({path:S+'oracle-reveal.png',fullPage:true});
await p.click('#vFmt [data-f=st]');await p.waitForTimeout(600);ok(await p.$eval('#vImg',i=>[i.naturalWidth,i.naturalHeight].join('x'))=='1080x1920','story 9:16 verdict');await p.click('#vShare');
await p.evaluate(()=>scrollTo(0,0));await (await p.$('#vImg')).evaluate(e=>e.scrollIntoView({block:'center'}));await p.screenshot({path:S+'story-card.png'});
// unpost
await p.goto(U+'#log');await p.click('#modeSeg [data-m=pre]');await p.fill('[name=nick]','Poet');await p.click('#f .seg[data-n=type] button:text-is("coffee")');await p.fill('[name=date]',dd);await p.check('#coPost');await p.click('#saveBtn');await p.waitForTimeout(600);
const pp=P.find(x=>x.nick=='Poet');ok(pp,'second post');await p.click('#recapX');await p.click('.coDel');await p.waitForTimeout(400);ok(pp.gone&&await p.evaluate(()=>!D.dates.find(d=>d.nick=='Poet').co),'unpost deletes');
// demo toggle + story share card
await p.goto(U+'#dash');ok(await p.isVisible('#demoT')&&/Off/.test(await p.innerText('#demoT')),'demo toggle visible');await p.click('#demoT');await p.waitForTimeout(300);ok(/On/.test(await p.innerText('#demoT'))&&await p.evaluate(()=>D.dates.some(d=>d.demo)),'demo on from any tab');
await p.screenshot({path:S+'demo-toggle.png'});await p.goto(U+'#compare');await p.click('#demoT');ok(await p.evaluate(()=>!D.dates.some(d=>d.demo))&&/Off/.test(await p.innerText('#demoT')),'demo off');
await p.goto(U+'#card');await p.click('#stMake');await p.waitForSelector('#stImg:not(.hide)');ok(await p.$eval('#stImg',i=>i.naturalHeight)==1920,'stats story image');
},{sb,share:true});

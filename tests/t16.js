// Supabase (mocked): friend guesses round-trip, quick 2nd-date-only call, offline fallback, pooled rows
const {run,U,S}=require('./lib');const G=[],POOL=[];let down=false;
run(async({ctx,p,pg,ok})=>{
await p.goto(U+'#log');await p.click('#modeSeg [data-m=pre]');await p.fill('[name=nick]','Thomas');await p.click('#f .seg[data-n=type] button:text-is("dinner")');await p.fill('[name=date]',new Date(Date.now()+2*864e5).toISOString().slice(0,10));await p.click('#saveAsk');await p.waitForTimeout(400);
const url=await p.inputValue('#askUrl');const d0=await p.evaluate(()=>D.dates[0]);ok(/^[0-9a-f]{32}$/.test(d0.ck),'128-bit call id');const pay=await p.evaluate(u=>dec(u.split('#callit=')[1]),url);ok(pay.k==d0.ck&&!JSON.stringify(pay).includes(d0.date),'link carries k, no date');
const go=async()=>{const f=await pg();await f.goto(url.replace(/^.*#/,U+'#'));await f.reload();return f};
let fp=await go();for(const s of ['p2"] [data-v="yes"]','pw"] [data-v="4"]','pm"] [data-v="both"]'])await fp.click('.fseg[data-q="'+s);await fp.fill('#fName','Sam');await fp.click('#fSend');await fp.waitForTimeout(500);
ok(G.length==1&&G[0].call_id==d0.ck&&G[0].guess.pw==4&&G[0].friend_name=='Sam','full guess POSTed');ok(/Locked in/.test(await fp.innerText('#askBox')),'friend sees locked in');await fp.close();
// quick path: same device remembers name; only 2nd-date pick
fp=await go();ok(await fp.inputValue('#fName')=='Sam','name remembered + prefilled');await fp.click('.fseg[data-q=p2] [data-v="no"]');await fp.screenshot({path:S+'friend-fast.png'});const t0=Date.now();await fp.click('#fSend');await fp.waitForTimeout(400);
ok(G.length==2&&JSON.stringify(G[1].guess)=='{"p2":"no"}','2-tap quick call POSTs only p2 '+JSON.stringify(G[1].guess));ok(await fp.isVisible('#fOwn'),'start-your-own link after submit');await fp.close();
fp=await go();await fp.fill('#fName','');await fp.click('.fseg[data-q=p2] [data-v="yes"]');await fp.click('#fSend');await fp.waitForTimeout(200);ok(G.length==2,'name still required');await fp.close();
down=true;const fp2=await go();await fp2.fill('#fName','Kai');await fp2.click('.fseg[data-q=p2] [data-v="no"]');await fp2.click('#fSend');await fp2.waitForTimeout(500);ok(/Send this back/.test(await fp2.innerText('#askBox'))&&/#reply=/.test(await fp2.inputValue('#askUrl')),'offline -> reply link');down=false;
await p.goto(U+'#card');await p.goto(U+'#log');await p.waitForTimeout(700);const pr=await p.evaluate(()=>D.dates[0].preds);ok(pr.some(x=>x.f=='Sam'&&x.p2=='no'&&x.pw==null),'owner imported quick call (latest Sam), pw stays empty '+JSON.stringify(pr));
const n1=await p.evaluate(async()=>{syncT={};return (await syncGuesses(true)).length});ok(n1==0,'no duplicate import');
await p.evaluate(()=>{const d=D.dates[0];d.status='done';d.went=4;d.mine='yes';d.theirs='yes';d.second='yes';d.cats={chemistry:5};d.spend=88;d.paid='Split';d.note='secret note';d.where='Bar X';save()});
await p.goto(U+'#verdict='+d0.id);await p.waitForTimeout(300);ok(/Sam/.test(await p.innerText('#verdictCard')),'verdict with quick call renders');
await p.evaluate(()=>$('#demo').click());ok(POOL.length==0,'nothing sent with pool off');
await p.goto(U+'#compare');ok(/Never leaves your device:[\s\S]*nicknames[\s\S]*notes[\s\S]*places[\s\S]*screenshots/.test(await p.innerText('#lockCard')),'compare: exact never-list');ok(/age band/.test(await p.innerText('#lockCard'))&&/spend bucket/.test(await p.innerText('#lockCard')),'compare: exact field list');
await p.screenshot({path:S+'compare-privacy.png'});
await p.click('#pool');await p.waitForTimeout(800);ok(POOL.length==1,'one real row sent (demo excluded) '+POOL.length);
const row=POOL[0];ok(!/Thomas|secret|Bar X/.test(JSON.stringify(row))&&!("spend" in row)&&/^\d{4}-\d\d$/.test(row.month)&&row.spend_bucket=='$51-100'&&row.cat_chemistry==5,'row anonymous');
await p.evaluate(()=>poolSync());await p.waitForTimeout(300);ok(POOL.length==1,'dedupe');
},{sb:async r=>{const u=r.request().url(),h=r.request().headers(),body=JSON.parse(r.request().postData()||'{}');if(down)return r.abort();
 if(!h.apikey||!h.apikey.startsWith('sb_publishable_'))return r.fulfill({status:401});
 if(u.endsWith('/rest/v1/call_guesses')){G.push(body);return r.fulfill({status:201,body:''})}
 if(u.endsWith('/rpc/get_guesses'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(G.filter(g=>g.call_id==body.p_call_id).map(g=>({friend_name:g.friend_name,guess:g.guess})))});
 if(u.endsWith('/rest/v1/pooled_dates')){if(POOL.some(x=>x.row_id==body.row_id))return r.fulfill({status:409,body:'{}'});POOL.push(body);return r.fulfill({status:201,body:''})}
 if(u.endsWith('/rpc/pooled_summary'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({n:42,by_type:{dinner:{n:9,rate:55}},by_channel:{},cats:{},spend:{}})});
 r.fulfill({status:404,body:'{}'})}});

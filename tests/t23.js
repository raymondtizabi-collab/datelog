// Anonymous usage counting: fire-and-forget track_event, only {p_anon_id,p_event}, visit throttled, silent when RPC missing
const {run,U}=require('./lib');let HAVE=true;const E=[];let miss=0;
const sb=async r=>{const u=r.request().url(),b=JSON.parse(r.request().postData()||'{}'),fn=u.split('/rpc/')[1];
 if(fn=='track_event'){if(!HAVE){miss++;return r.fulfill({status:404,body:'{"code":"PGRST202"}'})}E.push(b);return r.fulfill({status:200,contentType:'application/json',body:'true'})}
 r.fulfill({status:404,body:'{}'})};
const tmr=`(()=>{const t=new Date(Date.now()+864e5);return new Date(t-t.getTimezoneOffset()*6e4).toISOString().slice(0,10)})()`;
run(async({p,ok})=>{
await p.goto(U+'#home');await p.evaluate(()=>localStorage.removeItem('datelog.trk.v'));E.length=0;await p.reload();await p.waitForTimeout(500);ok(E.filter(e=>e.p_event=='visit').length==1,'visit tracked on load');
await p.reload();await p.waitForTimeout(500);ok(E.filter(e=>e.p_event=='visit').length==1,'no second visit within 30 min');
ok(E.every(e=>Object.keys(e).sort().join()=='p_anon_id,p_event'&&/^[0-9a-f]{32}$/.test(e.p_anon_id)),'payload is only random id + event');
await p.goto(U+'#log');await p.click('#modeSeg [data-m=pre]');await p.fill('[name=nick]','Secretname');await p.click('#f .seg[data-n=type] button:text-is("dinner")');await p.fill('[name=date]',await p.evaluate(tmr));await p.click('#saveBtn');await p.waitForTimeout(400);
ok(E.some(e=>e.p_event=='log_upcoming'),'log_upcoming tracked');ok(!JSON.stringify(E).includes('Secretname'),'no date contents sent');
ok(/We count anonymous usage/.test(await p.textContent('body')),'privacy line present');
HAVE=false;await p.evaluate(()=>{localStorage.removeItem('datelog.trk.v')});await p.reload();await p.waitForTimeout(500);
await p.evaluate(()=>{trk('share');trk('share')});await p.waitForTimeout(400);ok(miss==1,'RPC missing: one silent 404, then off');
},{sb});

// profile screenshot intake + share (screenshot opt-in) + verdict share + clipboard fallback
const {run,U,S,IMG}=require('./lib');run(async({ctx,p,ok})=>{
await p.goto(U+'#log');await p.click('#modeSeg [data-m=pre]');await p.fill('#f [name=nick]','JR');await p.click('#f .seg[data-n=type] button:has-text("drinks")');await p.click('#f .seg[data-n=excite] button:has-text("4")');
await p.setInputFiles('#shotIn',IMG);await p.waitForSelector('#shotPrev:not(.hide)');
await (await p.$('#shotFld')).evaluate(e=>e.scrollIntoView({block:'center'}));await p.screenshot({path:S+'share-intake.png'});
const dims=await p.$eval('#shotImg',i=>[i.naturalWidth,i.naturalHeight]);ok(Math.max(...dims)<=1080,'downscaled '+dims);
await p.click('#shotRm');ok(await p.$eval('#shotPrev',e=>e.classList.contains('hide')),'remove works');
await p.setInputFiles('#shotIn',IMG);await p.waitForSelector('#shotPrev:not(.hide)');await p.click('#saveBtn');await p.waitForTimeout(300);
const st=await p.evaluate(()=>{const ks=Object.keys(localStorage).filter(k=>k.startsWith('datelog.shot.'));return{ks,len:ks.map(k=>localStorage[k].length),main:localStorage['datelog.v1'].includes('data:image')}});
ok(st.ks.length==1&&st.len[0]<400000,'stored shot '+st.len);ok(!st.main,'not in main data');
await p.click('.ask');await p.waitForTimeout(400);ok(!(await p.inputValue('#askUrl')).includes('data:'),'link has no image');
await p.screenshot({path:S+'share-card.png'});
await p.click('#askShare');await p.waitForTimeout(200);const sh=await p.evaluate(()=>window.__sh);
ok(sh.length==1&&sh[0].files.length==1&&/call-it.jpg/.test(sh[0].files[0])&&sh[0].url.includes('#callit='),'default share: card only, no screenshot');
ok(/^Call it 🔮 Love story or one-date wonder\? I’ve got a date with JR/.test(sh[0].text),'first-person share text');ok(!(await p.isChecked('#incShot')),'opt-in unchecked');ok(/face/.test(await p.innerText('#askBox .warn')),'warning shown');
await p.check('#incShot');await p.click('#askShare');await p.waitForTimeout(200);ok((await p.evaluate(()=>window.__sh.at(-1))).files.length==2,'opt-in adds screenshot');
await p.click('#askClose');await p.click('.ask');await p.waitForTimeout(300);ok(!(await p.isChecked('#incShot')),'opt-in resets each time');
await p.click('#askClose');await p.click('.edt');ok(!(await p.$eval('#shotPrev',e=>e.classList.contains('hide'))),'edit shows shot');
await p.evaluate(()=>$('#demo').click());await p.goto(U+'#verdict=2');await p.waitForTimeout(500);await p.click('#vShare');await p.waitForTimeout(200);const v=await p.evaluate(()=>window.__sh.at(-1));ok(/verdict.jpg/.test(v.files.join())&&!v.files.join().includes('profile'),'verdict share '+v.files);
await p.evaluate(()=>localStorage.setItem('noshare','1'));await ctx.grantPermissions(['clipboard-read','clipboard-write']);await p.goto(U+'#log');await p.reload();
await p.click('.ask');await p.click('#askShare');const t=await p.waitForSelector('.toast');ok(/copied/i.test(await t.innerText()),'clipboard fallback toast');
},{share:true});

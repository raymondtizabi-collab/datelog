// home page, CTAs, details always open, no hero on log
const {run,U,S}=require('./lib');run(async({p,ok,noX})=>{
await p.goto(U);await p.waitForTimeout(300);ok(await p.isVisible('#hero'),'hero visible first time');ok(/stays on your device\. Only what you choose to share leaves it/.test(await p.innerText('#hero')),'privacy line');
for(const t of ['What actually makes a good date','Expectations vs. reality','Make your friends call it','Sam','Oracle','Way off','13%','Expected split','Share only if you want to','Did you know?'])ok((await p.innerText('#v-home')).includes(t),'home has '+t);
await noX(p,'home');await p.screenshot({path:S+'home-1.png'});
await p.click('#homeAsk');await p.waitForTimeout(400);ok(await p.evaluate(()=>location.hash=='#log'&&mode=='pre'),'ask CTA -> upcoming');
await p.goto(U+'#home');await p.click('#heroGo');await p.waitForTimeout(700);ok(await p.evaluate(()=>document.activeElement.name)=='nick','scrolls to quick log');
ok(!(await p.$('#v-log #hero')),'no hero on log');
ok(await p.isVisible('#catRows')&&await p.isVisible('[name=spend]')&&await p.isVisible('[name=date]')&&await p.isVisible('#shotFld'),'details always open, contains everything');
ok(await p.evaluate(()=>$('#more').tagName!='DETAILS'),'details not collapsible');
await (await p.$('#formCard')).evaluate(e=>{e.scrollIntoView();scrollBy(0,-70)});await p.screenshot({path:S+'quicklog.png'});
await p.goto(U+'#home');await p.click('#heroDemo');await p.waitForTimeout(400);ok(await p.evaluate(()=>location.hash=='#dash'&&D.dates.some(d=>d.demo)),'sample history link');
});

// spend + who paid: storage, never in share link, pool gating, stats
const {run,U,S}=require('./lib');run(async({p,ok})=>{
await p.evaluate(()=>{localStorage.setItem('datelog.v1',JSON.stringify({dates:[{id:5,status:'done',date:'2026-01-01',time:'',nick:'OLD',met:'Hinge',type:'coffee',went:3,mine:'yes',theirs:'yes',second:'yes',rating:4,excite:3,draw:[],hoping:[],concerns:[],concernsRight:{},why:[],they:[],note:''}],pool:false}))});await p.reload();
await p.goto(U+'#dash');ok(/Add “What I spent”/.test(await p.innerText('#spStat')),'old data blank');
await p.goto(U+'#log');await p.click('#modeSeg [data-m=pre]');await p.fill('#f [name=nick]','TOM');await p.click('#f .seg[data-n=type] button:has-text("dinner")');await p.click('#f .seg[data-n=expPaid] button:has-text("Split")');await p.click('#saveBtn');
let d=await p.evaluate(()=>D.dates.find(x=>x.nick=='TOM'));ok(d.expPaid=='Split','expPaid stored');ok(await p.$eval('[name=spend]',e=>e.inputMode)=='decimal','decimal keypad');
await p.evaluate(()=>openForm(D.dates.find(x=>x.nick=='TOM').id,'review'));ok(await p.$eval('#f .seg[data-n=expPaid] .on',e=>e.textContent)=='Split','expPaid reload');
await p.fill('[name=spend]','$86.40');await p.click('#f .seg[data-n=paid] button:has-text("They paid")');await p.click('#f .seg[data-n=went] button:has-text("4")');for(const [n,v] of [['mine','yes'],['theirs','yes'],['second','no']])await p.click(`#f .seg[data-n=${n}] button:text-is("${v}")`);
await (await p.$('[name=spend]')).evaluate(e=>e.scrollIntoView({block:'center'}));await p.screenshot({path:S+'spend-review.png'});
await p.click('#saveBtn');d=await p.evaluate(()=>D.dates.find(x=>x.nick=='TOM'));ok(d.spend==86.4&&d.paid=='They paid','spend stored');
const link=await p.evaluate(()=>{const x=D.dates.find(x=>x.nick=='TOM');const a=ask(x);delete a.k;delete a.t;return JSON.stringify(a)});ok(!/86|paid|Split|spend/i.test(link),'not in share link '+link);
const pr=await p.evaluate(()=>{const x=D.dates.find(x=>x.nick=='TOM');D.pool=false;const a=JSON.stringify(poolRecord(x));D.pool=true;const b=JSON.stringify(poolRecord(x));D.pool=false;return[a,b]});
ok(!/spend|paid/i.test(pr[0])&&/"spendBucket":"\$51-100"/.test(pr[1])&&/"paid":"They paid"/.test(pr[1])&&/"expPaid":"Split"/.test(pr[1])&&!/86/.test(pr[1]),'pool gating + bucket only');
ok(await p.evaluate(()=>parseSpend('abc')===null&&parseSpend('1,200')===1200),'parseSpend');
await p.evaluate(()=>$('#demo').click());await p.goto(U+'#dash');await p.waitForTimeout(300);const t=await p.innerText('#spStat');ok(/total/.test(t)&&/per 2nd date/.test(t)&&/WHO PAID|Who paid/i.test(t),'spend stats');
await (await p.$('#spStat')).evaluate(e=>{e.closest('.card').scrollIntoView();scrollBy(0,-70)});await p.screenshot({path:S+'spend-stats.png'});
});

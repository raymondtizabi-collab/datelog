// You vs Friends vs The Crowd: private own call, 3-way reveal + image, Who calls it best
const {run,U,S}=require('./lib');run(async({p,ok,noX})=>{
await p.goto(U+'#home');ok(/Make your own call, see if your friends — and the wisdom of the crowd — know better/.test(await p.innerText('#how')),'explainer copy');
await p.goto(U+'#log');await p.click('#modeSeg [data-m=pre]');ok(await p.isVisible('#f .seg[data-n=myCall]'),'your call on upcoming form');
await p.fill('[name=nick]','Musician');await p.click('#f .seg[data-n=type] button:text-is("drinks")');await p.click('#f .seg[data-n=myCall] button:has-text("One-date wonder")');
const dd=await p.evaluate(()=>{const t=new Date(Date.now()+2*864e5);return new Date(t-t.getTimezoneOffset()*6e4).toISOString().slice(0,10)});await p.fill('[name=date]',dd);await p.click('#saveBtn');await p.waitForTimeout(200);
let d=await p.evaluate(()=>D.dates[0]);ok(/One-date/.test(d.myCall),'stored locally');
ok(await p.evaluate(()=>{const a=JSON.stringify(ask(D.dates[0]));return !/One-date|myCall|wonder/.test(a)}),'never in friend link');
ok(await p.evaluate(()=>{$('#coPost').checked=true;$('#coNick').value='';const a=JSON.stringify(coArgs({...D.dates[0]}));return !/One-date|myCall/.test(a)}),'never in crowd post');
await p.evaluate(()=>{const d=D.dates[0];d.preds=[{f:'Sam',p2:'yes',pw:4,pm:'both',take:''},{f:'Ana',p2:'yes',pw:null,pm:null,take:''},{f:'Kai',p2:'no',pw:2,pm:'you',take:''}];d.co={id:'x',token:'t',yes:1,no:3};save();render()});
await p.evaluate(id=>openForm(id,'review'),d.id);ok(await p.$eval('#f .seg[data-n=myCall] .on',e=>e.textContent).then(t=>/One-date/.test(t)),'own call survives review');
await p.click('#f .seg[data-n=went] button:has-text("4")');for(const [n,v] of [['mine','yes'],['theirs','yes'],['second','yes']])await p.click(`#f .seg[data-n=${n}] button:text-is("${v}")`);await p.click('#saveBtn');await p.waitForTimeout(900);
const v=await p.innerText('#verdictCard');console.log(v.slice(0,500));
ok(/You vs Friends vs The Crowd/i.test(v)&&/Your friends knew you better than you did/.test(v),'3-way headline from real results');
ok(/You[\s\S]*one-date wonder[\s\S]*wrong/.test(v)&&/Friends[\s\S]*2 of 3 said love story[\s\S]*right/.test(v)&&/The Crowd[\s\S]*25% said love story[\s\S]*wrong/.test(v),'three rows right/wrong');
ok(await p.evaluate(()=>JSON.stringify(VS._rows.rows).includes('Your friends knew you better')&&/You ❌ · 👯 Friends ✅ · 🌍 The Crowd ❌/.test(JSON.stringify(VS._rows.rows))),'on verdict image');
await p.waitForSelector('#vImg:not(.hide)');await noX(p,'reveal');await (await p.$('.tw')).evaluate(e=>{e.scrollIntoView();scrollBy(0,-120)});await p.screenshot({path:S+'reveal-3way.png'});
await p.goto(U+'#dash');ok(await p.innerText('#whoBest')=='','who-calls-best hidden below 2 dates');
await p.evaluate(()=>{D.dates.push({id:77,status:'done',date:'2026-09-01',time:'',nick:'Chef',met:'Hinge',type:'dinner',went:2,mine:'no',theirs:'no',second:'no',myCall:'💀 One-date wonder',preds:[{f:'Sam',p2:'no'}],draw:[],hoping:[],concerns:[],concernsRight:{},why:[],they:[],note:''});save();render()});
const w=await p.innerText('#whoBest');console.log(w);ok(/Who calls it best/.test(w)&&/You[\s\S]*50%[\s\S]*1\/2/.test(w)&&/Friends[\s\S]*75%[\s\S]*3\/4/.test(w)&&/Crowd[\s\S]*0%[\s\S]*0\/1/.test(w)&&/based on 2 dates/.test(w),'who calls it best');
});

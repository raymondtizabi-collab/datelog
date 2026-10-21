// key findings + ask your data
const {run,U,S}=require('./lib');run(async({p,ok})=>{
await p.goto(U+'#dash');ok(/Log 3\+ dates to unlock findings/.test(await p.innerText('#findings')),'empty findings');
await p.fill('#askQ','am I too optimistic?');await p.click('#askF button');ok(/Not enough data/.test(await p.innerText('#askLog')),'empty answer');
await p.goto(U+'#log');await p.click('#demo');await p.goto(U+'#dash');await p.waitForTimeout(300);
const fi=await p.$$eval('#findings li',x=>x.map(e=>e.textContent));console.log('- '+fi.join('\n- '));ok(fi.length==3,'3 findings');
await p.evaluate(()=>{$('#askLog').innerHTML=''});
const Q=['What predicts a 2nd date?','am i too optimistic','best way to meet people?','best date type','how much do I spend','cost per 2nd date?','who pays usually','which friend is most accurate','why do I pass','why do they pass on me','best day for dates','who have I dated most','give me a summary','what is the meaning of life'];
const A=[];for(const q of Q){await p.fill('#askQ',q);await p.press('#askQ','Enter');await p.waitForTimeout(30);A.push(await p.$eval('#askLog',l=>l.lastElementChild.textContent))}
const chk=[/Chemistry/,/optimistic|pessimistic|calibrated/,/works best/,/dates work best/,/spent \$/,/spent \$/,/Who paid/,/most accurate/,/reasons for passing/,/they passed/,/Best day/,/DEMO-/,/2nd date with/,/can’t answer/];chk.forEach((r,i)=>ok(r.test(A[i]),'intent '+Q[i]));
await p.click('#qchips button:has-text("Am I too optimistic?")');
await (await p.$('#findings')).evaluate(e=>{e.closest('.card').scrollIntoView();scrollBy(0,-70)});await p.screenshot({path:S+'findings.png'});
});

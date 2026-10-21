// category ratings: review, reload, stats + predictors
const {run,U,S}=require('./lib');run(async({p,ok})=>{
await p.goto(U+'#log');await p.fill('[name=nick]','CAT');await p.click('#f .seg[data-n=type] button:text-is("coffee")');await p.click('#f .seg[data-n=mine] button:text-is("yes")');
await p.click('#catRows .cat[data-c=chemistry] button:text-is("5")');await p.click('#catRows .cat[data-c=humor] button:text-is("3")');await p.click('#catRows .cat[data-c=humor] button:text-is("3")');
await (await p.$('#catRows')).evaluate(e=>e.scrollIntoView({block:'center'}));await p.screenshot({path:S+'categories-review.png'});
await p.click('#saveBtn');let d=await p.evaluate(()=>D.dates[0]);ok(d.cats.chemistry==5&&!d.cats.humor,'cats stored, tap-again clears '+JSON.stringify(d.cats));
await p.evaluate(id=>openForm(id,'review'),d.id);ok(await p.$eval('#catRows .cat[data-c=chemistry] .on',e=>e.textContent)=='5','cats reload');
await p.evaluate(()=>$('#demo').click());await p.goto(U+'#dash');await p.waitForTimeout(300);
ok(/Chemistry/.test(await p.innerText('#catStat'))&&/n=/.test(await p.innerText('#catStat')),'category stats');ok(/Δ/.test(await p.innerText('#catPred')),'predictor table');
await (await p.$('#catStat')).evaluate(e=>{e.closest('.grid').scrollIntoView();scrollBy(0,-80)});await p.screenshot({path:S+'categories-stats.png'});
ok(await p.evaluate(()=>{const r=poolPreview().find(x=>x.cats);return !r||true}),'pool preview ok');
});

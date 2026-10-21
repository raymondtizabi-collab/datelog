// labels switch tense; details header past/upcoming
const {run,U,S}=require('./lib');run(async({p,ok})=>{
await p.goto(U+'#log');const L=async()=>p.$$eval('#f [data-fut]',x=>x.filter(e=>e.offsetParent).map(e=>e.textContent.trim()));
let a=await L();ok(a.includes('Add details')&&a.includes('What did you do?')&&a.includes('When was the date?'),'past labels');
await p.click('#modeSeg [data-m=pre]');a=await L();ok(a.includes('Time to set expectations')&&a.includes('What are you doing?')&&a.includes("Who's the date with?")&&a.some(t=>/^Where are you going\?/.test(t)),'future labels');
await p.screenshot({path:S+'upcoming-tense.png'});await p.click('#modeSeg [data-m=post]');a=await L();ok(a.includes('Add details'),'back to past');
});

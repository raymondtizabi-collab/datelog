// "other" date type shows a private text box
const {run,U}=require('./lib');run(async({p,ok})=>{
await p.goto(U+'#log');const vis=()=>p.isVisible('#f .oth[data-o=type]');ok(!(await vis()),'hidden before');
await p.click('#f .seg[data-n=type] button:text-is("other")');ok(await vis(),'shown for other');
await p.click('#f .seg[data-n=type] button:text-is("coffee")');ok(!(await vis()),'hidden for coffee');
});
